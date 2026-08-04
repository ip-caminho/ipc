import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery } from "../_generated/server";
import { requireAnyPermission } from "../_shared/requirePermission";
import { folderFromKey, parseFileUrl } from "./urls";

// Permissoes aceitas por pasta de upload. Pasta fora do mapa = upload negado
// (novo fluxo de upload deve registrar a pasta aqui E em FOLDER_BUCKET).
export const FOLDER_PERMISSIONS: Record<string, string[]> = {
  "gravacoes-audio": ["gravacoes:create", "gravacoes:update"],
  "membros/fotos": ["membros:create", "membros:update", "membros:self_service"],
  "membros/cartas-transferencia": ["membros:create", "membros:update", "rol:update"],
  "educacional/fotos": ["criancas:manage"],
  // Certificado CAC do voluntario: quem anexa e o gestor do educacional
  // (VoluntarioForm vive dentro da aba gateada por voluntarios_edu:manage).
  "educacional/certificados-cac": ["voluntarios_edu:manage"],
  "biblioteca-capas": ["biblioteca:create", "biblioteca:update"],
  // Comprovantes do retiro pela via LOGADA (secretaria ao registrar
  // recebimento). O pagante tambem envia sem login pelo link tokenizado —
  // esse caminho usa files.upload.getPublicComprovanteUploadUrl (validado
  // pelo token da inscricao), nao passa por aqui.
  "retiro-comprovantes": ["inscricoes:manage"],
  // Legado do acampamento (ver FOLDER_BUCKET em files/urls.ts). Nao ha fluxo
  // de upload novo aqui; fica registrado para os arquivos antigos seguirem
  // gerenciaveis e para os dois mapas continuarem espelhados.
  "acampamento-comprovantes": ["inscricoes:manage"],
};

/**
 * Quem pode LER cada pasta do bucket fechado. Sem isso, bastaria estar logado
 * para assinar qualquer arquivo — comprovante financeiro ou carta de
 * transferencia de terceiros incluidos.
 *
 * "autenticado" = qualquer sessao valida. Vale para foto de pessoa, que aparece
 * como avatar em praticamente toda tela do sistema.
 */
const FOLDER_READ_PERMISSIONS: Record<string, string[] | "autenticado"> = {
  "gravacoes-audio": "autenticado",
  "biblioteca-capas": "autenticado",
  "membros/fotos": "autenticado",
  "educacional/fotos": "autenticado",
  "membros/cartas-transferencia": ["membros:read", "rol:read", "rol:update"],
  "educacional/certificados-cac": ["voluntarios_edu:read", "voluntarios_edu:manage"],
  "retiro-comprovantes": ["inscricoes:manage"],
  "acampamento-comprovantes": ["inscricoes:manage"],
};

/**
 * Permissoes de leitura da chave. `null` = pasta nao registrada: nega, do mesmo
 * jeito que o upload nega pasta fora do FOLDER_BUCKET. Sem isso, bastaria estar
 * logado para assinar qualquer chave de pasta esquecida no mapa.
 */
export function readPermissionsForKey(key: string): string[] | "autenticado" | null {
  const folder = folderFromKey(key);
  if (!folder) return null;
  return FOLDER_READ_PERMISSIONS[folder] ?? null;
}

// Chamada pelo action getUploadUrl (Node) via runQuery — actions nao tem ctx.db.
export const checkUploadAccess = internalQuery({
  args: { folder: v.string() },
  handler: async (ctx, args) => {
    const allowed = FOLDER_PERMISSIONS[args.folder];
    if (!allowed) {
      throw new Error(`Upload nao permitido para a pasta "${args.folder}"`);
    }
    await requireAnyPermission(ctx, allowed);
    return true;
  },
});

/**
 * Diz, por URL, se este usuario pode ler. Devolve um array em vez de lancar:
 * uma tela costuma misturar avatar (qualquer autenticado) com documento
 * restrito, e lancar faria a tela inteira perder as imagens por causa de um
 * unico arquivo proibido.
 *
 * URL de host desconhecido (foto ainda no Tally) e bucket aberto passam — nao
 * ha nada nosso a proteger ali.
 */
export const checkReadAccess = internalQuery({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, args): Promise<boolean[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Uma checagem por conjunto de permissoes, nao por URL.
    const jaAvaliado = new Map<string, boolean>();
    const permitidas: boolean[] = [];

    for (const url of args.urls) {
      const parsed = parseFileUrl(url);
      if (!parsed || parsed.bucketKey === "publico") {
        permitidas.push(true);
        continue;
      }
      const perms = readPermissionsForKey(parsed.key);
      if (perms === "autenticado") {
        permitidas.push(true);
        continue;
      }
      if (perms === null) {
        permitidas.push(false);
        continue;
      }
      const chave = perms.join("|");
      if (!jaAvaliado.has(chave)) {
        try {
          await requireAnyPermission(ctx, perms);
          jaAvaliado.set(chave, true);
        } catch {
          jaAvaliado.set(chave, false);
        }
      }
      permitidas.push(jaAvaliado.get(chave)!);
    }

    return permitidas;
  },
});
