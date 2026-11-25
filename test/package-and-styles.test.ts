import { existsSync, readFileSync } from "node:fs";
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

const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return "";
  return css.slice(start, css.indexOf("}", start));
};

describe("styles.css: standalone Pager vs in-table Pager", () => {
  it("gives the standalone .skt-pager a top border on the elevated surface", () => {
    const base = rule(".skt-pager");
    expect(base).toContain("border-top: 1px solid var(--border)");
    expect(base).toContain("background: var(--surface-elevated)");
    expect(base).not.toContain("--primary-channel");
  });

  it("applies the soft rounded primary wash only inside the table frame", () => {
    const inFrame = rule(".skt-frame .skt-pager");
    expect(inFrame).toContain("rgb(var(--primary-channel) / 0.06)");
    expect(inFrame).toContain("border-radius: 10px");
    expect(inFrame).toContain("border-top: 0");
  });
});

describe("styles.css", () => {
  it("keeps the loading placeholder transparent, as in the app (no grey block while the theme resolves)", () => {
    expect(css).toMatch(/\.skt-frame\.skt-placeholder\s*\{[^}]*background:\s*transparent/);
  });
});

describe("icons", () => {
  it("declares lucide-react as a peer and ships no hand-drawn icon module", () => {
    expect(pkg.peerDependencies["lucide-react"]).toBeDefined();
    expect(existsSync("src/icons.tsx")).toBe(false);
  });
});
