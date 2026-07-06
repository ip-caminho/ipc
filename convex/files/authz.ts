import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { requireAnyPermission } from "../_shared/requirePermission";

// Permissoes aceitas por pasta de upload. Pasta fora do mapa = upload negado
// (novo fluxo de upload deve registrar a pasta aqui).
const FOLDER_PERMISSIONS: Record<string, string[]> = {
  "gravacoes-audio": ["gravacoes:create", "gravacoes:update"],
  "membros/fotos": ["membros:create", "membros:update", "membros:self_service"],
  "membros/cartas-transferencia": ["membros:create", "membros:update", "rol:update"],
  "educacional/fotos": ["educacional:write", "criancas:manage"],
  "biblioteca-capas": ["biblioteca:create", "biblioteca:update"],
  // Comprovantes do retiro pela via LOGADA (secretaria ao registrar
  // recebimento). O pagante tambem envia sem login pelo link tokenizado —
  // esse caminho usa files.upload.getPublicComprovanteUploadUrl (validado
  // pelo token da inscricao), nao passa por aqui.
  "retiro-comprovantes": ["inscricoes:manage"],
};

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
