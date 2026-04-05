#!/usr/bin/env node

/**
 * Importar escalas do CSV do Notion.
 * Uso: node scripts/import-escalas.mjs [--prod]
 */

import { execFileSync } from "child_process";

// Mapeamento apelido → membroId (prod)
const MEMBROS = {
  "André": "n57av021qyzja4q8msekyxzy4x846wz0",
  "Bernardo": "n571zk3kvp82as7vk57nf2n8bd8479ea",
  "Leandro": "n57281fm0czt5tqemn22czy90n847fzz",
  "Rachel": "n579rr7xn0djvzzbx093tdjspn847p6t",
  "Davi": "n57ap67cs3n4b70600wy25rteh8474b4",
  "Davi Jung": "n57ap67cs3n4b70600wy25rteh8474b4",
  "Davi T": "n57ap67cs3n4b70600wy25rteh8474b4",
  "Davi Liu": "n57aff8w33p46wdmwf0t62efth846tfv",
  "Lucas": "n578x2nry3pcnemw4xsmb164h58461q1",
  "Lucas Cruz": "n578x2nry3pcnemw4xsmb164h58461q1",
  "Thomas": "n579q09f236emzryne1rrhbh29847eny",
  "Thomas Rogalsky": "n579q09f236emzryne1rrhbh29847eny",
  "Natanael": "n57bkryjgq3db20fd30fy1zj75846233",
  "Natanel": "n57bkryjgq3db20fd30fy1zj75846233",
  "Nata": "n57bkryjgq3db20fd30fy1zj75846233",
  "Ian": "n57dw1q95419kx1e6dyqwyngbs847wr4",
  "kim ian": "n57dw1q95419kx1e6dyqwyngbs847wr4",
  "Tche": "n57dz444xyckecjhjfrmn2rzns847s9c",
  "Tche Paulo": "n57dz444xyckecjhjfrmn2rzns847s9c",
  "Yuji": "n57ewb7sjpj9ssddc6k3brys6n846ca3",
  "Simon": "n57a60106c80ycc14gfnz7f44x8476wv",
  "Simon Kang": "n57a60106c80ycc14gfnz7f44x8476wv",
  "Nicole": "n575s1jsd2yw22r8nv47b5r0y9846cqz",
  "Nicole van Eijk": "n575s1jsd2yw22r8nv47b5r0y9846cqz",
  "Ricardo": "n57244fyfbn0z03xjm0vknm1vd847b7j",
  "Ricardo Felipe Di Carlo": "n57244fyfbn0z03xjm0vknm1vd847b7j",
  "Guilherme Bevilacqua": "n57bj0909ryqh68g6wem2gktqn8467j8",
  "Antony": "n57ekzd0jgchec7f0y7hst2nwx847jb4",
  "In": "n573pyvbhkpgjfpf1s0kjtrf1x846jrd",
  "Luis": "n579txntbkt2ctaxe34p81r13d846my5",
  "Giovana": "n57d9hcedzxsa4nxv649w1bpb5846mps",
  "Giovanna": "n57d9hcedzxsa4nxv649w1bpb5846mps",
  "Sonia": "n57b2ng7xytg4dv4m7s7ghem6x846d4j",
  "Tati": "n5792d6mazs9a8ka0gb6x7yc79847eh6",
  "Fabi": "n57ffg0kacfkcre0f6p5f8mjgd846m5n",
  "Luana": "n577t74zfjrzrtj9c7se1f51jx847h8n",
  "Douglas": "n578ydreekabpca7cw1mz8f095846q6d",
  "Alex Cho": "n578zn56thetwj3yrdq97084hh846380",
  "Andre Chen": "n57eem4pavr8ehjmffj93khkzs847bd8",
  "Alisson": "n575vce8w08r4mmfhnnxp19dm1846p9k",
  "Aliel": "n573s08dt4aft6h4be319djk5n8477r7",
  "Mateus": "n57fcyey5223qf78svv78dawr1847tva",
  "Matheus": "n57fcyey5223qf78svv78dawr1847tva",
  "Filip": "n57e1vswr59q88w7888et7nm898466j0",
  "Ana": "n573xs25f1j25hxcxq5702vevn847qrs",
  "Dani": "n576dpvqx0mbc6wyhyn0aqg4pn8465g1",
  "Daniel Pang": "n57cne1fyz2fcan52w65gthk01847mx5",
  "Gabriel Freitas": "n57463wm1s1fycyv4a2w5jjfqx8463ht",
  "Gabriel Teixeira": "n576nkrt4zb60q2wan03f6m79d846ap8",
  "Juliana Carvalho": "n5791rtrbxre7vt2r4hkdm5d2x847spp",
  "Juliana Floreano": "n574fxamb8skz3gbr72y09b0w1846jkm",
  "Lorena": "n578pwrk3n6aj1tj6r45netxjx846ke2",
  "Raul": "n57e5qz1ypq3espk1e7dzrbn4h846cf8",
  "Joel": "n57dfxns6rhjyqcdc0r7g7jq4d8468k4",
  "Sigrid": "n577wfmc166r260sdwy17gcdn1847kg9",
  "Silmara": "n575b0aes9fcyjxn8hpa64tfkn847xt8",
  "Priscila": "n5704zg0rybdy7mb0c0x7w42v184644d",
  "Janete": "n570j3gcp7p8vbyqtdspn8p9mx8467zt",
  "Quezia": "n5797p7m4t1hxpy1p9ekgqtkxd846c19",
  "Thais": "n5776q3qa2az62064pqjyagbdh846pjs",
  "Thais Novaes": "n5776q3qa2az62064pqjyagbdh846pjs",
  "Esther Yang": "n571khbkfv7m5mmpqjvfjjf6ds847pp1",
  "Eduardo": "n571m978zb0h7kts2bbdmdj5px8476qj",
  "Julia Laforgia": "n57f6jv6wv3aancr8ze008d96n8473qq",
  "Aline Cho": "n5779p3edgmj0mmbdjrdhehr11847h4r",
  "Aline Chung": "n57ddr35npany15yzc7kcztcvd847vka",
  "Sarah Jung": "n57abasyvq0hypqg5y1eafr31d8460g6",
  "Sarah Souza": "n57emzp03grs0f5zcmj6k9mf6n847sgz",
  "Sarah Sousa": "n57emzp03grs0f5zcmj6k9mf6n847sgz",
  "Luan": "n575emeksyv92d8ncb2m2gzmjn8476cr",
  "Pedro": "n57fp2h8w55xyzvchexfd3c24s84678y",
  "David Shin": "n57ehr2nry6nzme9gmtgwesr31846hvy",
  "John": "n5792wfszvth60ewg036wyqwm1846wh9",
  "Annes": "n574ezaz4raw8q2xjjf9rwe37h8478xa",
  "Wilson": "n572n57fm4j26c629017xy9brx847h41",
  "Christiane": "n578rwwqwmh43xxj9qk07sk5bn847vwb",
  "Fernanda": "n570qzk7mje57bf6wz7vyf7kk1846q2f",
  "Karina": "n57d808gz3x86cc27hyjm11qhh846gba",
  "Karina Di Carlo": "n57d808gz3x86cc27hyjm11qhh846gba",
  "Gabriel Colluci": "n57bjbt2naar5x7ycbkq5s00kh8478pz",
  "Gabriel Colucci": "n57bjbt2naar5x7ycbkq5s00kh8478pz",
  "Fernando Azevedo": "n57cp93yperwnpq7s2hs5nvpj9847ghs",
  "Andre Choi": "n57av021qyzja4q8msekyxzy4x846wz0",
  "André Choi": "n57av021qyzja4q8msekyxzy4x846wz0",
  "Diana": "n575pxtdwxz2ft85h4bhzrvhex847bd4",
  "Roberta": "n573s9dbsgrrg5k313j0156xdx847r5g",
  "Maryson": "n5727b6xyq0gev994tr5c1pp1s8477ve",
  "Marysol": "n5727b6xyq0gev994tr5c1pp1s8477ve",
  "Marissol": "n5727b6xyq0gev994tr5c1pp1s8477ve",
  "Estefano": "n5751zptwaap5ate806aaj58698475x9",
  "Rachel Sousa": "n579rr7xn0djvzzbx093tdjspn847p6t",
  "Natanael Ahn": "n57bkryjgq3db20fd30fy1zj75846233",
  "Leandro Novaes": "n57281fm0czt5tqemn22czy90n847fzz",
  "Lucas Cruz": "n578x2nry3pcnemw4xsmb164h58461q1",
  "Davi Liu": "n57aff8w33p46wdmwf0t62efth846tfv",
  "Filippe Lyra": "n57b2qdkfaa8jm3fwnrcc21gk58473ev",
  "Filippe": "n57b2qdkfaa8jm3fwnrcc21gk58473ev",
  "Sae Won": "n57904h204nbxbtqysn8t4pe81846jh7",
  "Gustavo Barros": "n57d8s1s23cme471gay2qwhht9846yq9",
  "Raissa": "n57f6pdapxqyrqefkmb2ashc7n846sfq",
  "Raíssa": "n57f6pdapxqyrqefkmb2ashc7n846sfq",
  "Carol Pang": "n578mhg7kcaaw19sd9t8tc07f58465yc",
  "Carolina": "n578mhg7kcaaw19sd9t8tc07f58465yc",
  "Daniela Lee": "n576dpvqx0mbc6wyhyn0aqg4pn8465g1",
  "Eliana": "n5722skm3836erzgc3q8svx1m5846tm6",
  "Giovanna": "n57d9hcedzxsa4nxv649w1bpb5846mps",
  "Juliane": "n57amv0xag50447vk8ybk50k9n847ax3",
  "Ana Felix": "n573xs25f1j25hxcxq5702vevn847qrs",
};

function cleanName(raw) {
  if (!raw) return null;
  return raw
    .replace(/^@/, "")
    .replace(/\n/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

function resolvepessoa(nome) {
  if (!nome) return null;
  const cleaned = cleanName(nome);
  if (!cleaned || cleaned === "Recesso" || cleaned === "-") return null;

  // Tentar match direto
  if (MEMBROS[cleaned]) return MEMBROS[cleaned];

  // Tentar sem espaços extras
  for (const [key, id] of Object.entries(MEMBROS)) {
    if (key.toLowerCase() === cleaned.toLowerCase()) return id;
  }

  // Convidado
  return "custom:" + cleaned;
}

function parseDate(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const [d, m, y] = ddmmyyyy.split("/");
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// CSV data
const CSV_ROWS = `Escala Dominical,Tche,Davi,14/04/2024,"André, Antony, Giovana, Simon",,Douglas,Bernardo
Escala Dominical,Bernardo,Leandro,02/06/2024,"André, Giovana",Tati,Ricardo,Leandro
Escala Dominical,Bernardo,Rachel,05/05/2024,"André, Simon",Tati,Alisson,Bernardo
Escala Dominical,Lucas,Ian,12/05/2024,"André, Simon",Nicole,In,Davi Jung
Escala Dominical,Ian,Lucas,16/06/2024,"Davi, In",Fabi,Alex Cho,Josimar
Escala Dominical,Tche,Davi Jung,23/06/2024,"André, Simon",Luana,Aliel,Isaque
Escala Dominical,Natanael,Thomas,30/06/2024,"Antony, Luis",Sonia,Simon,Pedro Feniman
Escala Dominical,Ian,Tche,19/05/2024,Davi,Fabi,Juliana Carvalho,Lucas
Escala Dominical,Yuji,Thomas,21/04/2024,"Davi, Luis",Nicole,Annes,Bernardo
Escala Dominical,Leandro,Bernardo,28/04/2024,"André, Lorena, Raul, Simon",Sonia,,Bernardo
Escala Dominical,Thomas,Yuji,26/05/2024,"André, Antony, Luis",Sonia,Antony,Rachel
Escala Dominical,Rachel,Natanael,09/06/2024,"Lorena, Luis",Nicole,Sigrid,Ziel
Escala Dominical,Leandro,Bernardo,07/07/2024,"Giovana, Simon",Luana,Marysol,Lucas
Escala Dominical,Natanel,Rachel,14/07/2024,"André, Antony, Davi, In",Tati,Ian,Davi
Escala Dominical,Thomas,Yuji,04/08/2024,"Antony, Simon",Tati,Priscila,Bernardo
Escala Dominical,Bernardo,Leandro,11/08/2024,"André, Giovana",Sonia,Mateus,Bernardo
Escala Dominical,Rachel,Bernardo,18/08/2024,"André, Antony, Davi, In",Luana,Joel,Davi Lin
Escala Dominical,Ian,Lucas,25/08/2024,"André, Giovana, Luis, Simon",Nicole,Juliana Carvalho,Bernardo
Escala Dominical,Tche,Davi Jung,01/09/2024,"André, Luis",Tati,Christiane,Bernardo
Escala Dominical,Rachel,Natanael,12/01/2025,,Sonia,Andre Chen,Lucas Cruz
Escala Dominical,Yuji,Thomas,08/09/2024,"Antony, Giovana, Simon",Nicole,Silmara,Lucas
Escala Dominical,Leandro,Bernardo,15/09/2024,"André, Davi, In",Luana,Fernanda,Leandro
Escala Dominical,Natanel,Rachel,22/09/2024,"André, Giovana",Nicole,Thais,Rachel
Escala Dominical,Davi Jung,Tche Paulo,06/10/2024,André,Luana,Wilson,Ricardo Bitun
Escala Dominical,Lucas,Ian,29/09/2024,"André, Luis, Simon",Sonia,Quezia,Davi
Escala Dominical,Thomas,Yuji,13/10/2024,"Davi, Luis",Tati,Carina,Juliano Son
Escala Dominical,Ian,Lucas,03/11/2024,Davi,Tati,Gustavo Barros,Gustavo Bacha
Escala Dominical,Rachel,Natanael,27/10/2024,"Davi, Giovana, In",Sonia,Tati,Paulo Cappelletti
Escala Dominical,Bernardo,Leandro,20/10/2024,"André, Antony, Giovana, Luis",Nicole,Janete,Linda Lee
Escala Dominical,Tche,Davi Jung,10/11/2024,"André, Antony, Luis",Nicole,Julia Laforgia,Davi
Escala Dominical,Yuji,Thomas,17/11/2024,"Davi, In",Tati,Filip,Rachel
Escala Dominical,Leandro,Bernardo,24/11/2024,"André, Giovana, Luis",Sonia,Davi Liu,Natanael
Escala Dominical,Natanel,Rachel,01/12/2024,,Tati,Davi,Bernardo
Escala Dominical,Thomas,Yuji,22/12/2024,,Sonia,Luan,Bernardo
Escala Dominical,Bernardo,Leandro,05/01/2025,,Tati,Thais,Bernardo
Escala Dominical,Lucas,Ian,08/12/2024,,Nicole,Aline Cho,Bernardo
Escala Dominical,Davi Jung,Tche Paulo,15/12/2024,Davi,Luana,David Shin,Bernardo
Escala Dominical,Lucas,Ian,21/07/2024,"André, Luis, Simon",Sonia,Gabriel Teixeira,Rachel
Escala Dominical,Davi Jung,Leandro,28/07/2024,"Davi, Luis",Nicole,Karina Di Carlo,Lucas
Escala Dominical,Yuji,Thomas,02/02/2025,,Sonia,Fernando Azevedo,Leandro
Escala Dominical,Tche,Davi Jung,26/01/2025,"André, Davi, Luis",Fabi,Yuji,Davi
Escala Dominical,Ian,Lucas,19/01/2025,"André, Antony, In",Luana,Gabriel Freitas,Lucas Cruz
Escala Dominical,Leandro,Bernardo,09/02/2025,Davi,Fabi,Gabriel Colucci,Bernardo
Escala Dominical,Natanael,Rachel,16/02/2025,"Antony, In, Simon",Luana,André Choi,Bernardo
Escala Dominical,Lucas Cruz,Ian,23/02/2025,"André, Luis, Simon",Tati,Sarah Jung,Bernardo
Escala Dominical,Davi T,Tche Paulo,02/03/2025,,,Sarah Souza,Ziel
Escala Dominical,Bernardo,Leandro,16/03/2025,"In, Simon",Sonia,Pedro,Rachel
Escala Dominical,Rachel,Natanael,23/03/2025,"André, Antony",Luana,Eliana,Davi
Escala Dominical,Ian,Lucas Cruz,30/03/2025,"Davi, Luis",Tati,Annes,Leandro
Escala Dominical,Nicole,Ricardo,06/04/2025,"André, Antony, In",Fabi,Esther Yang,Bernardo
Escala Dominical,Tche Paulo,Davi T,13/04/2025,"In, Simon",Sonia,Giovanna,Bernardo
Escala Dominical,Yuji,Thomas,20/04/2025,Davi,Fabi,Diana,Bernardo
Escala Dominical,Leandro,Bernardo,27/04/2025,"André, Davi, Luis, Simon",Tati,Eduardo,Lucas Cruz
Escala Dominical,Natanael,Rachel,04/05/2025,Davi,Fabi,Luana,Lucas Cruz
Escala Dominical,Lucas Cruz,Ian,11/05/2025,André,Douglas,Roberta,Rachel
Escala Dominical,Ricardo,Nicole,18/05/2025,Davi,Luana,Maryson,Leandro
Escala Dominical,Davi T,Tche Paulo,25/05/2025,André,Tati,Juliana Floreano,Davi
Escala Dominical,Thomas,Yuji,01/06/2025,Davi,Sonia,Sigrid,Bernardo
Escala Dominical,Bernardo,Leandro,08/06/2025,André,Ana,Karina,Bernardo
Escala Dominical,Ian,Natanael,15/06/2025,Davi,Luana,Gabriel Teixeira,Bernardo
Escala Dominical,Nicole,Ricardo,22/06/2025,André,Douglas,Antony,Bernardo
Escala Dominical,Tche Paulo,Davi T,29/06/2025,Davi,Tati,Raissa,Lucas Cruz
Escala Dominical,Yuji,Thomas,06/07/2025,,,Ana Felix,Lucas Cruz
Escala Dominical,Leandro,Bernardo,13/07/2025,,,,Davi
Escala Dominical,Natanael,Ian,20/07/2025,,,Juliana Carvalho,Leandro
Escala Dominical,Ricardo,Nicole,27/07/2025,,,Joel,Lucas Cruz
Escala Dominical,Davi T,Tche Paulo,03/08/2025,"André, Simon",Sonia,Priscila,Bernardo
Escala Dominical,Thomas,Yuji,10/08/2025,"Davi, Luis",Fabi,Sae Won,Bernardo
Escala Dominical,Bernardo,Leandro,17/08/2025,"André, Antony, In, Simon",Tati,Christiane,Bernardo
Escala Dominical,Ian,Natanael,24/08/2025,"André, Davi, Luis",Luana,Estefano,Bernardo
Escala Dominical,Nicole,Ricardo,31/08/2025,"In, Simon",Douglas,Thais Novaes,Lucas Cruz
Escala Dominical,Tche Paulo,Davi T,07/09/2025,André,,Ian,Davi
Escala Dominical,Yuji,Thomas,14/09/2025,Simon,,Lucas Cruz,Leandro
Escala Dominical,Leandro,Bernardo,21/09/2025,André,,Janete,Josimar Coelho
Escala Dominical,Natanael,Ian,28/09/2025,"André, Davi, Luis",,Alyson,Paulo Cappelletti
Escala Dominical,Ricardo,Nicole,05/10/2025,Simon,,Quezia,Nelson Bomilcar
Escala Dominical,Davi T,Tche Paulo,12/10/2025,André,,Wilson,Lucas Cruz
Escala Dominical,Thomas,Yuji,19/10/2025,André,,Gustavo Barros,Daniel Santos
Escala Dominical,Bernardo,Leandro,26/10/2025,André,,Julia Laforgia,Simon Kang
Escala Dominical,Ian,Natanael,02/11/2025,,,Leandro Novaes,Iain Provan
Escala Dominical,Nicole,Ricardo,09/11/2025,,,Davi Liu,Natanael
Escala Dominical,Tche Paulo,Davi T,16/11/2025,,,Matheus,Bernardo
Escala Dominical,Yuji,Thomas,23/11/2025,,,Thais Novaes,Bernardo
Escala Dominical,Leandro,Bernardo,30/11/2025,,,Juliane,Davi
Escala Dominical,Natanael,Ian,07/12/2025,,,Sarah Sousa,Bernardo
Escala Dominical,Ricardo,Nicole,14/12/2025,,,,Bernardo
Escala Dominical,Thomas,Yuji,21/12/2025,,,Ian,Bernardo
Escala Dominical,Thomas,Yuji,09/03/2025,Davi,Fabi,Silmara,Lucas Cruz
Escala Dominical,Nicole,Ricardo,04/01/2026,"Luis, Simon",Ana,André Choi,Bernardo
Escala Dominical,Tche Paulo,Guilherme Bevilacqua,18/01/2026,"André, Luis",Tati,Marissol,Leandro
Escala Dominical,Ian,Natanael,11/01/2026,"André, Davi, In",Luana,Andre Chen,Josimar Coelho
Escala Dominical,Yuji,Thomas,25/01/2026,"André, Davi",Dani,John,Pedro Feniman
Escala Dominical,Leandro,Bernardo,01/02/2026,"André, In",Dani,Annes,Nelson Bomilcar
Escala Dominical,Natanael,Ian,08/02/2026,"André, Davi",Tati,Sarah Jung,Bernardo
Escala Dominical,Ricardo,Nicole,15/02/2026,,,Thais Novaes,Ziel
Escala Dominical,Guilherme Bevilacqua,Tche Paulo,22/02/2026,"Davi, Luis",Luana,Aline Chung,Bernardo
Escala Dominical,Yuji,Thomas,05/04/2026,,,Thais Novaes,Djair Dias
Escala Dominical,Bernardo,Leandro,08/03/2026,,,Carol Pang,Bernardo
Escala Dominical,Ian,Natanael,15/03/2026,,,Rachel Sousa,Ricardo
Escala Dominical,Nicole,Ricardo,22/03/2026,,,Daniela Lee,Paulo Cappelletti
Escala Dominical,Tche Paulo,Guilherme Bevilacqua,29/03/2026,,,Filippe Lyra,Estevan Kirschner
Escala Dominical,Thomas,Yuji,01/03/2026,,,Daniel Pang,Bernardo
Escala Dominical,Ricardo,Nicole,26/04/2026,,,,Bernardo
Escala Dominical,Leandro,Bernardo,12/04/2026,,,Eduardo,Bernardo
Escala Dominical,Natanael,Ian,19/04/2026,,,,Bernardo
Escala Dominical,Guilherme Bevilacqua,Tche Paulo,03/05/2026,,,,Bernardo
Escala Dominical,Thomas,Yuji,10/05/2026,,,Eliana,Daniel Pang
Escala Dominical,Bernardo,Leandro,17/05/2026,,,,Nelson Bomilcar
Escala Dominical,Ian,Natanael,24/05/2026,,,,Natanael
Escala Dominical,Nicole,Ricardo,31/05/2026,,,,Karen Bomilcar
Escala Dominical,Tche Paulo,Guilherme Bevilacqua,07/06/2026,,,,Bernardo
Escala Dominical,Yuji,Thomas,14/06/2026,,,,Bernardo
Escala Dominical,Leandro,Bernardo,21/06/2026,,,,Bernardo
Escala Dominical,Natanael,Ian,28/06/2026,,,,Bernardo`.split("\n");

const items = [];

for (const line of CSV_ROWS) {
  // Parse CSV simples (com campos entre aspas)
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { fields.push(current); current = ""; continue; }
    current += ch;
  }
  fields.push(current);

  const [notas, aberturaRaw, confissaoRaw, dataRaw, louvorRaw, multimidiaRaw, oracaoRaw, pregadorRaw] = fields;

  const data = parseDate(dataRaw?.trim());
  if (!data) continue;

  const abertura = resolvepessoa(aberturaRaw);
  const confissao = resolvepessoa(confissaoRaw);
  const pregador = resolvepessoa(pregadorRaw);
  const oracao = resolvepessoa(oracaoRaw);
  const multimidia = resolvepessoa(multimidiaRaw);

  // Louvor: lista separada por vírgula
  let louvor = undefined;
  if (louvorRaw?.trim()) {
    const nomes = louvorRaw.split(",").map(n => n.trim()).filter(Boolean);
    const ids = nomes.map(n => resolvepessoa(n)).filter(id => id && !id.startsWith("custom:"));
    if (ids.length > 0) louvor = ids;
  }

  items.push({
    data,
    abertura: abertura || undefined,
    confissao: confissao || undefined,
    pregador: pregador || undefined,
    oracao: oracao || undefined,
    multimidia: multimidia || undefined,
    louvor,
  });
}

// Executar em batches de 20 (limites do Convex)
const BATCH_SIZE = 20;
const isProd = process.argv.includes("--prod");
console.log(`Importando ${items.length} domingos${isProd ? " (PROD)" : " (DEV)"}...`);

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  const args = JSON.stringify({ items: batch });
  const cmdArgs = ["convex", "run", "escalas/importEscalas:importar", args];
  if (isProd) cmdArgs.push("--prod");

  try {
    const result = execFileSync("npx", cmdArgs, { encoding: "utf-8", timeout: 120000 });
    console.log(`Batch ${Math.floor(i/BATCH_SIZE)+1}: ${result.trim()}`);
  } catch (e) {
    console.error(`Batch ${Math.floor(i/BATCH_SIZE)+1} erro:`, e.message?.slice(0, 300));
  }
}

console.log("Concluído!");
