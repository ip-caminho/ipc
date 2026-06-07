import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { requireAnyPermission } from "../_shared/requirePermission";

// Permissoes aceitas por pasta de upload. Pasta fora do mapa = upload negado
// (novo fluxo de upload deve registrar a pasta aqui).
const FOLDER_PERMISSIONS: Record<string, string[]> = {
  "gravacoes-audio": ["gravacoes:create", "gravacoes:update"],
  "membros/fotos": ["membros:create", "membros:update", "membros:self_service"],
  "educacional/fotos": ["educacional:write", "criancas:manage"],
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
