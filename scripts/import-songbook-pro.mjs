/**
 * Script para importar músicas do Songbook Pro (.sbp) para o Convex.
 *
 * Uso:
 *   node scripts/import-songbook-pro.mjs
 */

import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "sbp_extract/dataFile.txt");
const TMP_ARGS = join(__dirname, "_tmp_import_args.json");
const PROJECT_DIR = join(__dirname, "..");

const raw = readFileSync(DATA_FILE, "utf-8");
const lines = raw.split("\n");
const data = JSON.parse(lines[1]);

console.log(`📦 ${data.songs.length} musicas encontradas\n`);

function extractKey(content) {
  const match = content.match(/\[([A-G][#b]?m?)\]/);
  return match ? match[1] : undefined;
}

function cleanName(name) {
  return name.replace(/[✔✅☑⭐🎵️]/g, "").replace(/\s+/g, " ").trim();
}

function convertSectionOrder(order) {
  if (!order || !order.trim()) return undefined;
  const map = { I: "i", V: "v", V1: "v1", V2: "v2", V3: "v3", V4: "v4", C: "r", C1: "r", C2: "r", P: "pc", B: "p", O: "f", T: "tag" };
  return order.trim().split(/\s+/).map((s) => map[s] || s.toLowerCase()).join(" ");
}

const songs = data.songs
  .filter((s) => !s.Deleted)
  .map((s) => ({
    titulo: cleanName(s.name),
    artista: s.author && s.author.trim() ? s.author.trim() : undefined,
    tom: extractKey(s.content) || undefined,
    bpm: s.TempoInt > 0 ? s.TempoInt : undefined,
    conteudo: s.content || undefined,
    estrutura: convertSectionOrder(s.SectionOrder) || undefined,
    youtubeUrl: s.Url && s.Url.trim() ? s.Url.trim() : undefined,
  }));

let imported = 0;
let skipped = 0;
let errors = 0;

for (const song of songs) {
  // Limpar undefined fields para JSON valido
  const clean = {};
  for (const [k, v] of Object.entries(song)) {
    if (v !== undefined) clean[k] = v;
  }

  writeFileSync(TMP_ARGS, JSON.stringify(clean));

  try {
    const result = execSync(
      `npx convex run --no-push louvor/mutations:seed "$(cat "${TMP_ARGS}")"`,
      { cwd: PROJECT_DIR, stdio: "pipe", shell: "/bin/bash", timeout: 30000 }
    ).toString().trim();

    if (result.includes("already exists") || result.includes("null")) {
      skipped++;
      console.log(`⏭ ${song.titulo} (ja existe)`);
    } else {
      imported++;
      console.log(`✓ ${song.titulo}`);
    }
  } catch (e) {
    const stderr = e.stderr?.toString() || "";
    const msg = stderr.split("\n").find((l) => l.includes("Error")) || e.message.split("\n")[0];
    errors++;
    console.error(`✗ ${song.titulo}: ${msg.slice(0, 120)}`);
  }
}

try { unlinkSync(TMP_ARGS); } catch {}

console.log(`\n✅ Importadas: ${imported} | ⏭ Ja existiam: ${skipped} | ❌ Erros: ${errors}`);
