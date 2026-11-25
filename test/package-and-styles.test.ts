import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const css = readFileSync("styles.css", "utf8");

describe("package contract", () => {
  it("declares @mui/icons-material as a peer (material-react-table imports it)", () => {
    expect(pkg.peerDependencies["@mui/icons-material"]).toBeDefined();
  });

  it("lists @mui/icons-material in the README peers", () => {
    expect(readFileSync("README.md", "utf8")).toContain("@mui/icons-material");
  });
});

describe("styles.css", () => {
  it("keeps the loading placeholder transparent, as in the app (no grey block while the theme resolves)", () => {
    expect(css).toMatch(/\.skt-frame\.skt-placeholder\s*\{[^}]*background:\s*transparent/);
  });
});
