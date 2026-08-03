// Resolucao de bucket/URL do B2 — SEM o SDK da AWS, para poder ser importado
// por mutations/queries no runtime V8 (ex: public/retiro.ts) sem arrastar
// @aws-sdk/client-s3 para o bundle. O que precisa do SDK fica em helpers.ts.

export type BucketKey = "publico" | "privado";

export const CDN_BASE = "https://cdn.yhc.com.br";

// Host das URLs legadas (bucket publico antes do CDN).
const LEGACY_B2_HOST_FRAGMENT = ".backblazeb2.com";

/**
 * Pasta -> bucket. Pasta fora do mapa NAO sobe (fail-closed): toda categoria
 * nova de arquivo precisa ser registrada aqui, escolhendo explicitamente entre
 * o bucket aberto e o fechado. As chaves espelham FOLDER_PERMISSIONS (authz.ts).
 */
export const FOLDER_BUCKET: Record<string, BucketKey> = {
  // Aberto: pode ser servido publicamente pelo CDN.
  "gravacoes-audio": "publico",
  "biblioteca-capas": "publico",
  // Fechado: dado pessoal / documento. Leitura so via URL assinada.
  "membros/fotos": "privado",
  "membros/cartas-transferencia": "privado",
  "educacional/fotos": "privado",
  "educacional/certificados-cac": "privado",
  "retiro-comprovantes": "privado",
};

export function getBucketName(bucketKey: BucketKey): string {
  if (bucketKey === "publico") {
    const nome = process.env.BACKBLAZE_BUCKET_PUBLICO || process.env.BACKBLAZE_BUCKET_NAME;
    if (!nome) throw new Error("BACKBLAZE_BUCKET_PUBLICO nao configurado");
    return nome;
  }
  const privado = process.env.BACKBLAZE_BUCKET_PRIVADO;
  if (privado) return privado;
  // Transicao: enquanto o bucket fechado nao existir, cai no aberto para nao
  // derrubar upload em producao. Some quando BACKBLAZE_BUCKET_PRIVADO for setada.
  console.warn(
    "[files] BACKBLAZE_BUCKET_PRIVADO ausente — arquivo privado indo para o bucket publico",
  );
  return getBucketName("publico");
}

/** True enquanto o bucket fechado ainda nao foi provisionado. */
export function privadoIndisponivel(): boolean {
  return !process.env.BACKBLAZE_BUCKET_PRIVADO;
}

/**
 * Deriva a pasta registrada a partir da chave do objeto. Casa o prefixo mais
 * longo, porque ha pastas de um nivel (gravacoes-audio) e de dois
 * (membros/fotos).
 */
export function folderFromKey(key: string): string | null {
  let match: string | null = null;
  for (const folder of Object.keys(FOLDER_BUCKET)) {
    if (key.startsWith(folder + "/") && (!match || folder.length > match.length)) {
      match = folder;
    }
  }
  return match;
}

/**
 * Bucket de destino de uma chave. Lanca se a pasta nao estiver registrada —
 * e a garantia de que arquivo novo nunca cai no bucket errado por esquecimento.
 */
export function bucketForKey(key: string): BucketKey {
  const folder = folderFromKey(key);
  if (!folder) {
    throw new Error(
      `Pasta nao registrada para "${key}" — registre em FOLDER_BUCKET (convex/files/urls.ts)`,
    );
  }
  return FOLDER_BUCKET[folder];
}

export function generateObjectKey(folder: string, entityId: string, extension: string): string {
  const timestamp = Date.now();
  return `${folder}/${entityId}_${timestamp}.${extension}`;
}

/** URL publica via CDN (so vale para o bucket aberto). */
export function getPublicUrl(key: string): string {
  return `${CDN_BASE}/${key}`;
}

/** URL canonica do bucket fechado — nao assinada, e o que fica salvo no banco. */
export function getPrivateCanonicalUrl(key: string): string {
  const endpoint = process.env.BACKBLAZE_ENDPOINT;
  if (!endpoint) throw new Error("BACKBLAZE_ENDPOINT nao configurado");
  return `https://${endpoint}/${getBucketName("privado")}/${key}`;
}

/**
 * URL a persistir no banco conforme o bucket da chave. Enquanto o bucket
 * fechado nao existir, tudo continua saindo como URL do CDN — assim subir este
 * backend antes de provisionar a infra nao muda nada do comportamento atual.
 */
export function getStorageUrl(key: string): string {
  if (bucketForKey(key) === "publico" || privadoIndisponivel()) return getPublicUrl(key);
  return getPrivateCanonicalUrl(key);
}

/**
 * Identifica bucket + chave de uma URL salva. Formatos aceitos:
 *  - CDN:            https://cdn.yhc.com.br/<key>
 *  - S3 path-style:  https://<BACKBLAZE_ENDPOINT>/<bucket>/<key>
 *  - Legado B2:      https://f005.backblazeb2.com/file/<bucket>/<key>
 * Host desconhecido (ex: storage.tally.so) devolve null — quem chama decide
 * (o signing faz passthrough, a migracao pula).
 */
export function parseFileUrl(url: string): { bucketKey: BucketKey; key: string } | null {
  if (!url) return null;

  if (url.startsWith(CDN_BASE + "/")) {
    return { bucketKey: "publico", key: url.substring(CDN_BASE.length + 1) };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/^\//, "");

  // Legado: /file/<bucket>/<key> (so o bucket aberto tem URLs nesse formato)
  if (parsed.hostname.endsWith(LEGACY_B2_HOST_FRAGMENT) && path.startsWith("file/")) {
    const semPrefixo = path.substring("file/".length);
    const barra = semPrefixo.indexOf("/");
    if (barra === -1) return null;
    return bucketPorNome(semPrefixo.substring(0, barra), semPrefixo.substring(barra + 1));
  }

  // Path-style no endpoint S3: <bucket>/<key>
  const endpoint = process.env.BACKBLAZE_ENDPOINT;
  if (endpoint && parsed.hostname === endpoint) {
    const barra = path.indexOf("/");
    if (barra === -1) return null;
    return bucketPorNome(path.substring(0, barra), path.substring(barra + 1));
  }

  return null;
}

function bucketPorNome(
  nome: string,
  key: string,
): { bucketKey: BucketKey; key: string } | null {
  if (!key) return null;
  const publico = process.env.BACKBLAZE_BUCKET_PUBLICO || process.env.BACKBLAZE_BUCKET_NAME;
  const privado = process.env.BACKBLAZE_BUCKET_PRIVADO;
  if (privado && nome === privado) return { bucketKey: "privado", key };
  if (publico && nome === publico) return { bucketKey: "publico", key };
  return null;
}

/** Normaliza URL do bucket aberto para o CDN. Sem efeito no bucket fechado. */
export function toCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE)) return url;
  const parsed = parseFileUrl(url);
  if (parsed?.bucketKey === "publico") return `${CDN_BASE}/${parsed.key}`;
  return url;
}
