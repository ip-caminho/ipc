import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getSaoPauloDate } from "../_shared/datetime";

type DadosFamiliar = {
  nomeCompleto: string;
  dataNascimento?: string;
  sexo?: "M" | "F";
  batizadoNestaIgreja?: boolean;
  dataBatismo?: string;
  usoImagem?: "AUTORIZADO" | "NAO_AUTORIZADO" | "PENDENTE";
  observacoesMedicas?: string;
};

/**
 * Espelha o vinculo de conjuge no outro lado: se a entidade-alvo tem registro
 * de membro e ainda nao tem conjuge, aponta de volta. Vinculos de conjuge
 * devem ser sempre bilaterais — sem isso, o perfil do outro lado nao mostra
 * a familia.
 */
export async function espelharConjuge(
  ctx: MutationCtx,
  minhaEntidadeId: Id<"entidades">,
  conjugeEntidadeId: Id<"entidades">,
): Promise<void> {
  const conjugeMembro = await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q) => q.eq("entidadeId", conjugeEntidadeId))
    .first();
  if (conjugeMembro && !conjugeMembro.conjugeId) {
    await ctx.db.patch(conjugeMembro._id, { conjugeId: minhaEntidadeId });
  }
}

/**
 * Limpa o espelho do vinculo antigo (usado quando um membro troca ou remove
 * o conjuge): se o ex-conjuge ainda aponta de volta, desfaz.
 */
export async function limparEspelhoConjuge(
  ctx: MutationCtx,
  minhaEntidadeId: Id<"entidades">,
  exConjugeEntidadeId: Id<"entidades">,
): Promise<void> {
  const exMembro = await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q) => q.eq("entidadeId", exConjugeEntidadeId))
    .first();
  if (exMembro && exMembro.conjugeId === minhaEntidadeId) {
    await ctx.db.patch(exMembro._id, { conjugeId: undefined });
  }
}

/**
 * Vincula a crianca tambem ao conjuge do responsavel (se houver), sem
 * duplicar. Filhos pertencem ao casal: sem isso, a crianca so aparece na
 * familia de quem cadastrou.
 */
export async function vincularCriancaAoConjuge(
  ctx: MutationCtx,
  responsavelEntidadeId: Id<"entidades">,
  criancaEntidadeId: Id<"entidades">,
): Promise<void> {
  const respMembro = await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q) => q.eq("entidadeId", responsavelEntidadeId))
    .first();
  const conjugeEntId = respMembro?.conjugeId;
  if (!conjugeEntId || conjugeEntId === criancaEntidadeId) return;

  const existentes = await ctx.db
    .query("responsaveis")
    .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", criancaEntidadeId))
    .collect();
  if (existentes.some((r) => r.responsavelEntidadeId === conjugeEntId)) return;

  const conjugeEntidade = await ctx.db.get(conjugeEntId);
  const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
    conjugeEntidade?.sexo === "M" ? "PAI" : conjugeEntidade?.sexo === "F" ? "MAE" : "RESPONSAVEL";
  await ctx.db.insert("responsaveis", {
    criancaEntidadeId,
    responsavelEntidadeId: conjugeEntId,
    tipo,
    principal: false,
    criadoEm: Date.now(),
  });
}

/**
 * Deriva a turma do departamento infantil a partir da data de nascimento.
 * Retorna null para idade >10 ou data invalida.
 */
export function turmaFromDataNascimento(dataNascimento: string | undefined): string | null {
  if (!dataNascimento) return null;
  const [by, bm, bd] = dataNascimento.split("-").map(Number);
  if ([by, bm, bd].some((n) => Number.isNaN(n))) return null;
  // Idade "hoje" no fuso da igreja (Sao Paulo), nao no UTC do servidor.
  const sp = getSaoPauloDate();
  let age = sp.year - by;
  const beforeBirthday = sp.month < bm || (sp.month === bm && sp.day < bd);
  if (beforeBirthday) age--;
  if (age < 0) return null;
  if (age <= 2) return "0-2";
  if (age <= 4) return "3-4";
  if (age <= 6) return "5-6";
  if (age <= 8) return "7-8";
  if (age <= 10) return "9-10";
  return null;
}

/**
 * Cria a entidade (e membro, se batizado) de um filho e vincula ao responsavel
 * informado + ao conjuge dele. Cria criancaPerfil quando aplicavel. Usado tanto
 * na aprovacao de solicitacao quanto por fluxos administrativos.
 */
export async function criarFilhoParaResponsavel(
  ctx: MutationCtx,
  responsavel: Doc<"membros">,
  dados: DadosFamiliar,
): Promise<Id<"entidades">> {
  const responsavelEntidade = await ctx.db.get(responsavel.entidadeId);

  const filhoEntidadeId = await ctx.db.insert("entidades", {
    tipoEntidade: "PF",
    papeis: [],
    status: "ATIVO",
    nomeCompleto: dados.nomeCompleto,
    dataNascimento: dados.dataNascimento,
    sexo: dados.sexo,
    vinculoIgreja: dados.batizadoNestaIgreja ? "MEMBRO" : "NAO_MEMBRO",
    perfilAtualizadoEm: Date.now(),
    perfilAtualizadoPor: responsavel._id,
  });

  if (dados.batizadoNestaIgreja) {
    await ctx.db.insert("membros", {
      entidadeId: filhoEntidadeId,
      role: "membro",
      cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
      dataBatismo: dados.dataBatismo || undefined,
    });
  }

  const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
    responsavelEntidade?.sexo === "M"
      ? "PAI"
      : responsavelEntidade?.sexo === "F"
        ? "MAE"
        : "RESPONSAVEL";

  await ctx.db.insert("responsaveis", {
    criancaEntidadeId: filhoEntidadeId,
    responsavelEntidadeId: responsavel.entidadeId,
    tipo,
    principal: true,
    criadoEm: Date.now(),
  });
  await vincularCriancaAoConjuge(ctx, responsavel.entidadeId, filhoEntidadeId);

  const turma = turmaFromDataNascimento(dados.dataNascimento);
  if (turma && (dados.usoImagem || dados.observacoesMedicas)) {
    await ctx.db.insert("criancaPerfil", {
      entidadeId: filhoEntidadeId,
      turma,
      usoImagem: dados.usoImagem || "PENDENTE",
      observacoesMedicas: dados.observacoesMedicas || undefined,
      criadoEm: Date.now(),
    });
  }

  return filhoEntidadeId;
}

/**
 * Cria a entidade de um conjuge ainda nao cadastrado e vincula ao membro
 * informado (bilateral quando o novo lado tiver membro — aqui nao tem).
 */
export async function criarConjugeParaMembro(
  ctx: MutationCtx,
  membro: Doc<"membros">,
  dados: DadosFamiliar,
): Promise<Id<"entidades">> {
  const conjugeEntidadeId = await ctx.db.insert("entidades", {
    tipoEntidade: "PF",
    papeis: [],
    status: "ATIVO",
    nomeCompleto: dados.nomeCompleto,
    dataNascimento: dados.dataNascimento,
    sexo: dados.sexo,
    vinculoIgreja: "NAO_MEMBRO",
    perfilAtualizadoEm: Date.now(),
    perfilAtualizadoPor: membro._id,
  });

  await ctx.db.patch(membro._id, { conjugeId: conjugeEntidadeId });
  await espelharConjuge(ctx, membro.entidadeId, conjugeEntidadeId);

  return conjugeEntidadeId;
}
