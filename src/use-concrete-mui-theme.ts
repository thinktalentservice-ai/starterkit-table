import { useEffect, useState } from "react";
import { createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { createStarterkitTheme } from "@devopsnext/starterkit-theme/mui";
import { useConcreteTheme } from "@devopsnext/starterkit-theme/react";

// material-react-table runs MUI colour math (lighten / darken / alpha) on the
// palette and on its own mrtTheme colours. The starterkit MUI theme's palette is
// var(--token) strings, which decomposeColor() throws on ("Unsupported
// `var(--card)` color"), so MRT cannot render under it as-is.
//
// This hook resolves the tokens MRT needs to concrete colours and builds a scoped
// theme: typography and component overrides come from the theme package's own
// createStarterkitTheme() (static var() objects, MRT-safe), only the palette is
// swapped for concrete colours.
//
// A token is resolved by painting it onto a hidden probe and reading the computed
// colour back, NOT by reading the custom property: getComputedStyle returns a
// custom property's raw text, so a token defined as color-mix() or
// rgb(var(--x-channel) / a) would come back unparseable. The probe always yields
// rgb()/rgba()/color(), all of which MUI can parse.
//
// Rebuilt on two triggers: useConcreteTheme() (MUI's resolved scheme, the only
// signal before the DOM attribute exists) and a MutationObserver on <html>
// (direct attribute writes MUI never reports). Returns null until mounted, and
// when a token resolves to nothing (no preset sheet loaded): getComputedStyle is
// browser-only, so callers render a placeholder first.

const TOKENS = {
  primary: "--primary",
  primaryBg: "--primary-bg",
  secondary: "--secondary",
  success: "--success",
  warning: "--warning",
  warningText: "--warning-text",
  danger: "--danger",
  info: "--info",
  card: "--card",
  surfaceElevated: "--surface-elevated",
  fg1: "--fg1",
  fg2: "--fg2",
  border: "--border",
} as const;

export const TOKEN_NAMES: readonly string[] = Object.values(TOKENS);

type TokenKey = keyof typeof TOKENS;

export type KitMuiTheme = Theme & {
  kitTable: {
    baseBackgroundColor: string;
    menuBackgroundColor: string;
    selectedRowBackgroundColor: string;
    pinnedRowBackgroundColor: string;
    matchHighlightColor: string;
  };
};

function resolveTokens(): { colors: Record<TokenKey, string>; missing: string[] } {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const root = getComputedStyle(document.documentElement);
  const colors = {} as Record<TokenKey, string>;
  const missing: string[] = [];
  for (const key of Object.keys(TOKENS) as TokenKey[]) {
    const name = TOKENS[key];
    // An undefined token makes var() invalid, and the probe would then inherit a
    // plausible colour; check the property itself first.
    const raw = root.getPropertyValue(name).trim();
    if (!raw) {
      missing.push(name);
      continue;
    }
    probe.style.color = "";
    probe.style.color = `var(${name})`;
    const painted = getComputedStyle(probe).color;
    // An engine that cannot resolve var() (jsdom) hands the text back; a plain
    // colour value is then the best answer, and the only one that parses.
    colors[key] = painted && !painted.startsWith("var(") ? painted : raw;
  }
  probe.remove();
  return { colors, missing };
}

export function useConcreteMuiTheme(): KitMuiTheme | null {
  const scheme = useConcreteTheme();
  const [theme, setTheme] = useState<KitMuiTheme | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    // Logged once per distinct missing set, not on every <html> write.
    let reported = "";

    const build = () => {
      const { colors: c, missing } = resolveTokens();
      if (missing.length) {
        const key = missing.join(", ");
        if (key !== reported) {
          reported = key;
          console.error(`[starterkit-table] theme tokens unresolved, table theme not built: ${key}`);
        }
        // Keep a theme that already built: dropping it would unmount the table
        // and lose its search, sort, selection and page.
        return;
      }
      reported = "";
      const isDark = (root.dataset.muiColorScheme || scheme) === "dark";
      const base = createStarterkitTheme();
      const scoped = createTheme({
        palette: {
          mode: isDark ? "dark" : "light",
          primary: { main: c.primary },
          secondary: { main: c.secondary },
          success: { main: c.success },
          warning: { main: c.warning, light: c.warningText },
          error: { main: c.danger },
          info: { main: c.info },
          background: { default: c.card, paper: c.card },
          text: { primary: c.fg1, secondary: c.fg2 },
          divider: c.border,
        },
        shape: { borderRadius: 12 },
        typography: base.typography,
        components: base.components,
      }) as KitMuiTheme;
      // Concrete colours for MRT's own surfaces (see KitTable's mrtTheme).
      scoped.kitTable = {
        baseBackgroundColor: c.card,
        menuBackgroundColor: c.card,
        selectedRowBackgroundColor: c.primaryBg,
        pinnedRowBackgroundColor: c.surfaceElevated,
        matchHighlightColor: c.primaryBg,
      };
      setTheme(scoped);
    };

    build();
    const observer = new MutationObserver(build);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-mui-color-scheme", "data-theme", "class", "style"],
    });
    // The preset sheet may land after this effect runs (CSS injected after
    // hydration, a stylesheet <link> finishing, a brand sheet swapped at runtime).
    // Retry when <head> changes and when any stylesheet finishes loading;
    // <link> load events do not bubble, hence capture.
    const headObserver = new MutationObserver(build);
    headObserver.observe(document.head, { childList: true, subtree: true });
    document.addEventListener("load", build, true);
    return () => {
      observer.disconnect();
      headObserver.disconnect();
      document.removeEventListener("load", build, true);
    };
  }, [scheme]);

  return theme;
}
