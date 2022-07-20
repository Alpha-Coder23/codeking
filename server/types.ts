import type { ConnInfo, ServeInit } from "https://deno.land/std@0.145.0/http/server.ts";
import type { Comment, Element, TextChunk } from "https://deno.land/x/lol_html@0.0.4/types.d.ts";
import type { UserConfig } from "../lib/@unocss/core.ts";
import type { RouteModule } from "../runtime/core/route.ts";
export type { Route, RouteConfig, RouteMatch, RouteMeta } from "../runtime/core/route.ts";
export type { Comment, ConnInfo, Element, RouteModule, ServeInit, TextChunk };

export type AlephConfig = {
  /** The base url of the server. */
  baseUrl?: string;
  /** The router options for the file-system based routing. */
  router?: RouterInit;
  /** The config for UnoCSS. */
  unocss?: "preset" | UnoConfig;
  /** The module loaders. */
  loaders?: ModuleLoader[];
  /* The options for optimization */
  optimization?: OptimizationOptions;
};

/** The router options for the file-system based routing. */
export interface RouterInit {
  /** The glob to match routes.  */
  glob?: string;
  /** The directory of the FS routing. */
  dir?: string;
  /** The extnames to match routes. */
  exts?: string[];
  /** The pre-built routes.  */
  routes?: Record<string, Record<string, unknown>>;
}

/** The config for UnoCSS. */
export type UnoConfig = UserConfig & {
  test?: RegExp;
  resetCSS?: "normalize" | "eric-meyer" | "tailwind" | "antfu";
};

export type CookieOptions = {
  expires?: number | Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

export interface Cookies {
  get(key: string): string | undefined;
  set(key: string, value: string, options?: CookieOptions): void;
  delete(key: string, options?: CookieOptions): void;
}

export interface SessionStorage {
  get(sid: string): Promise<Record<string, unknown> | undefined>;
  set(sid: string, data: Record<string, unknown>, expires: number): Promise<void>;
  delete(sid: string): Promise<void>;
}

export type SessionCookieOptions = {
  name?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

export type SessionOptions = {
  storage?: SessionStorage;
  cookie?: SessionCookieOptions;
  secret?: string;
  maxAge?: number;
};

export interface Session<T> {
  store: T | undefined;
  update(store: T | ((store: T | undefined) => T)): Promise<string>;
  end(): Promise<string>;
}

export interface HTMLRewriterHandlers {
  element?: (element: Element) => void;
  comments?: (comment: Comment) => void;
  text?: (text: TextChunk) => void;
}

export interface HTMLRewriter {
  on: (selector: string, handlers: HTMLRewriterHandlers) => void;
}

export interface Context extends Record<string, unknown> {
  readonly connInfo?: ConnInfo;
  readonly params: Record<string, string>;
  readonly headers: Headers;
  readonly cookies: Cookies;
  readonly htmlRewriter: HTMLRewriter;
  getSession<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<Session<T>>;
}

export interface Middleware {
  readonly name?: string;
  readonly eager?: boolean;
  fetch(
    request: Request,
    context: Context,
  ): Promise<Response | (() => void) | void> | Response | (() => void) | void;
}

export type ImportMap = {
  readonly __filename: string;
  readonly imports: Record<string, string>;
  readonly scopes: Record<string, Record<string, string>>;
};

export type JSXConfig = {
  jsxPragma?: string;
  jsxPragmaFrag?: string;
  jsxImportSource?: string;
};

export type ModuleLoaderEnv = {
  isDev?: boolean;
  importMap?: ImportMap;
  jsxConfig?: JSXConfig;
  sourceMap?: boolean;
  ssr?: boolean;
};

export type ModuleLoaderOutput = {
  code: string;
  lang?: "js" | "jsx" | "ts" | "tsx";
  inlineCSS?: string;
  map?: string;
};

export interface ModuleLoader {
  test(pathname: string): boolean;
  load(
    specifier: string,
    content: string,
    env: ModuleLoaderEnv,
  ): Promise<ModuleLoaderOutput> | ModuleLoaderOutput;
}

/** The optimization options for the server. */
export type OptimizationOptions = {
  /** The output directory, default is './out'. */
  outputDir?: string;
  /** The built target for esbuild, default is 'es2018'. */
  buildTarget?: "es2015" | "es2016" | "es2017" | "es2018" | "es2019" | "es2020" | "es2021" | "es2022";
  /** The SSG options for the FS routing. */
  ssg?: SSGOptions;
};

/** The SSG options for the FS routing. */
export type SSGOptions = {
  include?: RegExp;
  exclude?: RegExp;
  getStaticPaths?: () => string[] | Promise<string[]>;
};

export type SSRContext = {
  readonly url: URL;
  readonly routeModules: RouteModule[];
  readonly headCollection: string[];
  readonly dataDefer: boolean;
  readonly signal: AbortSignal;
  readonly bootstrapScripts?: string[];
  readonly onError?: (error: unknown) => void;
};

export type SSRFn = {
  (ssr: SSRContext): Promise<ReadableStream | string> | ReadableStream | string;
};

// Options for the content-security-policy
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
export type CSP = {
  getPolicy: (url: URL, nonce?: string) => string | null;
  nonce?: boolean;
};

export type SSR = {
  cacheControl?: "private" | "public";
  CSP?: CSP;
  dataDefer: true;
  render: (ssr: SSRContext) => Promise<ReadableStream> | ReadableStream;
} | {
  cacheControl?: "private" | "public";
  CSP?: CSP;
  dataDefer?: false;
  render: SSRFn;
} | SSRFn;

export type SSRResult = {
  context: SSRContext;
  body: ReadableStream | string;
  deferedData: Record<string, unknown>;
  nonce?: string;
  is404?: boolean;
};

export interface FetchHandler {
  (
    request: Request,
    context: Record<string, unknown>,
  ): Promise<Response> | Response;
}

export type ErrorHandler = {
  (
    error: unknown,
    cause: {
      by: "route-data-fetch" | "ssr" | "transform" | "fs" | "middleware";
      url: string;
      context?: Record<string, unknown>;
    },
  ): Response | void;
};
