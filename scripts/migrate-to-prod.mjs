#!/usr/bin/env node

/**
 * Script de migração: Convex Dev → Prod
 * Usa ConvexHttpClient para evitar problemas de shell escaping.
 *
 * Pré-requisitos:
 * 1. npx convex deploy (código de migração em ambos deployments)
 * 2. Backups feitos
 * 3. Prod restaurado ao estado limpo (backup)
 *
 * Uso: node scripts/migrate-to-prod.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const require = createRequire(join(projectRoot, "package.json"));
const { ConvexHttpClient } = require("convex/browser");
const { api } = require(join(projectRoot, "convex/_generated/api"));

const DEV_URL = "https://usable-sockeye-77.convex.cloud";
const PROD_URL = "https://earnest-husky-324.convex.cloud";
const ANDRE_WHATSAPP_PATTERNS = ["11942088102", "+5511942088102", "5511942088102"];

const dev = new ConvexHttpClient(DEV_URL);
const prod = new ConvexHttpClient(PROD_URL);

// Mapa de IDs: devId → prodId
const idMap = new Map();

// --- Helpers ---

function remapId(devId) {
  if (!devId) return devId;
  const mapped = idMap.get(devId);
  if (!mapped) {
    // Silenciar warnings repetidos
    return undefined;
  }
  return mapped;
}

function stripSystemFields(doc) {
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}

function isAndre(e) {
  return ANDRE_WHATSAPP_PATTERNS.includes(e.whatsapp) || e.nomeCompleto?.includes("André Young Hoon");
}

// --- Leitura ---

async function readTable(client, table) {
  try {
    return await client.query(api.migration.queries.readTable, { table });
  } catch (err) {
    console.error(`  ❌ ${table}: erro ao ler (${err.message?.slice(0, 80)})`);
    return [];
  }
}

async function insertDoc(table, doc) {
  try {
    return await prod.mutation(api.migration.mutations.insertDoc, { table, doc });
  } catch (err) {
    console.error(`  ❌ Erro insert ${table}: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

async function patchDoc(id, patch) {
  try {
    await prod.mutation(api.migration.mutations.patchDoc, { id, patch });
    return true;
  } catch (err) {
    console.error(`  ❌ Erro patch ${id}: ${err.message?.slice(0, 100)}`);
    return false;
  }
}

// --- Fases ---

async function fase1_lerDev() {
  console.log("\n=== FASE 1: Lendo dados do dev ===");
  const tables = {};
  const tableNames = [
    "entidades", "membros", "serieGravacoes", "gravacoes",
    "comentariosGravacao", "reacoesGravacao", "escutasGravacao",
    "cultos", "cultoEscalas", "equipeMembros", "indisponibilidades",
    "funcoes", "pequenosGrupos", "pgMembros",
    "visitasPastorais", "pedidosOracao", "pedidoOracaoComentarios",
    "pedidoOracaoIntercessores", "anotacoesPastorais",
    "avisos", "ministerios", "ministerioMembros", "ministerioEscalas",
    "criancaPerfil", "responsaveis", "eduRelatorios", "eduPresencas",
    "louvores", "calendarioEventos", "salas", "reservas",
    "modulos", "rolePermissions", "preferencias",
    "sysNotifications", "sysNotificationReads",
    "membroConvites",
  ];

  for (const table of tableNames) {
    tables[table] = await readTable(dev, table);
    console.log(`  ${table}: ${tables[table].length} docs`);
  }
  return tables;
}

async function fase1_lerProd() {
  console.log("\n=== FASE 1b: Lendo estado do prod ===");

  const prodEntidades = await readTable(prod, "entidades");
  const prodMembros = await readTable(prod, "membros");
  const prodPreferencias = await readTable(prod, "preferencias");
  const prodFuncoes = await readTable(prod, "funcoes");
  const prodModulos = await readTable(prod, "modulos");
  const prodRolePermissions = await readTable(prod, "rolePermissions");

  const andreEntidade = prodEntidades.find(isAndre);
  const andreMembro = andreEntidade
    ? prodMembros.find((m) => m.entidadeId === andreEntidade._id)
    : null;

  console.log(`  Andre entidade prod: ${andreEntidade?._id || "NÃO ENCONTRADO"}`);
  console.log(`  Andre membro prod: ${andreMembro?._id || "NÃO ENCONTRADO"}`);

  return { andreEntidade, andreMembro, prodPreferencias, prodFuncoes, prodModulos, prodRolePermissions };
}

async function fase2_tabelasIndependentes(devData, prodState) {
  console.log("\n=== FASE 2: Tabelas independentes ===");

  // --- Entidades ---
  console.log("\n  [entidades]");
  const devAndreEntidade = devData.entidades.find(isAndre);
  let inserted = 0, patched = 0, errors = 0;

  for (const ent of devData.entidades) {
    if (devAndreEntidade && ent._id === devAndreEntidade._id) {
      if (prodState.andreEntidade) {
        const patch = stripSystemFields(ent);
        await patchDoc(prodState.andreEntidade._id, patch);
        idMap.set(ent._id, prodState.andreEntidade._id);
        patched++;
      }
      continue;
    }
    const doc = stripSystemFields(ent);
    const newId = await insertDoc("entidades", doc);
    if (newId) {
      idMap.set(ent._id, newId);
      inserted++;
    } else {
      errors++;
    }
  }
  console.log(`    ${inserted} inseridas, ${patched} patch, ${errors} erros`);

  // --- Merge tables (funcoes, modulos, rolePermissions, preferencias) ---
  const merges = [
    { table: "funcoes", key: "slug", prodData: prodState.prodFuncoes },
    { table: "modulos", key: "slug", prodData: prodState.prodModulos },
    { table: "rolePermissions", key: "role", prodData: prodState.prodRolePermissions },
    { table: "preferencias", key: "chave", prodData: prodState.prodPreferencias },
  ];

  for (const { table, key, prodData } of merges) {
    console.log(`\n  [${table}]`);
    const prodByKey = new Map(prodData.map((d) => [d[key], d]));
    let ins = 0, skip = 0;
    for (const doc of devData[table]) {
      const existing = prodByKey.get(doc[key]);
      if (existing) {
        idMap.set(doc._id, existing._id);
        skip++;
      } else {
        const clean = stripSystemFields(doc);
        if (clean.atualizadoPor) clean.atualizadoPor = undefined;
        const newId = await insertDoc(table, clean);
        if (newId) idMap.set(doc._id, newId);
        ins++;
      }
    }
    console.log(`    ${ins} inseridas, ${skip} existentes`);
  }

  // --- Tabelas sem FK ---
  for (const table of ["serieGravacoes", "salas", "louvores", "ministerios"]) {
    console.log(`\n  [${table}]`);
    let count = 0;
    for (const doc of devData[table]) {
      const clean = stripSystemFields(doc);
      const newId = await insertDoc(table, clean);
      if (newId) {
        idMap.set(doc._id, newId);
        count++;
      }
    }
    console.log(`    ${count} inseridas`);
  }
}

async function fase3_membros(devData, prodState) {
  console.log("\n=== FASE 3: Membros ===");

  const devAndreEntidade = devData.entidades.find(isAndre);
  const devAndreMembro = devAndreEntidade
    ? devData.membros.find((m) => m.entidadeId === devAndreEntidade._id)
    : null;

  let inserted = 0, patched = 0, skipped = 0;

  for (const membro of devData.membros) {
    if (devAndreMembro && membro._id === devAndreMembro._id) {
      if (prodState.andreMembro) {
        const patch = stripSystemFields(membro);
        delete patch.entidadeId;
        delete patch.userId;
        patch.role = "admin";
        await patchDoc(prodState.andreMembro._id, patch);
        idMap.set(membro._id, prodState.andreMembro._id);
        patched++;
      }
      continue;
    }

    const doc = stripSystemFields(membro);
    doc.entidadeId = remapId(membro.entidadeId);
    if (!doc.entidadeId) { skipped++; continue; }
    if (doc.conjugeId) doc.conjugeId = remapId(doc.conjugeId);
    delete doc.userId;
    const newId = await insertDoc("membros", doc);
    if (newId) { idMap.set(membro._id, newId); inserted++; }
  }
  console.log(`  ${inserted} inseridos, ${patched} patch, ${skipped} pulados (sem entidade)`);
}

async function fase4_dependentesMembros(devData) {
  console.log("\n=== FASE 4: Tabelas dependentes de membros ===");

  // Gravações
  console.log("\n  [gravacoes]");
  let count = 0;
  for (const doc of devData.gravacoes) {
    const clean = stripSystemFields(doc);
    if (clean.pregadorId) clean.pregadorId = remapId(clean.pregadorId);
    if (clean.iaProcessadoPor) clean.iaProcessadoPor = remapId(clean.iaProcessadoPor);
    if (clean.serieId) clean.serieId = remapId(clean.serieId);
    const newId = await insertDoc("gravacoes", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Cultos (sem FK para membros)
  console.log("\n  [cultos]");
  count = 0;
  for (const doc of devData.cultos) {
    const clean = stripSystemFields(doc);
    const newId = await insertDoc("cultos", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Edu relatórios (sem FK)
  console.log("\n  [eduRelatorios]");
  count = 0;
  for (const doc of devData.eduRelatorios) {
    const clean = stripSystemFields(doc);
    const newId = await insertDoc("eduRelatorios", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Tabelas com remapeamento de membroId
  const membroTables = [
    { table: "equipeMembros", fields: ["membroId"] },
    { table: "indisponibilidades", fields: ["membroId"] },
    { table: "visitasPastorais", fields: ["membroId", "visitanteId"] },
    { table: "pedidosOracao", fields: ["membroId"] },
    { table: "anotacoesPastorais", fields: ["membroId", "autorId"] },
  ];

  for (const { table, fields } of membroTables) {
    console.log(`\n  [${table}]`);
    count = 0;
    for (const doc of devData[table]) {
      const clean = stripSystemFields(doc);
      let skip = false;
      for (const f of fields) {
        if (clean[f]) {
          clean[f] = remapId(clean[f]);
          if (!clean[f]) { skip = true; break; }
        }
      }
      if (skip) continue;
      const newId = await insertDoc(table, clean);
      if (newId) { idMap.set(doc._id, newId); count++; }
    }
    console.log(`    ${count} inseridas`);
  }

  // Avisos
  console.log("\n  [avisos]");
  count = 0;
  for (const doc of devData.avisos) {
    const clean = stripSystemFields(doc);
    if (clean.criadoPor) clean.criadoPor = remapId(clean.criadoPor);
    const newId = await insertDoc("avisos", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Pequenos Grupos
  console.log("\n  [pequenosGrupos]");
  count = 0;
  for (const doc of devData.pequenosGrupos) {
    const clean = stripSystemFields(doc);
    clean.liderId = remapId(clean.liderId);
    if (!clean.liderId) continue;
    if (clean.coliderId) clean.coliderId = remapId(clean.coliderId);
    const newId = await insertDoc("pequenosGrupos", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Ministério Membros
  console.log("\n  [ministerioMembros]");
  count = 0;
  for (const doc of devData.ministerioMembros) {
    const clean = stripSystemFields(doc);
    clean.ministerioId = remapId(clean.ministerioId);
    clean.membroId = remapId(clean.membroId);
    if (!clean.ministerioId || !clean.membroId) continue;
    const newId = await insertDoc("ministerioMembros", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Criança Perfil
  console.log("\n  [criancaPerfil]");
  count = 0;
  for (const doc of devData.criancaPerfil) {
    const clean = stripSystemFields(doc);
    clean.entidadeId = remapId(clean.entidadeId);
    if (!clean.entidadeId) continue;
    if (clean.ovelhinhaId) clean.ovelhinhaId = remapId(clean.ovelhinhaId);
    const newId = await insertDoc("criancaPerfil", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Responsáveis
  console.log("\n  [responsaveis]");
  count = 0;
  for (const doc of devData.responsaveis) {
    const clean = stripSystemFields(doc);
    clean.criancaEntidadeId = remapId(clean.criancaEntidadeId);
    clean.responsavelEntidadeId = remapId(clean.responsavelEntidadeId);
    if (!clean.criancaEntidadeId || !clean.responsavelEntidadeId) continue;
    const newId = await insertDoc("responsaveis", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Convites
  console.log("\n  [membroConvites]");
  count = 0;
  for (const doc of devData.membroConvites) {
    const clean = stripSystemFields(doc);
    if (clean.criadoPor) clean.criadoPor = remapId(clean.criadoPor);
    const newId = await insertDoc("membroConvites", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Notificações
  console.log("\n  [sysNotifications]");
  count = 0;
  for (const doc of devData.sysNotifications) {
    const clean = stripSystemFields(doc);
    if (clean.destinatarioId) clean.destinatarioId = remapId(clean.destinatarioId);
    const newId = await insertDoc("sysNotifications", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Reservas
  console.log("\n  [reservas]");
  count = 0;
  for (const doc of devData.reservas) {
    const clean = stripSystemFields(doc);
    clean.salaId = remapId(clean.salaId);
    clean.membroId = remapId(clean.membroId);
    if (!clean.salaId || !clean.membroId) continue;
    const newId = await insertDoc("reservas", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Eventos
  console.log("\n  [calendarioEventos]");
  count = 0;
  for (const doc of devData.calendarioEventos) {
    const clean = stripSystemFields(doc);
    if (clean.ministerioId) clean.ministerioId = remapId(clean.ministerioId);
    const newId = await insertDoc("calendarioEventos", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);
}

async function fase5_dependentesSegundoNivel(devData) {
  console.log("\n=== FASE 5: Tabelas de segundo nível ===");

  // Comentários (self-reference)
  console.log("\n  [comentariosGravacao]");
  const roots = devData.comentariosGravacao.filter((c) => !c.parentId);
  const replies = devData.comentariosGravacao.filter((c) => c.parentId);
  let count = 0;
  for (const doc of roots) {
    const clean = stripSystemFields(doc);
    clean.gravacaoId = remapId(clean.gravacaoId);
    clean.membroId = remapId(clean.membroId);
    if (!clean.gravacaoId || !clean.membroId) continue;
    const newId = await insertDoc("comentariosGravacao", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  for (const doc of replies) {
    const clean = stripSystemFields(doc);
    clean.gravacaoId = remapId(clean.gravacaoId);
    clean.membroId = remapId(clean.membroId);
    clean.parentId = remapId(clean.parentId);
    if (!clean.gravacaoId || !clean.membroId) continue;
    const newId = await insertDoc("comentariosGravacao", clean);
    if (newId) { idMap.set(doc._id, newId); count++; }
  }
  console.log(`    ${count} inseridas`);

  // Tabelas com 2 FKs
  const twoFkTables = [
    { table: "reacoesGravacao", fk1: "gravacaoId", fk2: "membroId" },
    { table: "escutasGravacao", fk1: "gravacaoId", fk2: "membroId" },
    { table: "cultoEscalas", fk1: "cultoId", fk2: "membroId" },
    { table: "pgMembros", fk1: "pgId", fk2: "membroId" },
    { table: "pedidoOracaoComentarios", fk1: "pedidoId", fk2: "membroId" },
    { table: "pedidoOracaoIntercessores", fk1: "pedidoId", fk2: "membroId" },
    { table: "sysNotificationReads", fk1: "notificationId", fk2: "membroId" },
  ];

  for (const { table, fk1, fk2 } of twoFkTables) {
    console.log(`\n  [${table}]`);
    count = 0;
    for (const doc of devData[table]) {
      const clean = stripSystemFields(doc);
      clean[fk1] = remapId(clean[fk1]);
      // membroId pode ser opcional em cultoEscalas (pregador externo)
      if (clean[fk2]) clean[fk2] = remapId(clean[fk2]);
      if (!clean[fk1]) continue;
      const newId = await insertDoc(table, clean);
      if (newId) { idMap.set(doc._id, newId); count++; }
    }
    console.log(`    ${count} inseridas`);
  }

  // Edu presenças
  console.log("\n  [eduPresencas]");
  count = 0;
  for (const doc of devData.eduPresencas) {
    const clean = stripSystemFields(doc);
    clean.relatorioId = remapId(clean.relatorioId);
    clean.criancaEntidadeId = remapId(clean.criancaEntidadeId);
    if (!clean.relatorioId || !clean.criancaEntidadeId) continue;
    await insertDoc("eduPresencas", clean);
    count++;
  }
  console.log(`    ${count} inseridas`);

  // Ministério escalas (array de membros)
  console.log("\n  [ministerioEscalas]");
  count = 0;
  for (const doc of devData.ministerioEscalas) {
    const clean = stripSystemFields(doc);
    clean.ministerioId = remapId(clean.ministerioId);
    if (!clean.ministerioId) continue;
    if (clean.membros && Array.isArray(clean.membros)) {
      clean.membros = clean.membros.map((m) => ({
        ...m,
        membroId: remapId(m.membroId),
      })).filter((m) => m.membroId);
    }
    await insertDoc("ministerioEscalas", clean);
    count++;
  }
  console.log(`    ${count} inseridas`);
}

// --- Main ---

async function main() {
  console.log("🔄 Migração Dev → Prod (ConvexHttpClient)");
  console.log("=".repeat(50));

  const devData = await fase1_lerDev();
  const prodState = await fase1_lerProd();

  await fase2_tabelasIndependentes(devData, prodState);
  await fase3_membros(devData, prodState);
  await fase4_dependentesMembros(devData);
  await fase5_dependentesSegundoNivel(devData);

  console.log("\n" + "=".repeat(50));
  console.log("✅ Migração concluída!");
  console.log(`IDs mapeados: ${idMap.size}`);

  const summary = [
    "entidades", "membros", "gravacoes", "cultos", "louvores",
    "ministerios", "pequenosGrupos", "avisos", "criancaPerfil",
    "cultoEscalas", "equipeMembros", "pedidosOracao",
  ];
  console.log("\nResumo:");
  for (const table of summary) {
    console.log(`  ${table}: ${devData[table]?.length || 0} no dev`);
  }
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
