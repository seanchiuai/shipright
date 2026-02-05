/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_cascade from "../lib/cascade.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_credentials from "../lib/credentials.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_github from "../lib/github.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_retry from "../lib/retry.js";
import type * as lib_sentry from "../lib/sentry.js";
import type * as lib_vertex from "../lib/vertex.js";
import type * as matching from "../matching.js";
import type * as pipelineEvents from "../pipelineEvents.js";
import type * as projects from "../projects.js";
import type * as scaffolding from "../scaffolding.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  github: typeof github;
  http: typeof http;
  interviews: typeof interviews;
  "lib/auth": typeof lib_auth;
  "lib/cascade": typeof lib_cascade;
  "lib/constants": typeof lib_constants;
  "lib/credentials": typeof lib_credentials;
  "lib/errors": typeof lib_errors;
  "lib/github": typeof lib_github;
  "lib/logger": typeof lib_logger;
  "lib/retry": typeof lib_retry;
  "lib/sentry": typeof lib_sentry;
  "lib/vertex": typeof lib_vertex;
  matching: typeof matching;
  pipelineEvents: typeof pipelineEvents;
  projects: typeof projects;
  scaffolding: typeof scaffolding;
  templates: typeof templates;
  users: typeof users;
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
