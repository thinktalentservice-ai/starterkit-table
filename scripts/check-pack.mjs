// Fails if the newest tarball in the repo root holds anything but the files the
// package is meant to ship. Run after `pnpm pack`.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";

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
console.log(`${file}: ${entries.length} files, all expected`);
