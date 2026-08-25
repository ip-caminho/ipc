"use client";

import { openDB, type IDBPDatabase } from "idb";

// IndexedDB local do app. Guarda o audio do sermao para ouvir sem rede
// (metro) e a fila de progresso de escuta que nao pode subir offline.
//
// Nada aqui e fonte de verdade: tudo pode ser apagado pelo browser a
// qualquer momento (iOS evicta storage de site nao usado em 7 dias, exceto
// se instalado na tela inicial). O servidor continua sendo o dono do dado.

const DB_NAME = "ipc-offline";
const DB_VERSION = 1;

export const STORE_META = "sermoesOffline";
export const STORE_BLOBS = "sermoesBlobs";
export const STORE_HEARTBEATS = "heartbeatsPendentes";

/** Quanto tempo um audio guardado sobrevive sem ser tocado. */
export const RETENCAO_DIAS = 7;

export interface SermaoOfflineMeta {
  gravacaoId: string;
  titulo: string;
  pregadorNome?: string;
  /** Data da gravacao (ISO yyyy-MM-dd), so para exibir na lista. */
  data?: string;
  /** Segundo do culto onde o blob comeca (0 = arquivo inteiro). */
  offsetSegundos: number;
  /** Duracao do trecho guardado, em segundos. */
  duracao: number;
  bytes: number;
  /** true = so o trecho (via Range); false = arquivo completo. */
  parcial: boolean;
  baixadoEm: number;
  /** Ultimo acesso — base da retencao. */
  usadoEm: number;
}

export interface HeartbeatPendente {
  gravacaoId: string;
  currentTime: number;
  duration: number;
  registradoEm: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function offlineSuportado(): boolean {
  return typeof indexedDB !== "undefined";
}

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "gravacaoId" });
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS);
        }
        if (!db.objectStoreNames.contains(STORE_HEARTBEATS)) {
          db.createObjectStore(STORE_HEARTBEATS, { keyPath: "gravacaoId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listarMetas(): Promise<SermaoOfflineMeta[]> {
  const db = await getDb();
  const metas = (await db.getAll(STORE_META)) as SermaoOfflineMeta[];
  return metas.sort((a, b) => b.baixadoEm - a.baixadoEm);
}

export async function lerBlob(gravacaoId: string): Promise<Blob | undefined> {
  const db = await getDb();
  return (await db.get(STORE_BLOBS, gravacaoId)) as Blob | undefined;
}

export async function salvarSermao(meta: SermaoOfflineMeta, blob: Blob): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_META, STORE_BLOBS], "readwrite");
  await Promise.all([
    tx.objectStore(STORE_META).put(meta),
    tx.objectStore(STORE_BLOBS).put(blob, meta.gravacaoId),
    tx.done,
  ]);
}

export async function removerSermao(gravacaoId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_META, STORE_BLOBS], "readwrite");
  await Promise.all([
    tx.objectStore(STORE_META).delete(gravacaoId),
    tx.objectStore(STORE_BLOBS).delete(gravacaoId),
    tx.done,
  ]);
}

/** Marca uso, adiando a expiracao. Falha em silencio (offline nao pode quebrar). */
export async function marcarUso(gravacaoId: string): Promise<void> {
  try {
    const db = await getDb();
    const meta = (await db.get(STORE_META, gravacaoId)) as SermaoOfflineMeta | undefined;
    if (!meta) return;
    await db.put(STORE_META, { ...meta, usadoEm: Date.now() });
  } catch {
    // ignora
  }
}

/** Apaga o que passou da retencao. Retorna os ids removidos. */
export async function limparExpirados(agora = Date.now()): Promise<string[]> {
  const limite = agora - RETENCAO_DIAS * 24 * 60 * 60 * 1000;
  const metas = await listarMetas();
  const expirados = metas.filter((m) => (m.usadoEm ?? m.baixadoEm) < limite);
  for (const m of expirados) await removerSermao(m.gravacaoId);
  return expirados.map((m) => m.gravacaoId);
}

// --- Fila de progresso de escuta ---
//
// Um registro por gravacao: o heartbeat do servidor e um upsert do ultimo
// segundo, entao guardar so o mais recente basta e mantem a fila minuscula.

export async function enfileirarHeartbeat(h: HeartbeatPendente): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_HEARTBEATS, h);
  } catch {
    // ignora
  }
}

export async function lerHeartbeatsPendentes(): Promise<HeartbeatPendente[]> {
  try {
    const db = await getDb();
    return (await db.getAll(STORE_HEARTBEATS)) as HeartbeatPendente[];
  } catch {
    return [];
  }
}

export async function limparHeartbeat(gravacaoId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_HEARTBEATS, gravacaoId);
  } catch {
    // ignora
  }
}
