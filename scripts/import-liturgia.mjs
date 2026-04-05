#!/usr/bin/env node

/**
 * Parseia CSV de liturgia do Notion e importa no Convex.
 * Uso: node scripts/import-liturgia.mjs [--prod]
 */

import { execFileSync } from "child_process";

// CSV data inline (parsed from the Notion export)
const CSV_ROWS = [
  { notas: "Liturgia", abertura: "Ezequiel 36.22-28", confissao: "Isaías 55", data: "19/05/2024", palavra: "João 4.1-42" },
  { notas: "Liturgia", abertura: "Salmo 95", confissao: "Êxodo 17.1-7", data: "26/05/2024", palavra: "Hebreus 3.7-19" },
  { notas: "Liturgia", abertura: "Salmos 96:1-9", confissao: "Filipenses 3.1-11", data: "09/06/2024", palavra: "Gálatas 1:6-10" },
  { notas: "Liturgia", abertura: "Salmos 2", confissao: "Malaquias 3.1-5", data: "14/04/2024", palavra: "Marcos 1:1-15" },
  { notas: "Liturgia", abertura: "João 1:1-5", confissao: "João 14:1-11", data: "02/06/2024", palavra: "João 20:24-29" },
  { notas: "Liturgia", abertura: "Daniel 7:1-14", confissao: "Marcos 8:27-38", data: "21/04/2024", palavra: "Marcos 9.1-10" },
  { notas: "Liturgia", abertura: "Salmos 118.1-14", confissao: "Salmos 118.15-29", data: "28/04/2024", palavra: "Marcos 11.1-11" },
  { notas: "Liturgia", abertura: "Salmos 124", confissao: "Isaías 5.1-7", data: "05/05/2024", palavra: "Marcos 12.1-12" },
  { notas: "Liturgia", abertura: "Dt 30.1-6", confissao: "Jr 29.8-14", data: "12/05/2024", palavra: "Daniel 9.1-27" },
  { notas: "Liturgia", abertura: "Salmos 84.1-12", confissao: "1João 1.5-10", data: "16/06/2024", palavra: "Lucas 5.12-16" },
  { notas: "Liturgia", abertura: "Hebreus 11:17-19", confissao: "Hebreus 2:14-18", data: "23/06/2024", palavra: "Gênesis 22:1-2" },
  { notas: "Liturgia", abertura: "Colossenses 3.12-14", confissao: "1 João 4.10-11", data: "30/06/2024", palavra: "Lucas 7.36-50" },
  { notas: "Liturgia", abertura: "Salmo 42", confissao: "Salmo 13", data: "07/07/2024", palavra: "Habacuque 1.1 a 2.1" },
  { notas: "Liturgia", abertura: "Jo 3.16-21", confissao: "Sl 104.19-31", data: "14/07/2024", palavra: "Gn 1.1-2.3" },
  { notas: "Liturgia", abertura: "Gn 1.31-2.1-3", confissao: "Mt 11.25-30", data: "21/07/2024", palavra: "Hebreus 4.1-13" },
  { notas: "Liturgia", abertura: "Habacuque 2.2-5", confissao: "Salmo 31.1-7", data: "28/07/2024", palavra: "Habacuque 3" },
  { notas: "Liturgia", abertura: "Salmos 110", confissao: "Salmos 123", data: "04/08/2024", palavra: "Marcos 12.35-37" },
  { notas: "Liturgia", abertura: "Daniel 7.9-14,22-28", confissao: "Marcos 14.1-9", data: "11/08/2024", palavra: "Marcos 14.55-65" },
  { notas: "Liturgia", abertura: "Salmo 1", confissao: "Isaías 44.9-20", data: "18/08/2024", palavra: "1Reis 11.1-13" },
  { notas: "Liturgia", abertura: "Marcos 10.35-45", confissao: "Salmos 22.6-18", data: "25/08/2024", palavra: "Marcos 15.15-32" },
  { notas: "Liturgia", abertura: "1Coríntios 2.6-16", confissao: "Salmos 22.1-5,19-31", data: "01/09/2024", palavra: "Marcos 15.33-41" },
  { notas: "Liturgia", abertura: "Salmo 18.1 a 6", confissao: "Salmo 31.1 a 16", data: "08/09/2024", palavra: "Salmos 42 e 43" },
  { notas: "Liturgia", abertura: "Isaías 60.1-4", confissao: "Isaías 59.15-20", data: "15/09/2024", palavra: "1 Tessalonicenses 5.1-11" },
  { notas: "Liturgia", abertura: "Leviticos 16.2-6; 11-13", confissao: "Hebreus 2.5-18", data: "22/09/2024", palavra: "Hebreus 4.16-5.3" },
  { notas: "Liturgia", abertura: "Ap 22.1-5", confissao: "Lc 23.39-43", data: "29/09/2024", palavra: "Gn 2.4-25" },
  { notas: "Liturgia", abertura: "Salmos 8 (Davi)", confissao: "Salmos 26 (Tche)", data: "06/10/2024", palavra: "Josué 1.1-6" },
  { notas: "Liturgia", abertura: "Romanos 5.1-11", confissao: "Jonas 4.1-11", data: "13/10/2024", palavra: "Lucas 15.25-32" },
  { notas: "Liturgia", abertura: "Mateus 6.5-15", confissao: "Gênesis 3.1-10", data: "20/10/2024", palavra: "Lucas 22.39-48" },
  { notas: "Liturgia", abertura: "Colossenses 1:13-23", confissao: "2 Corintios 5:11-20", data: "27/10/2024", palavra: "Efésios 2:13-19" },
  { notas: "Liturgia", abertura: "Marcos 4.35-41", confissao: "Salmos 107.1-15", data: "03/11/2024", palavra: "1Samuel 17" },
  { notas: "Liturgia", abertura: "Pv 3.13-18", confissao: "Tg 1.12-18", data: "10/11/2024", palavra: "Gn 3.1-24" },
  { notas: "Liturgia", abertura: "Romanos 5.1-11", confissao: "1 João 4.7-21", data: "17/11/2024", palavra: "Colossenses 1.1-8" },
  { notas: "Liturgia", abertura: "Proverbios 3:1-10", confissao: "Salmos 144:1-15", data: "24/11/2024", palavra: "Eclesiastes 1:1-11" },
  { notas: "Liturgia", abertura: "Salmos 75", confissao: "Mateus 7.13-27", data: "01/12/2024", palavra: "Mateus 25.14-30" },
  { notas: "Liturgia", abertura: "Salmos 126", confissao: "Deuteronômio 9.1-8,25-29", data: "08/12/2024", palavra: "Josué 1.1-9; 5.13-15; Atos 6.1-7" },
  { notas: "Liturgia", abertura: "Salmos 99", confissao: "Deuteronômio 6.1-9", data: "15/12/2024", palavra: "Mateus 28.16-20; Lucas 24.13-35" },
  { notas: "Liturgia", abertura: "Apocalipse 5.1-14", confissao: "Mateus 2.1-12", data: "22/12/2024", palavra: "Lucas 2.1-14" },
  { notas: "Liturgia", abertura: "Salmos 48", confissao: "Isaías 5.1-7", data: "05/01/2025", palavra: "João 15.1-12" },
  { notas: "Liturgia", abertura: "1 Pedro 1.3-9", confissao: "Salmo 119.1-8", data: "12/01/2025", palavra: "Tiago 1.1-18" },
  { notas: "Liturgia", abertura: "Mateus 5.43-48", confissao: "Mateus 7.24-27", data: "19/01/2025", palavra: "Tiago 1.19-2.13" },
  { notas: "Liturgia", abertura: "Tg 3.1-12", confissao: "Tg 3.13-18", data: "26/01/2025", palavra: "Tg 4.1-12" },
  { notas: "Liturgia", abertura: "Salmo 100", confissao: "Filipenses 2.14-16", data: "02/02/2025", palavra: "Tiago 5.7-11" },
  { notas: "Liturgia", abertura: "Apocalipse 21.1-8", confissao: "Colossenses 1.9-12", data: "09/02/2025", palavra: "Efésios 1.3-23" },
  { notas: "Liturgia", abertura: "Gênesis 2.4-17", confissao: "1Coríntios 3.1-9", data: "16/02/2025", palavra: "Colossenses 1.9-12; 3.17" },
  { notas: "Liturgia", abertura: "Mateus 3.13-17", confissao: "Mateus 5.17-20", data: "23/02/2025", palavra: "João 20.19-23; Mateus 28.16-20" },
  { notas: "Liturgia", abertura: "Romanos 5.1-11", confissao: "Mateus 18.21-35", data: "04/03/2025", palavra: "Gálatas 5:16-21; Filipenses 3.12-14" },
  { notas: "Liturgia", abertura: "Romanos 8.28-38", confissao: "1 Pedro 2.1-3 e 2.11-12", data: "09/03/2025", palavra: "1 Pedro 1.1-25" },
  { notas: "Liturgia", abertura: "Salmo 34.9-22", confissao: "Efésios 2.11-22", data: "16/03/2025", palavra: "1 Pedro 1.13-25; 2.1-10" },
  { notas: "Liturgia", abertura: "Isaías 49.1-9", confissao: "Lucas 9.18-27", data: "23/03/2025", palavra: "1 Pedro 2.11-3.7" },
  { notas: "Liturgia", abertura: "Isaías 25.1-9", confissao: "Lucas 6.20-26", data: "30/03/2025", palavra: "1 Pedro 4.12-19" },
  { notas: "Liturgia", abertura: "Marcos 1.1-11", confissao: "Romanos 6.1-14", data: "06/04/2025", palavra: "Atos 13.16-43" },
  { notas: "Liturgia", abertura: "1Pedro 3.13-22", confissao: "1Coríntios 3.1-9", data: "13/04/2025", palavra: "Atos 1.1-14; 2.42-47; 13.1-3" },
  { notas: "Liturgia", abertura: "João 4.13-29", confissao: "Atos 1.6-11", data: "20/04/2025", palavra: "Lucas 24.1-35" },
  { notas: "Liturgia", abertura: "João 1.1-14", confissao: "Salmo 6", data: "27/04/2025", palavra: "Salmo 88" },
  { notas: "Liturgia", abertura: "Salmo 4", confissao: "Salmo 103", data: "04/05/2025", palavra: "Salmo 3" },
  { notas: "Liturgia", abertura: "Salmo 27", confissao: "Salmo 84", data: "11/05/2025", palavra: "2 Sm 15.1-16; 17.24-29; Salmo 63" },
  { notas: "Liturgia", abertura: "Salmo 33.1-9", confissao: "Ezequiel 33.30-32", data: "18/05/2025", palavra: "Salmo 19" },
  { notas: "Liturgia", abertura: "1 Samuel 1.1-10", confissao: "Marcos 14.22-31", data: "25/05/2025", palavra: "Salmos 113.1-9" },
  { notas: "Liturgia", abertura: "Isaías 61.1-11", confissao: "Amós 5.18-27", data: "01/06/2025", palavra: "Lucas 4.16-21" },
  { notas: "Liturgia", abertura: "Salmos 104.1-18,33-35", confissao: "Apocalipse 11.15-19", data: "08/06/2025", palavra: "Gênesis 1.1-2; 2.1-3" },
  { notas: "Liturgia", abertura: "Salmos 8.1-9", confissao: "Lucas 12.13-21", data: "15/06/2025", palavra: "Marcos 6.30-44" },
  { notas: "Liturgia", abertura: "Mateus 28.16-20; 5.1-12", confissao: "Tiago 2.14-26; Mateus 7.21-27", data: "22/06/2025", palavra: "Mateus 25.31-46" },
  { notas: "Liturgia", abertura: "Romanos 5.6-11", confissao: "Juízes 2.11-23", data: "29/06/2025", palavra: "Juízes 13" },
  { notas: "Liturgia", abertura: "Isaías 29.13-16", confissao: "Tiago 4.1-10", data: "06/07/2025", palavra: "Juízes 13.25-14.20" },
  { notas: "Liturgia", abertura: "Ap 19.11-16", confissao: "Gn 50.15-21", data: "13/07/2025", palavra: "Jz 15.1-20" },
  { notas: "Liturgia", abertura: "Filipenses 2.5-11", confissao: "Provérbios 3.5-12", data: "20/07/2025", palavra: "Juízes 16.1-22" },
  { notas: "Liturgia", abertura: "Isaías 29.13-16", confissao: "Salmo 135.13-21", data: "27/07/2025", palavra: "Juízes 16" },
  { notas: "Liturgia", abertura: "Mateus 3.13-17 e 11.25-30", confissao: "Marcos 9.33-37", data: "03/08/2025", palavra: "Marcos 10.13-16" },
  { notas: "Liturgia", abertura: "1João 3.1-6", confissao: "Marcos 14.32-42", data: "10/08/2025", palavra: "Romanos 8.14-17" },
  { notas: "Liturgia", abertura: "Lucas 2.41-52", confissao: "Mateus 10.34-39", data: "17/08/2025", palavra: "Mateus 8.18-22" },
  { notas: "Liturgia", abertura: "João 1.1-18", confissao: "Filipenses 2.5-11", data: "24/08/2025", palavra: "João 13.1-17" },
  { notas: "Liturgia", abertura: "Lucas 18.18-30", confissao: "Lucas 18.9-14", data: "31/08/2025", palavra: "Lucas 10.25-37" },
  { notas: "Liturgia", abertura: "Lc 4.16-19", confissao: "Lc 14.1-11", data: "07/09/2025", palavra: "Lc 14.12-24" },
  { notas: "Liturgia", abertura: "Deuteronômio 6:4-9", confissao: "Lucas 18.24-30", data: "14/09/2025", palavra: "Lucas 14:25-35" },
  { notas: "Liturgia", abertura: "Salmos 24.1-10", confissao: "Miquéias 6.6-8", data: "21/09/2025", palavra: "Lucas 19.1-10" },
  { notas: "Liturgia", abertura: "Salmos 146", confissao: "Salmos 91.1-16", data: "28/09/2025", palavra: "João 5.1-14" },
  { notas: "Liturgia", abertura: "João 3.16-21", confissao: "Números 21.4-9", data: "05/10/2025", palavra: "Efésios 2.8-10; Tiago 1.21-27" },
  { notas: "Liturgia", abertura: "Atos 10.34-48", confissao: "João 11.17-27 e 11.38-44", data: "12/10/2025", palavra: "Lucas 7.1-10" },
  { notas: "Liturgia", abertura: "Filipenses 4.1-9", confissao: "Êxodo 32.1-14", data: "19/10/2025", palavra: "Salmos 23" },
  { notas: "Liturgia", abertura: "Marcos 10:29-30", confissao: "Apocalipse 5:6-12", data: "26/10/2025", palavra: "Apocalipse 3:14-22" },
  { notas: "Liturgia", abertura: "Dt 11.18-21", confissao: "2Pe 3.11-18", data: "02/11/2025", palavra: "Salmos 137; 1Pe 2.1-12" },
  { notas: "Liturgia", abertura: "João 1:1-5 e 1:10-14", confissao: "Ezequiel 36:22-28", data: "09/11/2025", palavra: "João 3:1-13" },
  { notas: "Liturgia", abertura: "Mateus 1.1-17", confissao: "Mateus 2.13-15", data: "16/11/2025", palavra: "Mateus 4.1-11" },
  { notas: "Liturgia", abertura: "Salmos 1", confissao: "Ageu 1.1-11", data: "23/11/2025", palavra: "Mateus 5.1-16" },
  { notas: "Liturgia", abertura: "Rm 8.31-39", confissao: "Sl 27.1-14", data: "30/11/2025", palavra: "2 Timóteo 1.1-12" },
  { notas: "Liturgia", abertura: "Salmos 126", confissao: "Deuteronômio 9.1-8,25-29", data: "08/12/2024", palavra: "Josué 1.1-9; 5.13-15; Atos 6.1-7" },
  { notas: "Liturgia", abertura: "Salmos 99", confissao: "Deuteronômio 6.1-9", data: "15/12/2025", palavra: "Mateus 28.16-20; Lucas 24.13-35" },
  { notas: "Liturgia", abertura: "Lucas 2.8-20", confissao: "João 13.1-20", data: "21/12/2025", palavra: "Filipenses 2.1-11" },
  { notas: "Liturgia", abertura: "Efésios 1", confissao: "", data: "28/12/2025", palavra: "Salmos 103" },
  { notas: "Liturgia", abertura: "Salmo 113", confissao: "Romanos 6.11-14", data: "11/01/2026", palavra: "Colossenses 3.1-4" },
  { notas: "Liturgia", abertura: "Salmo 99", confissao: "Lucas 18.9-14", data: "18/01/2026", palavra: "Joel 2.12-14" },
  { notas: "Liturgia", abertura: "Isaías 60.1-3", confissao: "Filipenses 3.4-11", data: "25/01/2026", palavra: "Atos 9.1-20" },
  { notas: "Liturgia", abertura: "Salmos 110", confissao: "Salmos 40", data: "01/02/2026", palavra: "Hebreus 1.1-4: 10.19-25" },
  { notas: "Liturgia", abertura: "Mateus 13.31-32", confissao: "Salmos 51.1-13", data: "08/02/2026", palavra: "Mateus 6.5-15" },
  { notas: "Liturgia", abertura: "Salmos 23", confissao: "Êxodo 20.1-17", data: "22/02/2026", palavra: "Mateus 6.19-34" },
  { notas: "Liturgia", abertura: "Salmos 30", confissao: "Mateus 18.15-20", data: "01/03/2026", palavra: "Mateus 7.1-12" },
  { notas: "Liturgia", abertura: "Salmos 1", confissao: "Deuteronômio 28.1-9,15-20", data: "08/03/2026", palavra: "Mateus 7.13-29" },
  { notas: "Liturgia", abertura: "Gn 12:1-9", confissao: "Gn 50:15-21", data: "15/03/2026", palavra: "Gn 50:22-26" },
  { notas: "Liturgia", abertura: "Apocalipse 5.1-7", confissao: "Filipenses 2.5-11", data: "22/03/2026", palavra: "João 13.1-17" },
  { notas: "Liturgia", abertura: "Salmos 46", confissao: "Marcos 8.27-38", data: "29/03/2026", palavra: "Colossenses 3.1-17" },
  { notas: "Liturgia", abertura: "João 1.1-14", confissao: "Hebreus 4.1-13", data: "05/04/2026", palavra: "Colossenses 1.15-23" },
  { notas: "Liturgia", abertura: "Levítico 19.1-4", confissao: "1Pedro 1.3-17", data: "12/04/2026", palavra: "1Coríntios 1.1-9" },
  { notas: "Liturgia", abertura: "Jeremias 29.10-14", confissao: "Isaías 29.13-16", data: "19/04/2026", palavra: "1Coríntios 1.10-25" },
  { notas: "Liturgia", abertura: "Atos 14.8-18", confissao: "Jeremias 9.23-24", data: "26/04/2026", palavra: "1Coríntios 1.26-2.5" },
  { notas: "Liturgia", abertura: "Isaías 52.1-10", confissao: "Isaías 64.1-12", data: "03/05/2026", palavra: "1Coríntios 2.6-16" },
  { notas: "Liturgia", abertura: "Efésios 4.1-6", confissao: "Jeremias 23.1-8", data: "07/06/2026", palavra: "1Coríntios 3.1-17" },
  { notas: "Liturgia", abertura: "Efésios 1.1-10", confissao: "Jó 5.8-16", data: "14/06/2026", palavra: "1Coríntios 3.18-23" },
  { notas: "Liturgia", abertura: "2Coríntios 12.1-10", confissao: "1Samuel 16.1-13", data: "21/06/2026", palavra: "1Coríntios 4.1-13" },
  { notas: "Liturgia", abertura: "João 6.53-69", confissao: "Hebreus 12.4-13", data: "28/06/2026", palavra: "1Coríntios 4.14-21" },
  { notas: "Liturgia", abertura: "Efésios 2.1-10", confissao: "Tiago 2.14-17", data: "04/01/2026", palavra: "Mateus 6.1-18" },
];

// Converter DD/MM/YYYY para YYYY-MM-DD
function parseDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split("/");
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const items = CSV_ROWS
  .map((r) => ({
    data: parseDate(r.data),
    notas: r.notas || undefined,
    abertura: r.abertura?.trim() || undefined,
    confissao: r.confissao?.trim() || undefined,
    palavra: r.palavra?.trim() || undefined,
  }))
  .filter((r) => r.data && (r.abertura || r.confissao || r.palavra));

const isProd = process.argv.includes("--prod");
const args = JSON.stringify({ items });

console.log(`Importando ${items.length} domingos${isProd ? " (PROD)" : " (DEV)"}...`);

const cmdArgs = ["convex", "run", "escalas/importLiturgia:importar", args];
if (isProd) cmdArgs.push("--prod");

try {
  const result = execFileSync("npx", cmdArgs, { encoding: "utf-8", timeout: 120000 });
  console.log("Resultado:", result);
} catch (e) {
  console.error("Erro:", e.message?.slice(0, 500));
}
