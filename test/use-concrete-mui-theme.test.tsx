import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { createStarterkitTheme } from "@devopsnext/starterkit-theme/mui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_NAMES, useConcreteMuiTheme } from "../src/use-concrete-mui-theme";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={createStarterkitTheme()}>{children}</ThemeProvider>
);

const setTokens = (skip?: string) => {
  for (const name of TOKEN_NAMES) {
    if (name !== skip) document.documentElement.style.setProperty(name, "rgb(10, 20, 30)");
  }
};

describe("useConcreteMuiTheme", () => {
  beforeEach(() => setTokens());
  afterEach(() => {
    cleanup(); // unmount first so the <html> observer is gone before the tokens are removed
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-mui-color-scheme");
    vi.restoreAllMocks();
  });

  it("builds a theme whose palette is concrete rgb colours MUI can parse", async () => {
    const { result } = renderHook(() => useConcreteMuiTheme(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.palette.primary.main).toMatch(/^rgb/);
    expect(result.current?.kitTable.baseBackgroundColor).toMatch(/^rgb/);
  });

  it("returns null and names the missing token when a token is undefined", async () => {
    document.documentElement.removeAttribute("style");
    setTokens("--card");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useConcreteMuiTheme(), { wrapper });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(result.current).toBeNull();
    expect(String(spy.mock.calls[0]?.[0])).toContain("--card");
  });

  it("rebuilds in dark mode when data-mui-color-scheme flips on <html>", async () => {
    const { result } = renderHook(() => useConcreteMuiTheme(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => {
      document.documentElement.setAttribute("data-mui-color-scheme", "dark");
    });
    await waitFor(() => expect(result.current?.palette.mode).toBe("dark"));
  });

  it("keeps the last good theme when a token later disappears, and logs the missing set once", async () => {
    const { result } = renderHook(() => useConcreteMuiTheme(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const good = result.current;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      document.documentElement.removeAttribute("style");
    });
    await act(async () => {
      document.documentElement.setAttribute("class", "a");
      document.documentElement.setAttribute("class", "b");
    });
    expect(result.current).toBe(good);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("builds the theme once tokens arrive in a stylesheet added to <head> after mount", async () => {
    document.documentElement.removeAttribute("style");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useConcreteMuiTheme(), { wrapper });
    await act(async () => {});
    expect(result.current).toBeNull();
    await act(async () => {
      const style = document.createElement("style");
      style.textContent = ":root{" + TOKEN_NAMES.map((n) => n + ":rgb(10, 20, 30)").join(";") + "}";
      document.head.appendChild(style);
    });
    await waitFor(() => expect(result.current).not.toBeNull());
  });
});
