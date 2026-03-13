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
import type * as audit_mutations from "../audit/mutations.js";
import type * as audit_queries from "../audit/queries.js";
import type * as auth from "../auth.js";
import type * as auth_auth from "../auth/auth.js";
import type * as auth_phoneOTP from "../auth/phoneOTP.js";
import type * as debug from "../debug.js";
import type * as entidades_mutations from "../entidades/mutations.js";
import type * as entidades_queries from "../entidades/queries.js";
import type * as files_helpers from "../files/helpers.js";
import type * as files_signing from "../files/signing.js";
import type * as files_upload from "../files/upload.js";
import type * as gravacoes_ai from "../gravacoes/ai.js";
import type * as gravacoes_aiAction from "../gravacoes/aiAction.js";
import type * as gravacoes_comentarios from "../gravacoes/comentarios.js";
import type * as gravacoes_escutas from "../gravacoes/escutas.js";
import type * as gravacoes_mutations from "../gravacoes/mutations.js";
import type * as gravacoes_queries from "../gravacoes/queries.js";
import type * as gravacoes_series from "../gravacoes/series.js";
import type * as http from "../http.js";
import type * as membros_bootstrap from "../membros/bootstrap.js";
import type * as membros_convites from "../membros/convites.js";
import type * as membros_mutations from "../membros/mutations.js";
import type * as membros_queries from "../membros/queries.js";
import type * as membros_selfService from "../membros/selfService.js";
import type * as messaging_phoneUtils from "../messaging/phoneUtils.js";
import type * as messaging_service from "../messaging/service.js";
import type * as messaging_types from "../messaging/types.js";
import type * as preferencias_rbac from "../preferencias/rbac.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_shared/auditHelpers": typeof _shared_auditHelpers;
  "audit/mutations": typeof audit_mutations;
  "audit/queries": typeof audit_queries;
  auth: typeof auth;
  "auth/auth": typeof auth_auth;
  "auth/phoneOTP": typeof auth_phoneOTP;
  debug: typeof debug;
  "entidades/mutations": typeof entidades_mutations;
  "entidades/queries": typeof entidades_queries;
  "files/helpers": typeof files_helpers;
  "files/signing": typeof files_signing;
  "files/upload": typeof files_upload;
  "gravacoes/ai": typeof gravacoes_ai;
  "gravacoes/aiAction": typeof gravacoes_aiAction;
  "gravacoes/comentarios": typeof gravacoes_comentarios;
  "gravacoes/escutas": typeof gravacoes_escutas;
  "gravacoes/mutations": typeof gravacoes_mutations;
  "gravacoes/queries": typeof gravacoes_queries;
  "gravacoes/series": typeof gravacoes_series;
  http: typeof http;
  "membros/bootstrap": typeof membros_bootstrap;
  "membros/convites": typeof membros_convites;
  "membros/mutations": typeof membros_mutations;
  "membros/queries": typeof membros_queries;
  "membros/selfService": typeof membros_selfService;
  "messaging/phoneUtils": typeof messaging_phoneUtils;
  "messaging/service": typeof messaging_service;
  "messaging/types": typeof messaging_types;
  "preferencias/rbac": typeof preferencias_rbac;
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
