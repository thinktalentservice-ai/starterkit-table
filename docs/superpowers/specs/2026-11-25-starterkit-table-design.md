# @devopsnext/starterkit-table — design

Status: draft for approval · 2026-11-25 · phase 1 (tarball trial)

## Intent

`nextv3-system-owner2-react` renders every admin list through a local
`KitTable` (material-react-table inside the page-kit frame). It is copy-pasted
in spirit, not in code: it only works because the app also owns the page-kit
components (`Toolbar`, `Pager`, `EmptyState`, ...), the `pk-*` / `kt-*` SCSS and
a MUI-theme hook. Move all of that into one library so other Think Talent
apps get the same table, and so this app stops carrying 800+ lines of table
chrome.

Phase 1 is a trial: build a tarball, install it in the System Owner app,
swap `KitTable` for the library, confirm nothing changes on screen. If it
holds, phase 2 (not designed here) publishes and removes the app's copies.

## Goals

- `@devopsnext/starterkit-table`, repo `C:\github\template\starterkit-table`.
- Self-contained: the table, its chrome, its CSS. No import from the host app.
- Built on `@devopsnext/starterkit-theme`: CSS reads tokens only, no colour
  literals; the MRT colour theme is derived from tokens.
- Same look and behaviour as today's `KitTable` on `/admin/client-list`.
- One-file swap in the app (a shim), trivial to revert.

## Non-goals

- Publishing to npm. Phase 1 pins a local tarball and is **not mergeable**.
- Deleting the app's local `KitTable`, page-kit or SCSS (phase 2).
- Redesigning the API or the look.
- Storybook, brand tests, docs site.

## Anti-goals (would make it a failure even if it renders)

- Importing `next/*` or anything from the host app.
- A second copy of React or MUI in the app's bundle.
- Class names that collide with the app's still-present `pk-*` / `kt-*` CSS.
- A colour literal in the library's CSS or sx.

## Approaches considered

1. **Whole table kit (chosen by you).** Table + the five page-kit pieces it
   uses + search input + theme hook + one `styles.css`. Self-contained like the
   sibling libraries.
2. KitTable only, pieces injected by the host. Smaller, but the CSS stays in
   the host and the library silently depends on it. Rejected.
3. Headless hook only. Reuse is mostly the chrome, which this leaves out.
   Rejected.

## Design

**Layout** mirrors `starterkit-button-component`: TypeScript, `tsup` (ESM + CJS
+ d.ts, `"use client"` banner, sourcemaps), `vitest`, hand-written
`styles.css` (flat CSS, no Sass), `files: [dist, styles.css, README.md]`,
`sideEffects: ["*.css"]`, exports `.` and `./styles.css`. Starts at `0.1.0`.

**Public API** (src/index.ts):

| Export | From |
|---|---|
| `KitTable` (named), `KitDetail` | `kit-table.tsx` — same props as today's docblock |
| `Toolbar`, `ResultCount`, `EmptyState`, `Pager`, `RowActions` | page-kit pieces |
| `SearchInput` | form |
| `applyFilterModes`, `idFilter`, `TEXT_MODES`, `ID_MODES` | filter modes |
| `useConcreteMuiTheme` | theme hook |

**Dependencies.** Peers: `react`, `react-dom` (>=18), `@mui/material` (>=9),
`@mui/x-date-pickers`, `material-react-table` (^3.2), `@emotion/react`,
`@emotion/styled`, and **`@devopsnext/starterkit-theme` (`>=1.7.0`, required, not
optional)**: the library imports `useConcreteTheme` (`/react`) and
`createStarterkitTheme` (`/mui`) at runtime. Dev: the theme pinned exactly to
`1.7.0` (the app's version) plus its own toolchain. Runtime deps: none. The five icons
(search, clear, chevrons, inbox) are inline SVG, so no `lucide-react`.

**Theme.**
- `styles.css` reads tokens only (`--card`, `--border`, `--fg1/2`,
  `--primary-*`, `--surface-elevated`, ...). The host imports a preset sheet
  and the theme's `styles.css` first, as with every starterkit package.
- `useConcreteMuiTheme` keeps the probe technique (paint `var(--token)` on a
  hidden element, read the computed colour) because MRT's colour math throws on
  `var()` strings. Scheme-change triggers: `useConcreteTheme()` from
  `@devopsnext/starterkit-theme/react` plus a `MutationObserver` on `<html>`.
  Typography and component overrides come from the theme package's own
  `createStarterkitTheme()` (its `typography` and `components`, which are static
  `var()` objects, so they are MRT-safe); only the palette is replaced with
  concrete colours resolved from the tokens. The library therefore does not
  depend on what the host passed to its own `ThemeProvider`. All colours, radii,
  fonts and shadows in `styles.css` are the theme's `var(--token)`s.

**Namespacing.** Library classes use an `skt-` prefix (`skt-table`,
`skt-toolbar`, `skt-pager`, ...) so they cannot clash with the app's
`kt-*` / `pk-*` while both exist. Any table-specific class the app's pages use
today (`pk-cell-muted` inside `.kt td`) is mapped, not dropped.

**`next/link`.** `RowActions` items take `to`; the library renders an `<a>` by
default and accepts `renderLink` (or `linkComponent`) so the host can pass
`next/link`. The app's shim passes it.

**Behaviour to preserve** (everything in `KitTable`'s docblock): search +
count, filter row with standard-variant fields and per-column valid modes,
column toggles, selection strip + `bulkActions`, `rowActions`,
`renderDetailPanel`, pager with rows-per-page, empty state, the
`*ResetKey` props, `'use no memo'` on every component that reads the MRT
instance (React Compiler is on in the app), skeleton loading.

**App side (phase 1).** New branch off `feat/kit-table-standard-filters`.
`src/components/common/kit-table.jsx` becomes a shim:
`export { KitTable as default, KitDetail } from '@devopsnext/starterkit-table'`
with `renderLink` bound to `next/link`; the library's `styles.css` is imported
in the root layout next to the theme sheets. `package.json` gets a
`file:` pin to the tarball. The 14 call sites do not change.

## Constraints

- React Compiler is on in the host: the MRT-instance rule above must survive
  the TypeScript port.
- MUI 9 vs MRT 3.2.1: MRT passes props MUI 9 removed (`MenuListProps`, checkbox
  `inputProps`). The library keeps the app's checkbox workaround. The
  `MenuListProps` dev warning on the filter menu is **known and not fixed** in
  phase 1.
- Tarball pins break CI and fresh clones (path is machine-local). Hence
  not-mergeable.

## Verification (phase 1 done when)

1. `pnpm build` + `pnpm typecheck` + `pnpm test` pass in the library; tests
   cover `applyFilterModes` and a render smoke test.
2. `pnpm pack` yields `devopsnext-starterkit-table-0.1.0.tgz`; its contents
   are only `dist`, `styles.css`, README, LICENSE.
3. App installs it; `/admin/client-list` renders; screenshot is visually the
   same as before the swap (header band, filter row, pager, row actions,
   selection strip, empty state); filter menus, search, sort and paging work;
   no new console errors beyond the known `MenuListProps` one.
4. Light and dark scheme both checked once.

## Left to the builder

Exact `skt-*` class names, CSS file organisation, test fixtures, README
content, how the shim binds `renderLink`.

## Calls I made (change any)

TypeScript; `skt-` prefix; inline SVG icons; peers rather than bundled
MUI/MRT; theme dev-pinned to 1.7.0; `renderLink` prop for `next/link`; shim
file keeps the 14 call sites untouched; version `0.1.0`; no builder-check
subagent for a trial-phase doc.
