import { GenericMutationCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

type MutationCtx = GenericMutationCtx<DataModel>;

const SKIP_FIELDS = new Set(["_id", "_creationTime"]);
const SENSITIVE_FIELDS = new Set(["cpf", "rg"]);

function maskSensitiveValue(field: string, value: any): any {
  if (!SENSITIVE_FIELDS.has(field) || typeof value !== "string") return value;
  if (value.length <= 4) return "***";
  // CPF: ***.456.789-** / RG: mask first 3 and last 2
  const clean = value.replace(/\D/g, "");
  if (clean.length >= 11) {
    // CPF format
    return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
  }
  // Generic mask
  return `***${clean.slice(3, -2)}**`;
}

function hasChanged(oldValue: any, newValue: any): boolean {
  if (oldValue === newValue) return false;
  if (oldValue == null && newValue == null) return false;
  if (oldValue == null || newValue == null) return true;
  if (typeof oldValue !== "object" || typeof newValue !== "object") {
    return oldValue !== newValue;
  }
  if (Array.isArray(oldValue) || Array.isArray(newValue)) {
    if (!Array.isArray(oldValue) || !Array.isArray(newValue)) return true;
    if (oldValue.length !== newValue.length) return true;
    return oldValue.some((val, idx) => hasChanged(val, newValue[idx]));
  }
  const oldKeys = Object.keys(oldValue);
  const newKeys = Object.keys(newValue);
  if (oldKeys.length !== newKeys.length) return true;
  return oldKeys.some((key) => hasChanged(oldValue[key], newValue[key]));
}

function formatValue(value: any): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return JSON.stringify(value);
  return value;
}

function collectChangedFields(
  oldRecord: any,
  newRecord: any,
  parentPath: string = ""
): Array<{ field: string; from: any; to: any }> {
  const changes: Array<{ field: string; from: any; to: any }> = [];
  const allKeys = new Set([
    ...Object.keys(oldRecord || {}),
    ...Object.keys(newRecord || {}),
  ]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;
    const fullPath = parentPath ? `${parentPath}.${key}` : key;
    const oldValue = oldRecord?.[key];
    const newValue = newRecord?.[key];
    if (!hasChanged(oldValue, newValue)) continue;

    if (
      oldValue != null &&
      newValue != null &&
      typeof oldValue === "object" &&
      typeof newValue === "object" &&
      !Array.isArray(oldValue) &&
      !Array.isArray(newValue)
    ) {
      const nestedChanges = collectChangedFields(oldValue, newValue, fullPath);
      changes.push(...nestedChanges);
    } else {
      // Get the leaf field name for masking check
      const leafField = fullPath.split(".").pop() || fullPath;
      changes.push({
        field: fullPath,
        from: maskSensitiveValue(leafField, formatValue(oldValue)),
        to: maskSensitiveValue(leafField, formatValue(newValue)),
      });
    }
  }
  return changes;
}

export async function getAuditActor(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return { userId: undefined, membroId: undefined };

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();

  return {
    userId: userId || undefined,
    membroId: membro?._id,
  };
}

export async function createFieldAuditLogs(
  ctx: MutationCtx,
  oldRecord: any,
  newRecord: any,
  tableName: string,
  recordId?: string
): Promise<void> {
  if (!oldRecord || !newRecord) return;

  const changes = collectChangedFields(oldRecord, newRecord);
  if (changes.length === 0) return;

  const { userId, membroId } = await getAuditActor(ctx);
  const referenceId =
    recordId || (oldRecord._id as string) || (newRecord._id as string);

  if (!referenceId) return;

  const auditLogPromises = changes.map(({ field, from, to }) =>
    ctx.db.insert("auditLogs", {
      action: "FIELD_CHANGE",
      referenciaTabela: tableName,
      referenciaId: referenceId,
      userId,
      membroId,
      field,
      from,
      to,
      createdAt: Date.now(),
    })
  );

  await Promise.all(auditLogPromises);
}

export async function createActionAuditLog(
  ctx: MutationCtx,
  action: string,
  tableName: string,
  recordId: string
): Promise<void> {
  const { userId, membroId } = await getAuditActor(ctx);
  await ctx.db.insert("auditLogs", {
    action,
    referenciaTabela: tableName,
    referenciaId: recordId,
    userId,
    membroId,
    createdAt: Date.now(),
  });
}
