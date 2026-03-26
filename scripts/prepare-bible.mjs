/**
 * Script para baixar e converter a Biblia NAA do repositorio damarals/biblias
 * para formato nested usado pelo preview de passagens.
 *
 * Uso: node scripts/prepare-bible.mjs
 * Saida: public/bible/naa.json
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_URL =
  "https://raw.githubusercontent.com/damarals/biblias/main/inst/json/NAA.json";
const OUTPUT_PATH = join(__dirname, "..", "public", "bible", "naa.json");

// Mapeamento de abreviacao da fonte → nome canonico
// A fonte usa abreviacoes sem acento, nosso BIBLE usa com acento
const ABBREV_TO_NAME = {
  gn: "Gênesis",
  ex: "Êxodo",
  lv: "Levítico",
  nm: "Números",
  dt: "Deuteronômio",
  js: "Josué",
  jz: "Juízes",
  rt: "Rute",
  "1sm": "1 Samuel",
  "2sm": "2 Samuel",
  "1rs": "1 Reis",
  "2rs": "2 Reis",
  "1cr": "1 Crônicas",
  "2cr": "2 Crônicas",
  ed: "Esdras",
  ne: "Neemias",
  et: "Ester",
  jó: "Jó",
  jo: "Jó", // sem acento
  sl: "Salmos",
  pv: "Provérbios",
  ec: "Eclesiastes",
  ct: "Cantares",
  is: "Isaías",
  jr: "Jeremias",
  lm: "Lamentações",
  ez: "Ezequiel",
  dn: "Daniel",
  os: "Oséias",
  jl: "Joel",
  am: "Amós",
  ob: "Obadias",
  jn: "Jonas",
  mq: "Miquéias",
  na: "Naum",
  hc: "Habacuque",
  sf: "Sofonias",
  ag: "Ageu",
  zc: "Zacarias",
  ml: "Malaquias",
  mt: "Mateus",
  mc: "Marcos",
  lc: "Lucas",
  // João (evangelho) precisa vir DEPOIS de Jó
  at: "Atos",
  rm: "Romanos",
  "1co": "1 Coríntios",
  "2co": "2 Coríntios",
  gl: "Gálatas",
  ef: "Efésios",
  fp: "Filipenses",
  cl: "Colossenses",
  "1ts": "1 Tessalonicenses",
  "2ts": "2 Tessalonicenses",
  "1tm": "1 Timóteo",
  "2tm": "2 Timóteo",
  tt: "Tito",
  fm: "Filemom",
  hb: "Hebreus",
  tg: "Tiago",
  "1pe": "1 Pedro",
  "2pe": "2 Pedro",
  "1jo": "1 João",
  "2jo": "2 João",
  "3jo": "3 João",
  jd: "Judas",
  ap: "Apocalipse",
};

// Ordem canonica dos livros para desambiguacao
const CANONICAL_ORDER = [
  "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio",
  "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel",
  "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras",
  "Neemias", "Ester", "Jó", "Salmos", "Provérbios",
  "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações",
  "Ezequiel", "Daniel", "Oséias", "Joel", "Amós",
  "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque",
  "Sofonias", "Ageu", "Zacarias", "Malaquias",
  "Mateus", "Marcos", "Lucas", "João", "Atos",
  "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios",
  "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses",
  "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus",
  "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João",
  "3 João", "Judas", "Apocalipse",
];

async function main() {
  console.log("Baixando NAA.json...");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const source = await res.json();

  console.log(`Recebidos ${source.length} livros`);

  const result = {};
  const usedNames = new Set();

  for (let i = 0; i < source.length; i++) {
    const book = source[i];
    const abbrevLower = book.abbrev.toLowerCase();

    let bookName = ABBREV_TO_NAME[abbrevLower];

    // Desambiguacao: se "jo" ja foi usado para Jó, o proximo "jo" na posicao do NT e João
    if (!bookName || usedNames.has(bookName)) {
      // Tentar pelo indice canonico
      if (i < CANONICAL_ORDER.length) {
        bookName = CANONICAL_ORDER[i];
      }
    }

    if (!bookName) {
      console.warn(`  WARN: Livro nao mapeado: abbrev="${book.abbrev}" (indice ${i})`);
      continue;
    }

    usedNames.add(bookName);

    const chapters = {};
    for (let c = 0; c < book.chapters.length; c++) {
      const verses = {};
      for (let v = 0; v < book.chapters[c].length; v++) {
        verses[String(v + 1)] = book.chapters[c][v];
      }
      chapters[String(c + 1)] = verses;
    }
    result[bookName] = chapters;
  }

  console.log(`Convertidos ${Object.keys(result).length} livros`);

  // Verificar que todos os 66 livros foram mapeados
  const missing = CANONICAL_ORDER.filter((n) => !result[n]);
  if (missing.length > 0) {
    console.warn(`WARN: Livros faltando: ${missing.join(", ")}`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(result), "utf-8");

  const sizeMB = (Buffer.byteLength(JSON.stringify(result)) / 1024 / 1024).toFixed(1);
  console.log(`Salvo em ${OUTPUT_PATH} (${sizeMB}MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
