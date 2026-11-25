// Fails if the newest tarball in the repo root is not a clean, current build of
// this package. Run after `pnpm build && pnpm pack` (pnpm verify does both).
//
// Checks: only the intended files are inside; the entry files exist; dist/index.js
// keeps its "use client" banner (esbuild strips it unless tsup re-attaches it, and
// Next would then treat the table as a server component); and the tarball is not
// older than the source it claims to contain.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const tarballs = readdirSync(".")
  .filter((f) => /^devopsnext-starterkit-table-.*\.tgz$/.test(f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
const file = tarballs[0];
if (!file) {
  console.error("no devopsnext-starterkit-table-*.tgz in the repo root; run `pnpm pack` first");
  process.exit(1);
}

const entries = execFileSync("tar", ["-tzf", file], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter((e) => e && !e.endsWith("/"));
const ALLOWED = [/^package\/package\.json$/, /^package\/README\.md$/, /^package\/LICENSE$/, /^package\/styles\.css$/, /^package\/dist\//];
const stray = entries.filter((e) => !ALLOWED.some((re) => re.test(e)));
if (stray.length) {
  console.error(`${file} contains unexpected files:\n  ${stray.join("\n  ")}`);
  process.exit(1);
}
const need = ["package/dist/index.js", "package/dist/index.cjs", "package/dist/index.d.ts", "package/styles.css"];
const missing = need.filter((n) => !entries.includes(n));
if (missing.length) {
  console.error(`${file} is missing: ${missing.join(", ")}`);
  process.exit(1);
}

const entry = execFileSync("tar", ["-xzOf", file, "package/dist/index.js"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
if (!entry.startsWith('"use client";')) {
  console.error(`${file}: package/dist/index.js does not start with "use client"; Next would treat the table as a server component`);
  process.exit(1);
}

const newest = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((latest, d) => {
    const path = join(dir, d.name);
    return Math.max(latest, d.isDirectory() ? newest(path) : statSync(path).mtimeMs);
  }, 0);
const sourceTime = Math.max(
  newest("src"),
  statSync("styles.css").mtimeMs,
  statSync("package.json").mtimeMs,
  statSync("README.md").mtimeMs,
);
if (statSync(file).mtimeMs < sourceTime) {
  console.error(`${file} is older than the newest source file: run \`pnpm build && pnpm pack\` again`);
  process.exit(1);
}

console.log(`${file}: ${entries.length} files, all expected, current, "use client" intact`);
