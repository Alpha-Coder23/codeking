import { basename, dirname, extname, join } from "https://deno.land/std@0.125.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.125.0/fs/ensure_dir.ts";
import { build as esbuild, type Loader, stop } from "https://deno.land/x/esbuild@v0.14.23/mod.js";
import { parseExportNames } from "../compiler/mod.ts";
import cache from "../lib/cache.ts";
import { existsDir, existsFile } from "../lib/fs.ts";
import { builtinModuleExts, toLocalPath } from "../lib/helpers.ts";
import { parseHtmlLinks } from "../lib/html.ts";
import util from "../lib/util.ts";
import { getAlephPkgUri, loadJSXConfig } from "../server/config.ts";
import { DependencyGraph } from "../server/graph.ts";
import { initRoutes } from "../server/routing.ts";
import type { AlephConfig, FetchHandler } from "../server/types.ts";

export async function build(
  workingDir: string,
  _platform: "deno-deploy" | "cf-worker" | "vercel",
  serverEntry?: string,
): Promise<{ clientModules: Set<string> }> {
  const tmpDir = await Deno.makeTempDir();
  const alephPkgUri = getAlephPkgUri();
  const jsxCofig = await loadJSXConfig();
  const config: AlephConfig | undefined = Reflect.get(globalThis, "__ALEPH_SERVER_CONFIG");
  const outputDir = join(workingDir, config?.build?.outputDir ?? "dist");

  // clean previous build
  if (await existsDir(outputDir)) {
    for await (const entry of Deno.readDir(outputDir)) {
      await Deno.remove(join(outputDir, entry.name), { recursive: entry.isDirectory });
    }
  } else {
    await Deno.mkdir(outputDir, { recursive: true });
  }

  let routeFiles: [filename: string, exportNames: string[]][] = [];
  if (config?.routeFiles) {
    const routes = await initRoutes(config?.routeFiles);
    routeFiles = await Promise.all(routes.map(async ([_, { filename }]) => {
      const code = await Deno.readTextFile(filename);
      const exportNames = await parseExportNames(filename, code);
      return [filename, exportNames];
    }));
  }
  const port = Deno.env.get("ALEPH_APP_MODULES_PORT");
  const serverEntryCode = [
    `import { DependencyGraph } from "${alephPkgUri}/server/graph.ts";`,
    `import graph from "./server_dependency_graph.js";`,
    `globalThis.serverDependencyGraph = new DependencyGraph(graph.modules);`,
    routeFiles.length > 0 && `import { register } from "${alephPkgUri}/server/routing.ts";`,
    ...routeFiles.map(([filename, exportNames], idx) => {
      const hasDefaultExport = exportNames.includes("default");
      const hasDataExport = exportNames.includes("data");
      if (!hasDefaultExport && !hasDataExport) {
        return [];
      }
      const url = `http://localhost:${port}${filename.slice(1)}`;
      return [
        hasDefaultExport && `import _${idx} from ${JSON.stringify(url)};`,
        !hasDefaultExport && `const _${idx} = undefined;`,
        hasDataExport && `import { data as $${idx} } from ${JSON.stringify(url)};`,
        !hasDataExport && `const $${idx} = undefined;`,
        `register(${JSON.stringify(filename)}, { default: _${idx}, data: $${idx} });`,
      ];
    }).flat().filter(Boolean),
    serverEntry && `import "http://localhost:${port}/${basename(serverEntry)}";`,
    !serverEntry && `import { serve } from "${alephPkgUri}/server/mode.ts";`,
    !serverEntry && `serve();`,
  ].filter(Boolean).join("\n");

  // since esbuild doesn't support jsx automic mode, we need to manually import jsx runtime
  let jsxShimFile: string | null = null;
  if (serverEntry && util.endsWithAny(serverEntry, ".jsx", ".tsx") && jsxCofig.jsxImportSource) {
    jsxShimFile = join(tmpDir, "jsx-shim.js");
    await Deno.writeTextFile(
      jsxShimFile,
      (jsxCofig.jsxRuntime === "preact"
        ? [
          `import { h, Fragment } from ${JSON.stringify(jsxCofig.jsxImportSource)};`,
          `export { h, Fragment }`,
        ]
        : [
          `import React from ${JSON.stringify(jsxCofig.jsxImportSource)};`,
          `export { React }`,
        ]).join("\n"),
    );
  }

  // build server entry
  await esbuild({
    stdin: {
      contents: serverEntryCode,
      sourcefile: "server.tsx",
    },
    outfile: join(outputDir, "server.js"),
    platform: "browser",
    format: "esm",
    target: ["esnext"],
    bundle: true,
    minify: !Deno.env.get("ALEPH_DEV_PORT"),
    treeShaking: true,
    sourcemap: true,
    jsxFactory: jsxCofig.jsxRuntime === "preact" ? "h" : "React.createElement",
    jsxFragment: jsxCofig.jsxRuntime === "preact" ? "Fragment" : "React.Fragment",
    inject: [jsxShimFile as string].filter(Boolean),
    plugins: [{
      name: "aleph-server-build-plugin",
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          const isRemote = util.isLikelyHttpURL(args.path);
          const forceBundle = args.path === alephPkgUri + "/server/mod.ts" ||
            args.path.startsWith(`http://localhost:${Deno.env.get("ALEPH_APP_MODULES_PORT")}/`);
          const [path] = util.splitBy(isRemote ? args.path : util.trimPrefix(args.path, "file://"), "#");

          if (
            (isRemote && !forceBundle) || args.path === "./server_dependency_graph.js"
          ) {
            return { path, external: true };
          }

          if (forceBundle) {
            return { path, namespace: "http" };
          }

          if (args.namespace === "http") {
            const { href } = new URL(path, args.importer);
            if (href.startsWith(alephPkgUri) && href !== `${alephPkgUri}/server/transformer.ts`) {
              return { path: href, external: true };
            }
            return { path: href, namespace: "http" };
          }

          return { path };
        });
        build.onLoad({ filter: /.*/, namespace: "http" }, async (args) => {
          const url = new URL(args.path);
          if (url.href === `${alephPkgUri}/server/transformer.ts`) {
            url.pathname = util.trimSuffix(url.pathname, ".ts") + "_dist.ts";
          }
          const contents = await (await cache(url.href)).text();
          return {
            contents,
            loader: extname(url.pathname).slice(1) as unknown as Loader,
          };
        });
      },
    }],
  });

  // create server_dependency_graph.js
  const serverDependencyGraph: DependencyGraph | undefined = Reflect.get(globalThis, "serverDependencyGraph");
  if (serverDependencyGraph) {
    await Deno.writeTextFile(
      join(outputDir, "server_dependency_graph.js"),
      "export default " + JSON.stringify({ modules: serverDependencyGraph.modules }),
    );
  }

  // look up client modules
  let tasks = routeFiles.map(([filename]) => filename);
  if (await existsFile(join(workingDir, "index.html"))) {
    const html = await Deno.readFile(join(workingDir, "index.html"));
    const links = await parseHtmlLinks(html);
    for (const link of links) {
      if (!util.isLikelyHttpURL(link)) {
        const ext = extname(link);
        if (ext === ".css" || builtinModuleExts.includes(ext.slice(1))) {
          const specifier = "." + util.cleanPath(link);
          tasks.push(specifier);
        }
      }
    }
  }

  // transform client modules
  const serverHandler: FetchHandler | undefined = Reflect.get(globalThis, "__ALEPH_SERVER_HANDLER");
  const clientModules = new Set<string>();
  if (serverHandler) {
    while (tasks.length > 0) {
      const deps = new Set<string>();
      await Promise.all(tasks.map(async (specifier) => {
        const url = new URL(util.isLikelyHttpURL(specifier) ? toLocalPath(specifier) : specifier, "http://localhost");
        const savePath = join(outputDir, url.pathname) +
          (specifier.startsWith("https://esm.sh/") ? ".js" : "");
        const req = new Request(url.toString());
        const ctx = {} as unknown as FetchContext;
        await ensureDir(dirname(savePath));
        const [res, file] = await Promise.all([
          serverHandler(req, ctx),
          Deno.open(savePath, { write: true, create: true }),
        ]);
        await res.body?.pipeTo(file.writable);
        clientModules.add(specifier);
        if (!specifier.endsWith(".css")) {
          const clientDependencyGraph: DependencyGraph | undefined = Reflect.get(globalThis, "clientDependencyGraph");
          clientDependencyGraph?.get(specifier)?.deps?.forEach(({ specifier }) => deps.add(specifier));
        }
      }));
      tasks = Array.from(deps).filter((specifier) => !clientModules.has(specifier));
    }
  }

  // todo: ssg

  // clean up then exit
  await Deno.remove(tmpDir, { recursive: true });
  stop();

  return { clientModules };
}
