import { parseExportNames } from "https://deno.land/x/aleph_compiler@0.5.4/mod.ts";
import type { Route } from "../framework/core/route.ts";

/** generate the `routes.gen.ts` follow the routes config */
export async function generate(routes: Route[]) {
  const routeFiles: [fiilename: string, exportNames: string[]][] = await Promise.all(
    routes.map(async ([_, { filename }]) => {
      const code = await Deno.readTextFile(filename);
      const exportNames = await parseExportNames(filename, code);
      return [filename, exportNames];
    }),
  );

  const imports: string[] = [];
  const revives: string[] = [];

  routeFiles.forEach(([filename, exportNames], idx) => {
    if (exportNames.length === 0) {
      return [];
    }
    imports.push(
      `import { ${exportNames.map((name, i) => `${name} as ${"$".repeat(i + 1)}${idx}`).join(", ")} } from ${
        JSON.stringify(filename)
      };`,
    );
    revives.push(
      `revive(${JSON.stringify(filename)}, { ${
        exportNames.map((name, i) => `${name}: ${"$".repeat(i + 1)}${idx}`).join(", ")
      } });`,
    );
  });

  if (imports.length) {
    const code = [
      "/*! Generated by Aleph.js, do **NOT** change and ensure the file is **NOT** in the `.gitignore`. */",
      "",
      `import { revive } from "aleph/server";`,
      ...imports,
      "",
      ...revives,
    ].join("\n");
    await Deno.writeTextFile("routes.gen.ts", code);

    const serverEntry = Deno.env.get("ALEPH_SERVER_ENTRY");
    if (serverEntry) {
      const code = await Deno.readTextFile(serverEntry);
      if (!code.includes(`import "./routes.gen.ts"`)) {
        await Deno.writeTextFile(serverEntry, `import "./routes.gen.ts"\n${code}`);
      }
    }
  }
}
