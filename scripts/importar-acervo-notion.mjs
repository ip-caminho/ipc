#!/usr/bin/env node
// Importa o acervo da biblioteca que vivia no Notion (issue #297).
//
//   node --env-file=.env.local scripts/importar-acervo-notion.mjs preparar
//     Le a base publica do Notion e busca editora/ISBN/capa: Google Books se
//     houver GOOGLE_BOOKS_API_KEY (a cota anonima e zero), senao Open Library. Grava
//     grava em .local-data/biblioteca/ (gitignored — tem nomes de pessoas):
//       acervo.json          payload da importacao
//       acervo-revisao.csv   planilha para revisar (coluna "usar_sugestao" S/N)
//
//   node scripts/importar-acervo-notion.mjs conferir
//     Aplica a planilha e ajustes.json e grava payload.json, sem tocar no Convex.
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
const AJUSTES_PATH = join(DIR, "ajustes.json");
const PAYLOAD_PATH = join(DIR, "payload.json");
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

// ---------- Enriquecimento (Google Books ou Open Library) ----------

const norm = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const STOP = new Set("a o as os e de da do das dos em no na um uma para por com the of and".split(" "));
const palavras = (s) => new Set(norm(s).split(" ").filter((t) => t && !STOP.has(t)));

/** Dice entre as palavras significativas (ignora artigos/preposicoes). */
function similaridade(a, b) {
  const ta = palavras(a);
  const tb = palavras(b);
  if (!ta.size || !tb.size) return 0;
  const comum = [...ta].filter((t) => tb.has(t)).length;
  return (2 * comum) / (ta.size + tb.size);
}

/**
 * Titulo do Notion vs titulo sugerido, considerando o subtitulo: no Notion o
 * titulo costuma vir resumido ("Introdução e comentário Levitico" vs
 * "Levítico" + "introdução e comentário"). Conter todas as palavras do Notion
 * (com 2+ palavras) conta quase como igual.
 */
function similaridadeTitulo(titulo, sugerido, subtitulo) {
  const completo = [sugerido, subtitulo].filter(Boolean).join(" ");
  const tn = palavras(titulo);
  const tc = palavras(completo);
  const contido = tn.size >= 2 && [...tn].every((t) => tc.has(t)) ? 0.95 : 0;
  return Math.max(similaridade(titulo, sugerido), similaridade(titulo, completo), contido);
}

/** 1 se o sobrenome do autor do Notion aparece nos autores sugeridos. */
function autorConfere(autor, autores) {
  const sobrenome = norm(autor).split(" ").pop();
  return sobrenome && palavras(autores.join(" ")).has(sobrenome) ? 1 : 0;
}

async function googleBuscar(q, key, pt) {
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10` +
    `${pt ? "&langRestrict=pt" : ""}&key=${key}`;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 5000 * (tentativa + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Google Books ${res.status}`);
    return (await res.json()).items ?? [];
  }
  throw new Error("Google Books: muitas tentativas");
}

async function buscarGoogle(titulo, autor, key) {
  // Texto livre (titulo + sobrenome) tolera autor escrito diferente
  // ("C.S.Lewis"); primeiro so edicoes em portugues, depois qualquer lingua.
  const sobrenome = norm(autor).split(" ").pop() ?? "";
  const q = `${norm(titulo)} ${sobrenome}`.trim();
  const pontuar = (itens) => {
    let melhor;
    for (const it of itens) {
      const v = it.volumeInfo;
      const score =
        similaridadeTitulo(titulo, v.title, v.subtitle) * 0.7 +
        (autor ? autorConfere(autor, v.authors ?? []) * 0.3 : 0.3);
      // Empate: fica a edicao que tem capa e ISBN.
      const extra = (v.imageLinks ? 0.001 : 0) + (v.industryIdentifiers ? 0.001 : 0);
      if (!melhor || score + extra > melhor.score + melhor.extra) melhor = { score, extra, v };
    }
    return melhor;
  };
  let melhor = pontuar(await googleBuscar(q, key, true));
  if (!melhor || melhor.score < 0.8) {
    const outro = pontuar(await googleBuscar(q, key, false));
    if (outro && (!melhor || outro.score > melhor.score)) melhor = outro;
  }
  if (!melhor) return undefined;
  const v = melhor.v;
  return {
    fonte: "google",
    score: Math.round(melhor.score * 100),
    titulo: [v.title, v.subtitle].filter(Boolean).join(": "),
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

// Open Library: sem chave, mas pede ~1 req/s e User-Agent identificado.
// `lang=pt` faz o sub-documento `editions` trazer a edicao em portugues da
// obra (a obra em si costuma vir com o titulo original, ex: "Mere Christianity").
const OL_UA = "ipc-biblioteca/1.0 (importacao do acervo da igreja)";
const OL_CAMPOS = [
  "key", "editions.key", "title", "author_name", "editions", "editions.title", "editions.isbn", "editions.language",
  "editions.publisher", "editions.publish_date", "editions.cover_i", "editions.number_of_pages_median",
].join(",");

async function olBuscar(q) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&lang=pt&limit=5&fields=${OL_CAMPOS}`;
  await new Promise((r) => setTimeout(r, 1100));
  const res = await fetch(url, { headers: { "User-Agent": OL_UA } });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  return (await res.json()).docs ?? [];
}

async function buscarOpenLibrary(titulo, autor) {
  // A busca e AND de todas as palavras: autor escrito diferente ("C.S.Lewis")
  // zera o resultado. Tenta titulo + sobrenome e, sem nada, so o titulo.
  const sobrenome = norm(autor).split(" ").pop() ?? "";
  let docs = await olBuscar(`${norm(titulo)} ${sobrenome}`.trim());
  if (!docs.length && sobrenome) docs = await olBuscar(norm(titulo));
  let melhor;
  for (const obra of docs) {
    const ed = obra.editions?.docs?.[0];
    if (!ed) continue;
    const score =
      similaridade(titulo, ed.title) * 0.7 + (autor ? autorConfere(autor, obra.author_name ?? []) * 0.3 : 0.3);
    if (!melhor || score > melhor.score) melhor = { score, obra, ed };
  }
  if (!melhor) return undefined;
  const { obra, ed } = melhor;
  const isbns = ed.isbn ?? [];
  return {
    fonte: "openlibrary",
    score: Math.round(melhor.score * 100),
    titulo: ed.title,
    autores: obra.author_name ?? [],
    editora: ed.publisher?.[0],
    ano: parseInt((ed.publish_date?.[0] ?? "").match(/\d{4}/)?.[0] ?? "", 10) || undefined,
    isbn: isbns.find((i) => i.length === 13) ?? isbns[0],
    paginas: ed.number_of_pages_median,
    capa: ed.cover_i ? `https://covers.openlibrary.org/b/id/${ed.cover_i}-L.jpg` : undefined,
  };
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
  if (!key) console.warn("GOOGLE_BOOKS_API_KEY ausente: usando Open Library (~1 livro/s).");

  const livros = [];
  let i = 0;
  for (const exemplares of obras.values()) {
    const base = exemplares[0];
    const buscar = key
      ? () => buscarGoogle(base.titulo, base.autores[0], key)
      : () => buscarOpenLibrary(base.titulo, base.autores[0]);
    const sugestao = await buscar().catch((e) => ({ erro: e.message }));
    if (++i % 25 === 0) console.log(`  busca: ${i}/${obras.size}`);
    livros.push({
      titulo: base.titulo,
      autores: base.autores,
      capaNotion: exemplares.find((e) => e.capa)?.capa,
      sugestao,
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
    "fonte", "score", "sugestao_titulo", "sugestao_autores", "editora", "ano", "isbn", "paginas", "capa_sugerida", "usar_sugestao",
  ];
  const esc = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhasCsv = livros.map((l) => {
    const g = l.sugestao && !l.sugestao.erro ? l.sugestao : undefined;
    return [
      l.exemplares.map((e) => e.codigo).join(" "),
      l.exemplares.map((e) => e.numeroNotion ?? "-").join(" "),
      l.titulo, l.autores.join(", "),
      l.exemplares.map((e) => e.proprietarioNome ?? DONO_IGREJA).join(", "),
      l.exemplares.filter((e) => e.emPosse).map((e) => `${e.emPosse.nome} (${e.emPosse.dataEmprestimo})`).join(", "),
      l.capaNotion ? "sim" : "",
      g?.fonte, g?.score, g?.titulo, g?.autores.join(", "), g?.editora, g?.ano, g?.isbn, g?.paginas, g?.capa,
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

function lerCsvUsarSugestao() {
  // Devolve codigos -> usar_sugestao ("S"/"N") a partir da planilha revisada.
  if (!existsSync(CSV_PATH)) return new Map();
  const [cab, ...linhas] = readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "").split("\n");
  const sep = cab.includes(";") ? ";" : ",";
  const cols = cab.split(sep);
  const iCod = cols.indexOf("codigos");
  const iUsar = cols.indexOf("usar_sugestao");
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

function montarPayload(l, usarSugestao, ajustes) {
  const g = usarSugestao && l.sugestao && !l.sugestao.erro ? l.sugestao : undefined;
  const limpo = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const cod = l.exemplares[0].codigo;
  return limpo({
    titulo: ajustes.titulos?.[cod] ?? l.titulo.trim(),
    autores: ajustes.autores?.[cod] ?? (l.autores.length ? l.autores : g?.autores ?? []),
    editora: g?.editora,
    isbn: g?.isbn,
    ano: g?.ano,
    paginas: g?.paginas || undefined,
    descricao: g?.descricao,
    idioma: ajustes.idiomas?.[cod],
    categorias: [],
    capaUrlOrigem: l.capaNotion ?? g?.capa,
    exemplares: l.exemplares.map((e) =>
      limpo({
        ...e,
        emPosse: e.emPosse && { ...e.emPosse, nome: ajustes.nomes?.[e.emPosse.nome] ?? e.emPosse.nome },
      })
    ),
  });
}

/**
 * Aplica ajustes.json (opcional): `fundir` junta obras que o agrupamento nao
 * percebeu por erro de digitacao ([codigo principal, codigo a anexar]);
 * `titulos`, `autores` e `idiomas` corrigem pelo 1o codigo da obra; `nomes`
 * troca o nome de quem esta com o livro pelo nome completo do cadastro.
 */
function montarLotes() {
  if (!existsSync(JSON_PATH)) throw new Error(`Rode "preparar" antes (${JSON_PATH} nao existe)`);
  const { livros } = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const ajustes = existsSync(AJUSTES_PATH) ? JSON.parse(readFileSync(AJUSTES_PATH, "utf8")) : {};
  const usar = lerCsvUsarSugestao();
  // A decisao S/N e por linha da planilha: ler antes de fundir, que muda a chave.
  const entradas = livros.map((l) => ({ l, usar: usar.get(l.exemplares.map((e) => e.codigo).join(" ")) === "S" }));
  const achar = (codigo) => {
    const i = entradas.findIndex((e) => e.l.exemplares.some((x) => x.codigo === codigo));
    if (i < 0) throw new Error(`ajustes: codigo ${codigo} nao existe`);
    return i;
  };
  for (const [principal, outro] of ajustes.fundir ?? []) {
    const a = entradas[achar(principal)];
    const iOutro = achar(outro);
    const b = entradas[iOutro];
    a.l.exemplares.push(...b.l.exemplares);
    a.l.capaNotion ??= b.l.capaNotion;
    entradas.splice(iOutro, 1);
  }
  const payloads = entradas.map((e) => montarPayload(e.l, e.usar, ajustes));

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
  return { payloads, lotes };
}

/** Grava o payload final sem falar com o Convex, para conferir antes de importar. */
function conferir() {
  const { payloads, lotes } = montarLotes();
  writeFileSync(PAYLOAD_PATH, JSON.stringify(payloads, null, 1));
  const campo = (c) => payloads.filter((p) => p[c]).length;
  console.log(`Livros: ${payloads.length} | exemplares: ${payloads.reduce((n, p) => n + p.exemplares.length, 0)} | lotes: ${lotes.length}`);
  console.log(`isbn ${campo("isbn")} | editora ${campo("editora")} | capa ${campo("capaUrlOrigem")} | sinopse ${campo("descricao")}`);
  console.log(`Gravado: ${PAYLOAD_PATH}`);
}

function importar({ dryRun, prod }) {
  const { lotes } = montarLotes();

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
else if (cmd === "conferir") conferir();
else if (cmd === "importar") importar({ dryRun: flags.includes("--dry-run"), prod: flags.includes("--prod") });
else {
  console.error("uso: node scripts/importar-acervo-notion.mjs preparar | conferir | importar [--dry-run] [--prod]");
  process.exit(1);
}
