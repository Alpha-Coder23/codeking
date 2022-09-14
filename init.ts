import { Untar } from "https://deno.land/std@0.155.0/archive/tar.ts";
import { parse } from "https://deno.land/std@0.155.0/flags/mod.ts";
import { Buffer } from "https://deno.land/std@0.155.0/io/buffer.ts";
import { copy } from "https://deno.land/std@0.155.0/streams/conversion.ts";
import { gunzip } from "https://deno.land/x/denoflate@1.2.1/mod.ts";
import util from "./shared/util.ts";
import { basename, blue, bold, cyan, dim, ensureDir, green, join, red } from "./server/deps.ts";
import { existsDir, existsFile, getFiles } from "./server/helpers.ts";
import log from "./server/log.ts";
import { isCanary } from "./version.ts";

const templates = [
  "api",
  "react",
  "vue",
  "yew",
  "solid",
  // todo:
  // "preact",
  // "svelte",
  // "lit",
  // "vanilla",
];

const versions = {
  react: "18.2.0",
  vue: "3.2.37",
  solid: "1.4.8",
};

export default async function init(nameArg?: string, template?: string) {
  if (template && !(templates.includes(template))) {
    log.fatal(
      `Invalid template name ${red(template)}, must be one of [${blue(templates.join(","))}]`,
    );
  }

  // get and check the project name
  const name = nameArg || (await ask("Project Name:") || "").trim();
  if (name === "") {
    await init(nameArg, template);
    return;
  }
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) {
    log.fatal(`Invalid project name: ${red(name)}`);
  }

  // check the dir is clean
  if (
    !(await isFolderEmpty(Deno.cwd(), name)) &&
    !(await confirm(`Folder ${blue(name)} already exists, continue?`))
  ) {
    Deno.exit(1);
  }

  if (!template) {
    const answer = await ask(
      [
        "Select a framework:",
        ...templates.map((name, i) => `  ${bold((i + 1).toString())}. ${toTitle(name)}`),
        dim(`[1-${templates.length}]`),
      ].join("\n"),
    );
    const n = parseInt(answer);
    if (!isNaN(n) && n > 0 && n <= templates.length) {
      template = templates[n - 1];
    } else {
      log.fatal(`Please entry ${cyan(`[1-${templates.length}]`)}`);
    }
  }

  const withUnocss = ["react", "yew"].includes(template!) && await confirm("Using Unocss(TailwindCSS)?");
  const withVscode = await confirm("Initialize VS Code workspace configuration?");

  // download template
  console.log(`Downloading template(${blue(template!)}), this might take a moment...`);
  const pkgName = isCanary ? "aleph_canary" : "aleph";
  const res = await fetch(
    `https://cdn.deno.land/${pkgName}/meta/versions.json`,
  );
  if (res.status !== 200) {
    console.error(await res.text());
    Deno.exit(1);
  }
  const { latest: VERSION } = await res.json();
  const repo = isCanary ? "ije/aleph-canary" : "alephjs/aleph.js";
  const resp = await fetch(
    `https://codeload.github.com/${repo}/tar.gz/refs/tags/${VERSION}`,
  );
  if (resp.status !== 200) {
    console.error(await resp.text());
    Deno.exit(1);
  }
  const tarData = gunzip(new Uint8Array(await resp.arrayBuffer()));
  const entryList = new Untar(new Buffer(tarData));
  const appDir = join(Deno.cwd(), name);
  const prefix = `${basename(repo)}-${VERSION}/examples/${withUnocss ? "with-unocss/" : ""}${template}-app/`;

  // write template files
  for await (const entry of entryList) {
    if (entry.fileName.startsWith(prefix) && !entry.fileName.endsWith("/README.md")) {
      const fp = join(appDir, util.trimPrefix(entry.fileName, prefix));
      if (entry.type === "directory") {
        await ensureDir(fp);
        continue;
      }
      const file = await Deno.open(fp, { write: true, create: true });
      await copy(entry, file);
    }
  }

  const alephPkgUri = `https://deno.land/x/${pkgName}@${VERSION}`;
  const denoConfig = {
    "compilerOptions": {
      "lib": [
        "dom",
        "dom.iterable",
        "dom.asynciterable",
        "dom.extras",
        "deno.ns",
      ],
      "types": [
        `${alephPkgUri}/types.d.ts`,
      ],
    },
    "importMap": "import_map.json",
    "tasks": {
      "dev": "deno run -A -q dev.ts",
      "opt": "deno run -A -q dev.ts --optimize",
      "start": "deno run -A server.ts",
    },
  };
  const importMap = {
    imports: {
      "~/": "./",
      "std/": "https://deno.land/std@0.155.0/",
      "aleph/": `${alephPkgUri}/`,
      "aleph/server": `${alephPkgUri}/server/mod.ts`,
      "aleph/dev": `${alephPkgUri}/server/dev.ts`,
    } as Record<string, string>,
    scopes: {},
  };
  if (withUnocss) {
    Object.assign(importMap.imports, {
      "@unocss/core": "https://esm.sh/@unocss/core@0.45.14",
      "@unocss/preset-uno": "https://esm.sh/@unocss/preset-uno@0.45.14",
    });
  }
  switch (template) {
    case "react": {
      Object.assign(denoConfig.compilerOptions, {
        "jsx": "react-jsx",
        "jsxImportSource": `https://esm.sh/react@${versions.react}`,
      });
      Object.assign(importMap.imports, {
        "aleph/react": `${alephPkgUri}/runtime/react/mod.ts`,
        "aleph/react-client": `${alephPkgUri}/runtime/react/client.ts`,
        "aleph/react-server": `${alephPkgUri}/runtime/react/server.ts`,
        "react": `https://esm.sh/react@${versions.react}`,
        "react-dom": `https://esm.sh/react-dom@${versions.react}`,
        "react-dom/": `https://esm.sh/react-dom@${versions.react}/`,
      });
      break;
    }
    case "vue": {
      Object.assign(importMap.imports, {
        "aleph/vue": `${alephPkgUri}/runtime/vue/mod.ts`,
        "aleph/vue-server": `${alephPkgUri}/runtime/vue/server.ts`,
        "vue": `https://esm.sh/vue@${versions.vue}`,
        "@vue/server-renderer": `https://esm.sh/@vue/server-renderer@${versions.vue}`,
      });
      break;
    }
    case "solid": {
      Object.assign(importMap.imports, {
        "aleph/solid-server": `${alephPkgUri}/runtime/solid/server.ts`,
        "solid-js": `https://esm.sh/solid-js@${versions.solid}`,
        "solid-js/web": `https://esm.sh/solid-js@${versions.solid}/web`,
      });
      break;
    }
  }

  await ensureDir(appDir);
  await Promise.all([
    Deno.writeTextFile(
      join(appDir, "deno.json"),
      JSON.stringify(denoConfig, undefined, 2),
    ),
    Deno.writeTextFile(
      join(appDir, "import_map.json"),
      JSON.stringify(importMap, undefined, 2),
    ),
  ]);

  if (withVscode) {
    const settings = {
      "deno.enable": true,
      "deno.lint": true,
      "deno.config": "./deno.json",
    };
    await ensureDir(join(appDir, ".vscode"));
    await Deno.writeTextFile(
      join(appDir, ".vscode", "settings.json"),
      JSON.stringify(settings, undefined, 2),
    );
  }

  await Deno.run({
    cmd: [Deno.execPath(), "cache", "server.ts"],
    cwd: appDir,
    stderr: "inherit",
    stdout: "inherit",
  }).status();

  console.log([
    "",
    green("Aleph.js is ready to go!"),
    `${dim("$")} cd ${name}`,
    `${dim("$")} deno task dev    ${dim("# Start the server in `development` mode")}`,
    `${dim("$")} deno task start  ${dim("# Start the server in `production` mode")}`,
    `${dim("$")} deno task opt    ${dim("# Optimize the application (bundling, ssg, etc.)")}`,
    "",
    `Docs: ${cyan("https://alephjs.org/docs")}`,
    `Bugs: ${cyan("https://github.com/alephjs/aleph.js/issues")}`,
    "",
  ].join("\n"));
  Deno.exit(0);
}

async function isFolderEmpty(root: string, name: string): Promise<boolean> {
  const dir = join(root, name);
  if (await existsFile(dir)) {
    throw new Error(`Folder ${name} already exists as a file.`);
  }
  if (await existsDir(dir)) {
    const files = await getFiles(dir);
    return files.length === 0 ||
      files.every((file) => [".DS_Store"].includes(file));
  }
  return true;
}

async function ask(question = ":", stdin = Deno.stdin, stdout = Deno.stdout) {
  await stdout.write(new TextEncoder().encode(cyan("? ") + question + " "));
  const buf = new Uint8Array(1024);
  const n = <number> await stdin.read(buf);
  const answer = new TextDecoder().decode(buf.subarray(0, n));
  return answer.trim();
}

async function confirm(question = "are you sure?") {
  let a: string;
  // deno-lint-ignore no-empty
  while (!/^(y|n|)$/i.test(a = (await ask(question + dim(" [y/N]"))).trim())) {}
  return a.toLowerCase() === "y";
}

function toTitle(name: string) {
  if (name === "api") {
    return "API";
  }
  return name.at(0)?.toUpperCase() + name.slice(1);
}

if (import.meta.main) {
  const { _: args, ...options } = parse(Deno.args);
  await init(args[0], options?.template);
}
