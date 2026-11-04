#!/usr/bin/env node
// Importa o acervo da biblioteca que vivia no Notion (issue #297).
//
//   node scripts/importar-acervo-notion.mjs preparar
//     Le a base publica do Notion (+ Google Books se GOOGLE_BOOKS_API_KEY) e
//     grava em .local-data/biblioteca/ (gitignored — tem nomes de pessoas):
//       acervo.json          payload da importacao
//       acervo-revisao.csv   planilha para revisar (coluna "usar_google" S/N)
//
//   node scripts/importar-acervo-notion.mjs importar [--dry-run] [--prod]
//     Envia em lotes para biblioteca/importacao:importarAcervo. Idempotente.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const NOTION_SITE = "https://ipdocaminho.notion.site";
const PAGE_ID = "2211ce81-95f3-800b-ae24-d51283819f11";
const VIEW_ID = "2211ce81-95f3-80e7-b40e-000c510c422a";
const DIR = join(process.cwd(), ".local-data", "biblioteca");
const JSON_PATH = join(DIR, "acervo.json");
const CSV_PATH = join(DIR, "acervo-revisao.csv");
const DONO_IGREJA = "IPC";

// ---------- Notion ----------

async function notion(endpoint, body) {
  const res = await fetch(`${NOTION_SITE}/api/v3/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion ${endpoint}: ${res.status}`);
  return res.json();
}

const valor = (rec) => rec?.value?.value ?? rec?.value;

function texto(prop) {
  return (prop ?? []).map((seg) => (seg[0] === "‣" ? "" : seg[0])).join("").trim() || undefined;
}

function dataDe(prop) {
  for (const seg of prop ?? []) for (const a of seg[1] ?? []) if (a[0] === "d") return a[1].start_date;
  return undefined;
}

function arquivos(prop) {
  const urls = [];
  for (const seg of prop ?? []) for (const a of seg[1] ?? []) if (a[0] === "a") urls.push(a[1]);
  return urls;
}

async function lerNotion() {
  const pagina = await notion("loadPageChunk", {
    pageId: PAGE_ID, limit: 100, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false,
  });
  const colecao = valor(Object.values(pagina.recordMap.collection)[0]);
  const view = valor(pagina.recordMap.collection_view[VIEW_ID]);
  const campo = Object.fromEntries(Object.entries(colecao.schema).map(([k, s]) => [s.name, k]));

  const q = await notion("queryCollection", {
    source: { type: "collection", id: colecao.id, spaceId: view.space_id },
    collectionView: { id: VIEW_ID, spaceId: view.space_id },
    loader: {
      type: "reducer",
      reducers: { collection_group_results: { type: "results", limit: 2000 } },
      sort: [], searchQuery: "", userTimeZone: "America/Sao_Paulo",
    },
  });
  const ids = q.result.reducerResults.collection_group_results.blockIds;
  return ids.map((id) => {
    const b = valor(q.recordMap.block[id]);
    const p = b.properties ?? {};
    const capa = arquivos(p[campo["Capa"]])[0];
    return {
      id,
      criadoEm: b.created_time,
      titulo: texto(p[campo["Nome do Livro"]]),
      autores: (texto(p[campo["Autor"]]) ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      numero: texto(p[campo["Número"]]) ? Number(texto(p[campo["Número"]])) : undefined,
      proprietario: texto(p[campo["Proprietário"]]),
      emPosseDe: texto(p[campo["Em posse de"]]),
      dataEmprestimo: dataDe(p[campo["Data de Empréstimo"]]),
      // Anexo do Notion so abre pelo proxy publico do site, nao pelo id cru.
      capa: capa?.startsWith("attachment:")
        ? `${NOTION_SITE}/image/${encodeURIComponent(capa)}?table=block&id=${id}&cache=v2`
        : capa,
    };
  });
}

// ---------- Google Books (opcional) ----------

const norm = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function similaridade(a, b) {
  const ta = new Set(norm(a).split(" ").filter(Boolean));
  const tb = new Set(norm(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  const comum = [...ta].filter((t) => tb.has(t)).length;
  return comum / Math.max(ta.size, tb.size);
}

async function buscarGoogle(titulo, autor, key) {
  const q = `intitle:${titulo}${autor ? `+inauthor:${autor}` : ""}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&key=${key}`;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const res = await fetch(url);
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 3000)); continue; }
    if (!res.ok) throw new Error(`Google Books ${res.status}`);
    const itens = (await res.json()).items ?? [];
    let melhor;
    for (const it of itens) {
      const v = it.volumeInfo;
      const score =
        similaridade(titulo, v.title) * 0.7 +
        (autor ? similaridade(autor, (v.authors ?? []).join(" ")) * 0.3 : 0.3);
      if (!melhor || score > melhor.score) melhor = { score, v };
    }
    if (!melhor) return undefined;
    const v = melhor.v;
    return {
      score: Math.round(melhor.score * 100),
      titulo: v.title,
      autores: v.authors ?? [],
      editora: v.publisher,
      ano: v.publishedDate ? parseInt(v.publishedDate.slice(0, 4), 10) || undefined : undefined,
      isbn: v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier
        ?? v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier,
      paginas: v.pageCount,
      descricao: v.description?.slice(0, 2000),
      capa: v.imageLinks?.thumbnail?.replace("http://", "https://").replace("&edge=curl", ""),
    };
  }
  return undefined;
}

// ---------- preparar ----------

const codigo = (n) => `BIB-${String(n).padStart(4, "0")}`;
const dataSP = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

async function preparar() {
  const linhas = await lerNotion();
  const ignoradas = linhas.filter((l) => !l.titulo);
  const validas = linhas.filter((l) => l.titulo).sort((a, b) => a.criadoEm - b.criadoEm);

  // Numero repetido ou ausente: nao da para saber qual livro fisico tem a
  // etiqueta, entao todos ganham codigo novo (lista sai no relatorio).
  const contagem = new Map();
  for (const l of validas) if (l.numero !== undefined) contagem.set(l.numero, (contagem.get(l.numero) ?? 0) + 1);
  let proximo = Math.max(...validas.map((l) => l.numero ?? 0)) + 1;
  const reetiquetar = [];
  for (const l of validas) {
    if (l.numero !== undefined && contagem.get(l.numero) === 1) {
      l.codigo = codigo(l.numero);
    } else {
      l.codigo = codigo(proximo++);
      reetiquetar.push(l);
    }
  }

  // Mesmo titulo + mesmo primeiro autor = mesma obra, varios exemplares.
  const obras = new Map();
  for (const l of validas) {
    const chave = `${norm(l.titulo)}|${norm(l.autores[0])}`;
    if (!obras.has(chave)) obras.set(chave, []);
    obras.get(chave).push(l);
  }

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) console.warn("GOOGLE_BOOKS_API_KEY ausente: pulando enriquecimento pelo Google Books.");

  const livros = [];
  let i = 0;
  for (const exemplares of obras.values()) {
    const base = exemplares[0];
    const google = key ? await buscarGoogle(base.titulo, base.autores[0], key).catch((e) => ({ erro: e.message })) : undefined;
    if (key && ++i % 25 === 0) console.log(`  google: ${i}/${obras.size}`);
    livros.push({
      titulo: base.titulo,
      autores: base.autores,
      capaNotion: exemplares.find((e) => e.capa)?.capa,
      google,
      exemplares: exemplares.map((e) => ({
        codigo: e.codigo,
        numeroNotion: e.numero,
        dataAquisicao: dataSP(e.criadoEm),
        proprietarioNome: e.proprietario && e.proprietario !== DONO_IGREJA ? e.proprietario : undefined,
        emPosse: e.emPosseDe && e.dataEmprestimo ? { nome: e.emPosseDe, dataEmprestimo: e.dataEmprestimo } : undefined,
      })),
    });
  }

  mkdirSync(DIR, { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify({ geradoEm: new Date().toISOString(), livros }, null, 1));

  const cab = [
    "codigos", "numero_notion", "titulo", "autores", "proprietarios", "em_posse_de", "capa_notion",
    "google_score", "google_titulo", "google_autores", "editora", "ano", "isbn", "paginas", "capa_google", "usar_google",
  ];
  const esc = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhasCsv = livros.map((l) => {
    const g = l.google && !l.google.erro ? l.google : undefined;
    return [
      l.exemplares.map((e) => e.codigo).join(" "),
      l.exemplares.map((e) => e.numeroNotion ?? "-").join(" "),
      l.titulo, l.autores.join(", "),
      l.exemplares.map((e) => e.proprietarioNome ?? DONO_IGREJA).join(", "),
      l.exemplares.filter((e) => e.emPosse).map((e) => `${e.emPosse.nome} (${e.emPosse.dataEmprestimo})`).join(", "),
      l.capaNotion ? "sim" : "",
      g?.score, g?.titulo, g?.autores.join(", "), g?.editora, g?.ano, g?.isbn, g?.paginas, g?.capa,
      g ? (g.score >= 80 ? "S" : "N") : "",
    ].map(esc).join(";");
  });
  // BOM + ";" para o Excel pt-BR abrir com acento e colunas certas.
  writeFileSync(CSV_PATH, "﻿" + [cab.join(";"), ...linhasCsv].join("\n"));

  console.log(`Linhas no Notion: ${linhas.length} (ignoradas sem titulo: ${ignoradas.length})`);
  console.log(`Obras: ${livros.length} | exemplares: ${validas.length}`);
  console.log(`Emprestimos em aberto: ${validas.filter((l) => l.emPosseDe && l.dataEmprestimo).length}`);
  console.log(`Reetiquetar (${reetiquetar.length}):`);
  for (const l of reetiquetar) console.log(`  ${l.codigo}  (Notion nº ${l.numero ?? "-"})  ${l.titulo}`);
  console.log(`\nGravado: ${JSON_PATH}\n         ${CSV_PATH}`);
}

// ---------- importar ----------

function lerCsvUsarGoogle() {
  // Devolve codigos -> usar_google ("S"/"N") a partir da planilha revisada.
  if (!existsSync(CSV_PATH)) return new Map();
  const [cab, ...linhas] = readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "").split("\n");
  const sep = cab.includes(";") ? ";" : ",";
  const cols = cab.split(sep);
  const iCod = cols.indexOf("codigos");
  const iUsar = cols.indexOf("usar_google");
  const mapa = new Map();
  for (const linha of linhas) {
    // Parser minimo: a planilha so tem aspas em campos de texto, e as duas
    // colunas que importam (primeira e ultima) nunca tem separador dentro.
    const campos = linha.split(sep);
    const usar = (campos[campos.length - 1] ?? "").trim().toUpperCase();
    if (iCod >= 0 && iUsar >= 0 && campos[iCod]) mapa.set(campos[iCod].replace(/"/g, "").trim(), usar);
  }
  return mapa;
}

function montarPayload(l, usarGoogle) {
  const g = usarGoogle && l.google && !l.google.erro ? l.google : undefined;
  const limpo = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  return limpo({
    titulo: l.titulo,
    autores: l.autores.length ? l.autores : g?.autores ?? [],
    editora: g?.editora,
    isbn: g?.isbn,
    ano: g?.ano,
    paginas: g?.paginas,
    descricao: g?.descricao,
    categorias: [],
    capaUrlOrigem: l.capaNotion ?? g?.capa,
    exemplares: l.exemplares.map((e) => limpo({ ...e, emPosse: e.emPosse })),
  });
}

function importar({ dryRun, prod }) {
  if (!existsSync(JSON_PATH)) throw new Error(`Rode "preparar" antes (${JSON_PATH} nao existe)`);
  const { livros } = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const usar = lerCsvUsarGoogle();
  const payloads = livros.map((l) => montarPayload(l, usar.get(l.exemplares.map((e) => e.codigo).join(" ")) === "S"));

  // Lotes pequenos: o JSON vai como argumento de linha de comando.
  const lotes = [];
  let atual = [];
  for (const p of payloads) {
    if (atual.length && (atual.length >= 25 || JSON.stringify([...atual, p]).length > 60_000)) {
      lotes.push(atual);
      atual = [];
    }
    atual.push(p);
  }
  if (atual.length) lotes.push(atual);

  const total = { livrosCriados: 0, exemplaresCriados: 0, emprestimosCriados: 0, pulados: 0, errosCapa: [], membros: {} };
  lotes.forEach((lote, i) => {
    const args = ["convex", "run", "biblioteca/importacao:importarAcervo", JSON.stringify({ livros: lote, dryRun })];
    if (prod) args.push("--prod");
    const out = execFileSync("npx", args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    const r = JSON.parse(out.slice(out.indexOf("{")));
    Object.assign(total.membros, r.membros);
    total.pulados += r.codigosJaExistentes.length;
    if (!dryRun) {
      total.livrosCriados += r.livrosCriados;
      total.exemplaresCriados += r.exemplaresCriados;
      total.emprestimosCriados += r.emprestimosCriados;
      total.errosCapa.push(...r.errosCapa);
    }
    console.log(`lote ${i + 1}/${lotes.length}: ${r.livrosAImportar}/${r.livrosNoLote} livros a importar`);
  });

  console.log(JSON.stringify(total, null, 2));
}

const [cmd, ...flags] = process.argv.slice(2);
if (cmd === "preparar") await preparar();
else if (cmd === "importar") importar({ dryRun: flags.includes("--dry-run"), prod: flags.includes("--prod") });
else {
  console.error("uso: node scripts/importar-acervo-notion.mjs preparar | importar [--dry-run] [--prod]");
  process.exit(1);
}
