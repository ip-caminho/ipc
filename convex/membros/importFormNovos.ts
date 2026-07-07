import { internalMutation, internalQuery, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { espelharConjuge } from "./familiaHelpers";
import { createS3Client, getBucketName, getPublicUrl, generateObjectKey } from "../files/helpers";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Importador de cadastros vindos do formulario Tally de novos membros.
// Rodar via CLI (npx convex run ... --prod) com os dados como args — nada de
// PII hardcoded no repo. Idempotente: dedupe por CPF (indice by_cpf).

const enderecoValidator = v.object({
  logradouro: v.string(),
  numero: v.string(),
  complemento: v.optional(v.string()),
  bairro: v.string(),
  cidade: v.string(),
  estado: v.string(),
  cep: v.string(),
});

const pessoaValidator = v.object({
  nomeCompleto: v.string(),
  cpf: v.string(), // so digitos
  rg: v.optional(v.string()),
  tipoDocumento: v.optional(v.union(v.literal("RG"), v.literal("RNE"), v.literal("RNM"))),
  dataNascimento: v.optional(v.string()), // YYYY-MM-DD
  sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
  estadoCivil: v.optional(v.string()),
  nacionalidade: v.optional(v.string()),
  naturalidade: v.optional(v.object({ cidade: v.string(), estado: v.string(), pais: v.string() })),
  profissao: v.optional(v.string()),
  formacao: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  endereco: v.optional(enderecoValidator),
  igrejaProcedencia: v.optional(v.string()),
  // CPF do conjuge (quando o casal vem no mesmo lote ou o conjuge ja existe)
  conjugeCpf: v.optional(v.string()),
});

export const importar = internalMutation({
  args: {
    pessoas: v.array(pessoaValidator),
    formaAdmissao: v.string(), // ex: TRANSFERENCIA
    cargoEclesiastico: v.string(), // ex: MEMBRO_COMUNGANTE
  },
  handler: async (ctx, { pessoas, formaAdmissao, cargoEclesiastico }) => {
    const resultado: { nome: string; acao: string }[] = [];

    for (const p of pessoas) {
      const existente = await ctx.db
        .query("entidades")
        .withIndex("by_cpf", (q) => q.eq("cpf", p.cpf))
        .first();
      if (existente) {
        resultado.push({ nome: p.nomeCompleto, acao: "PULADO (cpf ja existe)" });
        continue;
      }

      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        vinculoIgreja: "MEMBRO",
        nomeCompleto: p.nomeCompleto,
        cpf: p.cpf,
        rg: p.rg,
        tipoDocumento: p.tipoDocumento,
        dataNascimento: p.dataNascimento,
        sexo: p.sexo,
        estadoCivil: p.estadoCivil as never,
        nacionalidade: p.nacionalidade,
        naturalidade: p.naturalidade,
        profissao: p.profissao,
        formacao: p.formacao as never,
        whatsapp: p.whatsapp,
        endereco: p.endereco,
      });

      const membroId = await ctx.db.insert("membros", {
        entidadeId,
        role: "membro",
        formaAdmissao: formaAdmissao as never,
        cargoEclesiastico: cargoEclesiastico as never,
        igrejaProcedencia: p.igrejaProcedencia,
      });

      await createActionAuditLog(ctx, "CREATE", "membros", membroId);
      resultado.push({ nome: p.nomeCompleto, acao: "CRIADO" });
    }

    // Segunda passada: vinculos de conjuge (bilateral via espelharConjuge)
    for (const p of pessoas) {
      if (!p.conjugeCpf) continue;
      const eu = await ctx.db
        .query("entidades")
        .withIndex("by_cpf", (q) => q.eq("cpf", p.cpf))
        .first();
      const conjuge = await ctx.db
        .query("entidades")
        .withIndex("by_cpf", (q) => q.eq("cpf", p.conjugeCpf))
        .first();
      if (!eu || !conjuge) continue;
      const meuMembro = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", eu._id))
        .first();
      if (meuMembro && !meuMembro.conjugeId) {
        await ctx.db.patch(meuMembro._id, { conjugeId: conjuge._id });
        await espelharConjuge(ctx, eu._id, conjuge._id);
      }
    }

    return resultado;
  },
});

// Preenche APENAS campos vazios de uma entidade/membro existente (por CPF).
export const preencherVazios = internalMutation({
  args: {
    cpf: v.string(),
    entidade: v.optional(v.any()),
    membro: v.optional(v.any()),
  },
  handler: async (ctx, { cpf, entidade, membro }) => {
    const ent = await ctx.db
      .query("entidades")
      .withIndex("by_cpf", (q) => q.eq("cpf", cpf))
      .first();
    if (!ent) throw new Error(`Entidade com cpf ${cpf} nao encontrada`);

    const vazio = (x: unknown) => x === undefined || x === null || x === "";
    const preenchidos: string[] = [];

    if (entidade) {
      const patch: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(entidade as Record<string, unknown>)) {
        if (!vazio(val) && vazio((ent as Record<string, unknown>)[k])) {
          patch[k] = val;
          preenchidos.push(`entidade.${k}`);
        }
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(ent._id, patch);
        const depois = await ctx.db.get(ent._id);
        await createFieldAuditLogs(ctx, ent, depois, "entidades");
      }
    }

    if (membro) {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", ent._id))
        .first();
      if (m) {
        const patch: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(membro as Record<string, unknown>)) {
          if (!vazio(val) && vazio((m as Record<string, unknown>)[k])) {
            patch[k] = val;
            preenchidos.push(`membro.${k}`);
          }
        }
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(m._id, patch);
          const depois = await ctx.db.get(m._id);
          await createFieldAuditLogs(ctx, m, depois, "membros");
        }
      }
    }

    return { nome: ent.nomeCompleto, preenchidos };
  },
});

export const getEntidadeIdByCpf = internalQuery({
  args: { cpf: v.string() },
  handler: async (ctx, { cpf }) => {
    const ent = await ctx.db
      .query("entidades")
      .withIndex("by_cpf", (q) => q.eq("cpf", cpf))
      .first();
    return ent ? { id: ent._id, temFoto: !vazioStr(ent.foto) } : null;
  },
});

function vazioStr(x: unknown) {
  return x === undefined || x === null || x === "";
}

export const setFotoSeVazia = internalMutation({
  args: { entidadeId: v.id("entidades"), foto: v.string() },
  handler: async (ctx, { entidadeId, foto }) => {
    const ent = await ctx.db.get(entidadeId);
    if (!ent || !vazioStr(ent.foto)) return false;
    await ctx.db.patch(entidadeId, { foto });
    const depois = await ctx.db.get(entidadeId);
    await createFieldAuditLogs(ctx, ent, depois, "entidades");
    return true;
  },
});

// Baixa a foto do formulario (URL assinada Tally) e sobe para o B2 na pasta
// padrao de fotos de membros; grava a URL do CDN se a entidade nao tem foto.
export const importarFotoTally = internalAction({
  args: { cpf: v.string(), url: v.string() },
  handler: async (ctx, { cpf, url }): Promise<string> => {
    // @ts-ignore Convex TS2589 (inferencia profunda da API apos crescer entidades/queries)
    const ent = await ctx.runQuery(internal.membros.importFormNovos.getEntidadeIdByCpf, { cpf });
    if (!ent) return `SKIP: cpf ${cpf} nao encontrado`;
    if (ent.temFoto) return `SKIP: ja tem foto`;

    const res = await fetch(url);
    if (!res.ok) return `ERRO: download ${res.status}`;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const body = new Uint8Array(await res.arrayBuffer());

    const key = generateObjectKey("membros/fotos", ent.id, ext);
    const s3 = createS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
      }),
    );
    const publicUrl = getPublicUrl(key);
    const gravou = await ctx.runMutation(internal.membros.importFormNovos.setFotoSeVazia, {
      entidadeId: ent.id,
      foto: publicUrl,
    });
    return gravou ? `OK: ${publicUrl}` : "SKIP: foto ja preenchida";
  },
});
