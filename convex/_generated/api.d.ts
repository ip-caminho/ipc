/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _shared_auditHelpers from "../_shared/auditHelpers.js";
import type * as _shared_llm_anthropic from "../_shared/llm/anthropic.js";
import type * as _shared_llm_gemini from "../_shared/llm/gemini.js";
import type * as _shared_llm_index from "../_shared/llm/index.js";
import type * as _shared_llm_types from "../_shared/llm/types.js";
import type * as _shared_requirePermission from "../_shared/requirePermission.js";
import type * as audit_mutations from "../audit/mutations.js";
import type * as audit_queries from "../audit/queries.js";
import type * as auth from "../auth.js";
import type * as auth_auth from "../auth/auth.js";
import type * as auth_phoneOTP from "../auth/phoneOTP.js";
import type * as avisos_mutations from "../avisos/mutations.js";
import type * as avisos_queries from "../avisos/queries.js";
import type * as calendario_mutations from "../calendario/mutations.js";
import type * as calendario_queries from "../calendario/queries.js";
import type * as debug from "../debug.js";
import type * as educacional_mutations from "../educacional/mutations.js";
import type * as educacional_queries from "../educacional/queries.js";
import type * as entidades_mutations from "../entidades/mutations.js";
import type * as entidades_queries from "../entidades/queries.js";
import type * as escalas_disponibilidade from "../escalas/disponibilidade.js";
import type * as escalas_equipes from "../escalas/equipes.js";
import type * as escalas_funcoes from "../escalas/funcoes.js";
import type * as escalas_gerarEscala from "../escalas/gerarEscala.js";
import type * as escalas_gerarEscalaHelpers from "../escalas/gerarEscalaHelpers.js";
import type * as escalas_mutations from "../escalas/mutations.js";
import type * as escalas_queries from "../escalas/queries.js";
import type * as files_helpers from "../files/helpers.js";
import type * as files_signing from "../files/signing.js";
import type * as files_upload from "../files/upload.js";
import type * as gravacoes_ai from "../gravacoes/ai.js";
import type * as gravacoes_aiAction from "../gravacoes/aiAction.js";
import type * as gravacoes_comentarios from "../gravacoes/comentarios.js";
import type * as gravacoes_escutas from "../gravacoes/escutas.js";
import type * as gravacoes_escutasHelpers from "../gravacoes/escutasHelpers.js";
import type * as gravacoes_mutations from "../gravacoes/mutations.js";
import type * as gravacoes_queries from "../gravacoes/queries.js";
import type * as gravacoes_series from "../gravacoes/series.js";
import type * as gravacoes_youtubeAction from "../gravacoes/youtubeAction.js";
import type * as http from "../http.js";
import type * as membros_bootstrap from "../membros/bootstrap.js";
import type * as membros_convites from "../membros/convites.js";
import type * as membros_mutations from "../membros/mutations.js";
import type * as membros_queries from "../membros/queries.js";
import type * as membros_selfService from "../membros/selfService.js";
import type * as membros_selfServiceHelpers from "../membros/selfServiceHelpers.js";
import type * as messaging_phoneUtils from "../messaging/phoneUtils.js";
import type * as messaging_service from "../messaging/service.js";
import type * as messaging_types from "../messaging/types.js";
import type * as ministerios_mutations from "../ministerios/mutations.js";
import type * as ministerios_queries from "../ministerios/queries.js";
import type * as modulos_mutations from "../modulos/mutations.js";
import type * as modulos_queries from "../modulos/queries.js";
import type * as pastoreio_mutations from "../pastoreio/mutations.js";
import type * as pastoreio_queries from "../pastoreio/queries.js";
import type * as pedidosOracao_mutations from "../pedidosOracao/mutations.js";
import type * as pedidosOracao_queries from "../pedidosOracao/queries.js";
import type * as pequenosGrupos_mutations from "../pequenosGrupos/mutations.js";
import type * as pequenosGrupos_queries from "../pequenosGrupos/queries.js";
import type * as preferencias_mutations from "../preferencias/mutations.js";
import type * as preferencias_queries from "../preferencias/queries.js";
import type * as preferencias_rbac from "../preferencias/rbac.js";
import type * as preferencias_rbacHelpers from "../preferencias/rbacHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_shared/auditHelpers": typeof _shared_auditHelpers;
  "_shared/llm/anthropic": typeof _shared_llm_anthropic;
  "_shared/llm/gemini": typeof _shared_llm_gemini;
  "_shared/llm/index": typeof _shared_llm_index;
  "_shared/llm/types": typeof _shared_llm_types;
  "_shared/requirePermission": typeof _shared_requirePermission;
  "audit/mutations": typeof audit_mutations;
  "audit/queries": typeof audit_queries;
  auth: typeof auth;
  "auth/auth": typeof auth_auth;
  "auth/phoneOTP": typeof auth_phoneOTP;
  "avisos/mutations": typeof avisos_mutations;
  "avisos/queries": typeof avisos_queries;
  "calendario/mutations": typeof calendario_mutations;
  "calendario/queries": typeof calendario_queries;
  debug: typeof debug;
  "educacional/mutations": typeof educacional_mutations;
  "educacional/queries": typeof educacional_queries;
  "entidades/mutations": typeof entidades_mutations;
  "entidades/queries": typeof entidades_queries;
  "escalas/disponibilidade": typeof escalas_disponibilidade;
  "escalas/equipes": typeof escalas_equipes;
  "escalas/funcoes": typeof escalas_funcoes;
  "escalas/gerarEscala": typeof escalas_gerarEscala;
  "escalas/gerarEscalaHelpers": typeof escalas_gerarEscalaHelpers;
  "escalas/mutations": typeof escalas_mutations;
  "escalas/queries": typeof escalas_queries;
  "files/helpers": typeof files_helpers;
  "files/signing": typeof files_signing;
  "files/upload": typeof files_upload;
  "gravacoes/ai": typeof gravacoes_ai;
  "gravacoes/aiAction": typeof gravacoes_aiAction;
  "gravacoes/comentarios": typeof gravacoes_comentarios;
  "gravacoes/escutas": typeof gravacoes_escutas;
  "gravacoes/escutasHelpers": typeof gravacoes_escutasHelpers;
  "gravacoes/mutations": typeof gravacoes_mutations;
  "gravacoes/queries": typeof gravacoes_queries;
  "gravacoes/series": typeof gravacoes_series;
  "gravacoes/youtubeAction": typeof gravacoes_youtubeAction;
  http: typeof http;
  "membros/bootstrap": typeof membros_bootstrap;
  "membros/convites": typeof membros_convites;
  "membros/mutations": typeof membros_mutations;
  "membros/queries": typeof membros_queries;
  "membros/selfService": typeof membros_selfService;
  "membros/selfServiceHelpers": typeof membros_selfServiceHelpers;
  "messaging/phoneUtils": typeof messaging_phoneUtils;
  "messaging/service": typeof messaging_service;
  "messaging/types": typeof messaging_types;
  "ministerios/mutations": typeof ministerios_mutations;
  "ministerios/queries": typeof ministerios_queries;
  "modulos/mutations": typeof modulos_mutations;
  "modulos/queries": typeof modulos_queries;
  "pastoreio/mutations": typeof pastoreio_mutations;
  "pastoreio/queries": typeof pastoreio_queries;
  "pedidosOracao/mutations": typeof pedidosOracao_mutations;
  "pedidosOracao/queries": typeof pedidosOracao_queries;
  "pequenosGrupos/mutations": typeof pequenosGrupos_mutations;
  "pequenosGrupos/queries": typeof pequenosGrupos_queries;
  "preferencias/mutations": typeof preferencias_mutations;
  "preferencias/queries": typeof preferencias_queries;
  "preferencias/rbac": typeof preferencias_rbac;
  "preferencias/rbacHelpers": typeof preferencias_rbacHelpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
