import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // NOT `treeshake: true`: it re-runs the bundle through rollup, which strips the
  // "use client" banner below and ships a build Next treats as a server component.
  target: "es2020",
  // Every peer stays external, or consumers get two Reacts / two MUIs / two MRTs.
  external: [
    "react",
    "react-dom",
    "@mui/material",
    "@mui/icons-material",
    "lucide-react",
    "@mui/x-date-pickers",
    "@emotion/react",
    "@emotion/styled",
    "material-react-table",
    "@devopsnext/starterkit-theme",
  ],
  // esbuild strips top-of-file directives, so re-attach to every chunk.
  banner: { js: '"use client";' },
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
});
