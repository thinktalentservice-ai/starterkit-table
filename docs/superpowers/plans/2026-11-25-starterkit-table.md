# @devopsnext/starterkit-table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the System Owner app's `KitTable` and its page-kit chrome into `@devopsnext/starterkit-table`, pack a tarball, and run the app on it unchanged.

**Architecture:** TypeScript library built like `starterkit-button-component` (tsup ESM+CJS+d.ts, vitest, hand-written token-only `styles.css`). Port the app's JSX/SCSS 1:1 into TSX/flat CSS under an `skt-` class prefix; the app keeps a one-file shim so its 14 call sites do not change.

**Tech Stack:** React 19, TypeScript 5.9, tsup, vitest + @testing-library/react + jsdom, material-react-table 3.2.x, MUI 9, `@devopsnext/starterkit-theme` 1.7.0.

**Spec:** `docs/superpowers/specs/2026-11-25-starterkit-table-design.md` (this repo).

**Source to port (read-only reference, host app):** `C:\think_talent_ai\nextv3-system-owner2-react\src\`
`components/common/kit-table.jsx`, `components/common/kit-table-filters.js`, `components/page/index.jsx` (Toolbar, ResultCount, EmptyState, Pager, RowActions), `components/form/search-input.jsx`, `utils/theme/use-concrete-mui-theme.js`, `assets/scss/_kit-table.scss`, and the `.pk-toolbar`, `.pk-count`, `.pk-frame`, `.pk-pager*`, `.pk-actions`/`.pk-action*`, `.pk-empty*`, `.pk-link-btn` rules in `assets/scss/_page-kit.scss`.

## Global Constraints

- Package name `@devopsnext/starterkit-table`, version `0.1.0`, MIT, repo `C:\github\template\starterkit-table`.
- Runtime dependencies: none. Peers: `react`, `react-dom` `>=18`; `@mui/material` `>=9`; `@mui/x-date-pickers`; `material-react-table` `^3.2`; `@emotion/react`; `@emotion/styled`; and `@devopsnext/starterkit-theme` `>=1.7.0` (required peer: runtime imports of `/react` and `/mui`).
- Dev dependency `@devopsnext/starterkit-theme` pinned exactly `1.7.0`.
- Library CSS and sx: tokens only, no colour literal. Classes prefixed `skt-`.
- No import of `next/*` or any host-app path. Icons are inline SVG (search, clear, chevron-left, chevron-right, inbox).
- Every component that reads the MRT table instance keeps the `'use no memo'` directive (React Compiler is on in the host).
- tsup banner `"use client";`; `sideEffects: ["*.css"]`; `files: ["dist","styles.css","README.md"]`; exports `.` and `./styles.css`.
- `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true }`.
- Commits: detailed developer-grade bodies, `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` trailer. Work on branch `feat/initial-table` in this repo.

## Review Focus

1. `KitTable` with `isLoading` true and `data=[]`: renders skeleton, never throws (MRT feeds `{}` rows through `getRowId`).
2. Theme tokens missing (no preset sheet imported): `useConcreteMuiTheme` returns `null` and logs the missing token names; the table shows its placeholder instead of throwing in `createTheme`.
3. `RowActions` item with `to` and no `renderLink`: renders an `<a href>`; click does not bubble to the row.
4. `Pager` with `total` 0 renders nothing (KitPager) and with `page` past the end disables Next.
5. Row selection drops ids no longer in `data` after a refetch (`liveSelection`).

---

### Task 1: Package scaffold and filter modes

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `pnpm-workspace.yaml`, `src/filter-modes.ts`, `src/index.ts`, `test/filter-modes.test.ts`
- Modify: `.gitignore` (add `dist`, `node_modules`, `*.tgz` is NOT ignored: the tarball is committed like sibling libs)

**Interfaces:**
- Produces (`src/filter-modes.ts`):
  - `type FilterMode = 'contains'|'startsWith'|'endsWith'|'equals'|'notEquals'|'empty'|'notEmpty'`
  - `const TEXT_MODES: FilterMode[]`, `const ID_MODES: FilterMode[]`
  - `const idFilter: { filterFn: 'contains'; columnFilterModeOptions: FilterMode[]; muiFilterTextFieldProps: { placeholder: string } }`
  - `function applyFilterModes<T extends MRT_RowData>(columns: MRT_ColumnDef<T>[]): MRT_ColumnDef<T>[]`
- Source: `kit-table-filters.js` in the host app (port verbatim, add types).

- [ ] **Step 1:** Create `package.json` modelled on `../starterkit-button-component/package.json` (name, version `0.1.0`, scripts `build` = `tsc --noEmit && tsup`, `typecheck`, `test`, `verify`, peers and devDeps per Global Constraints; copy the sibling's toolchain versions). Create `tsconfig.json`, `tsup.config.ts` (entry `src/index.ts`, banner `"use client";`, externals = all peers), `vitest.config.ts` (jsdom, globals), `pnpm-workspace.yaml`.
- [ ] **Step 2:** `pnpm install`. Expected: lockfile written. If pnpm's release-age gate blocks `@devopsnext/starterkit-theme@1.7.0`, add a dated, exact `minimumReleaseAgeExclude` entry with the same warning comment the sibling uses.
- [ ] **Step 3: Write failing tests** in `test/filter-modes.test.ts`:
  - `text column gets TEXT_MODES and filterFn 'contains'`: `applyFilterModes([{accessorKey:'name'}])[0]` has `columnFilterModeOptions` equal to `TEXT_MODES` and `filterFn === 'contains'`.
  - `idFilter spread wins and filterFn defaults to first allowed mode`: column `{accessorKey:'id', ...idFilter}` keeps `ID_MODES`; a column with `columnFilterModeOptions:['equals']` and no `filterFn` gets `filterFn 'equals'`.
  - `select and multi-select get enableColumnFilterModes false`.
  - `enableColumnFilter false, range and date variants are returned unchanged` (toBe same object).
  - `grouped columns recurse`: `{columns:[{accessorKey:'a'}]}` child gets modes.
  - `size below 140 is raised to 140, undefined size stays undefined`, `idFilter carries placeholder 'Filter'`.
- [ ] **Step 4:** `pnpm test`. Expected: FAIL, `applyFilterModes` not defined.
- [ ] **Step 5:** Implement `src/filter-modes.ts` (port, typed) and `src/index.ts` exporting its names.
- [ ] **Step 6:** `pnpm test && pnpm typecheck`. Expected: all pass.
- [ ] **Step 7:** Commit `feat: scaffold package and per-column filter modes`.

### Task 2: Concrete MUI theme hook

**Files:**
- Create: `src/use-concrete-mui-theme.ts`, `test/use-concrete-mui-theme.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `useConcreteTheme` from `@devopsnext/starterkit-theme/react`.
- Produces: `type KitMuiTheme = Theme & { kitTable: { baseBackgroundColor: string; menuBackgroundColor: string; selectedRowBackgroundColor: string; pinnedRowBackgroundColor: string; matchHighlightColor: string } }` and `function useConcreteMuiTheme(): KitMuiTheme | null`.
- Source: host `use-concrete-mui-theme.js`. Differences: typography and `components` come from `createStarterkitTheme()` (`@devopsnext/starterkit-theme/mui`), no parent `useTheme()` and no app `FONT_TYPOGRAPHY` import; when any token resolves to an empty string, `console.error` the names and return `null`.

- [ ] **Step 1: Write failing tests** (`renderHook`, tokens set as inline custom properties on `document.documentElement`, a `ThemeProvider` wrapper):
  - `returns null before mount effect, then a theme whose palette.primary.main is a parseable colour` (assert `/^rgb/` ).
  - `returns null and logs missing token names when --card is undefined` (spy `console.error`, assert message contains `--card`).
  - `rebuilds when data-mui-color-scheme changes on <html>` (set attribute, `waitFor` mode `dark`).
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `useConcreteMuiTheme` as above. Resolve tokens with the hidden-probe technique from the source (a token defined with `color-mix()` must still resolve); jsdom returns the literal value, which is acceptable for the tests.
- [ ] **Step 4:** `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: concrete MUI theme hook derived from starterkit-theme tokens`.

### Task 3: Chrome components and styles

**Files:**
- Create: `src/icons.tsx`, `src/chrome.tsx`, `src/search-input.tsx`, `styles.css`, `test/chrome.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces (`src/chrome.tsx`):
  - `Toolbar({children})`, `ResultCount({shown:number; total:number; noun?:string})`, `EmptyState({icon?:ReactNode; title?:string; hint?:ReactNode})`
  - `Pager({page:number; pageSize:number; total:number; onPage:(p:number)=>void; children?:ReactNode})`
  - `type RenderLink = (p:{href:string; className:string; title:string; 'aria-label':string; onClick:(e:MouseEvent)=>void; children:ReactNode}) => ReactNode`
  - `RowActions({items:RowActionItem[]; renderLink?:RenderLink})` with `RowActionItem = {label:string; icon?:ReactNode; to?:string; onClick?:()=>void; primary?:boolean; showLabel?:boolean}`
- Produces (`src/search-input.tsx`): `SearchInput({value:string; onChange:(v:string)=>void; onClear?:()=>void; placeholder?:string; 'aria-label'?:string; sx?; ...TextFieldProps})`.
- Class rule for `styles.css`: every ported class becomes `skt-<name>`: `pk-toolbar`→`skt-toolbar`, `pk-toolbar__spacer`→`skt-toolbar__spacer`, `pk-count`→`skt-count`, `pk-pager*`→`skt-pager*`, `pk-actions`/`pk-action*`→`skt-actions`/`skt-action*`, `pk-empty*`→`skt-empty*`, `pk-link-btn`→`skt-link-btn`, `pk-frame`+`kt-frame` merge into `skt-frame`. SCSS nesting is flattened to plain CSS. Values stay `var(--token)`.

- [ ] **Step 1: Write failing tests** (`test/chrome.test.tsx`):
  - `ResultCount shows "N items" when shown===total and "X of N" otherwise`.
  - `EmptyState renders title and hint, role=status`.
  - `Pager shows "1–10 of 25", Previous disabled on page 1, Next disabled on last page, onPage called with page±1`.
  - `Pager with total 0 shows "0–0 of 0"`.
  - `RowActions renders <a href> when item has to and no renderLink`, `uses renderLink output when given`, `click stops propagation (row onClick not called)`, `button item calls onClick`.
  - `SearchInput passes the string to onChange and shows a clear button only when value is non-empty`.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `icons.tsx` (inline SVG, `aria-hidden`), `chrome.tsx`, `search-input.tsx` as ported from the source files, without `next/link` or `lucide-react`.
- [ ] **Step 4:** Create `styles.css` containing the ported chrome rules above. A grep of the file for `#[0-9a-fA-F]{3,8}\b` must return nothing.
- [ ] **Step 5:** `pnpm test && pnpm typecheck`. Expected: PASS.
- [ ] **Step 6:** Commit `feat: table chrome components and token-only styles`.

### Task 4: KitTable and KitDetail

**Files:**
- Create: `src/kit-table.tsx`, `test/kit-table.test.tsx`
- Modify: `src/index.ts`, `styles.css` (append `.skt-table*` rules ported from `_kit-table.scss`)

**Interfaces:**
- Consumes: Tasks 1-3 exports.
- Produces: `KitTable<T extends MRT_RowData>(props: KitTableProps<T>)` and `KitDetail({summary:ReactNode; items:{key:string; name:ReactNode; desc?:ReactNode}[]; empty:ReactNode})`. `KitTableProps<T>` is every prop in the host `KitTable` docblock (columns, data, getRowId, isLoading, noun, searchPlaceholder, actions, bulkActions, rowActions, renderDetailPanel, initialSort, emptyTitle, emptyHint, initialState, filters, total, getRowClassName, actionsSize, actionsHeader, searchResetKey, sortResetKey, selectionResetKey, isRowLocked, emptyIcon, searchAriaLabel, pageSizes, countAtEnd) plus `renderLink?: RenderLink` forwarded to the internal `RowActions`, plus pass-through of any other MRT option.
- Source: host `kit-table.jsx`. Port every behaviour and comment that explains a non-obvious decision; keep `'use no memo'`; root class `skt-table`; the per-column filter modes run through `applyFilterModes`; `enableColumnFilterModes: true`; filter fields `variant 'standard'`, `helperText: null`. `useConcreteMuiTheme()` null → render `<div class="skt-frame skt-placeholder" aria-busy="true">`. Keep `.skt-table td .pk-cell-muted` (the host's class name) in the CSS.

- [ ] **Step 1: Write failing tests** (wrap in a `ThemeProvider`; set the theme tokens on `<html>` in `beforeAll`):
  - `renders rows and "Showing"/count` for 3 rows (`findByText`).
  - `isLoading with data=[] renders without throwing` (Review Focus 1).
  - `search box filters rows` (type, expect row count text).
  - `select-all header checkbox appears only with bulkActions; selecting a row shows "1 selected" and Clear selection empties it`.
  - `selection drops ids missing from data after rerender` (Review Focus 5).
  - `empty data shows emptyTitle; with a query shows 'No <noun> match'`.
  - `pager: rowsPerPage select changes page size`.
  - `without theme tokens renders the placeholder, not a throw` (Review Focus 2).
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `src/kit-table.tsx`; append the table rules to `styles.css` (flattened, `skt-` prefixed, tokens only).
- [ ] **Step 4:** `pnpm test && pnpm typecheck`. Expected: PASS. MRT may log the known `MenuListProps` warning; do not suppress it.
- [ ] **Step 5:** Commit `feat: KitTable and KitDetail`.

### Task 5: Build, README, tarball

**Files:**
- Create: `README.md` (replace the stub), `scripts/check-pack.mjs`
- Modify: `package.json` (script `pack:check`)

**Interfaces:**
- Produces: `devopsnext-starterkit-table-0.1.0.tgz` in the repo root; `scripts/check-pack.mjs` exits non-zero if the tarball lists anything outside `package.json`, `README.md`, `LICENSE`, `styles.css`, `dist/**`.

- [ ] **Step 1:** README: install, peers, the two theme stylesheet imports plus `@devopsnext/starterkit-table/styles.css`, a minimal `KitTable` example, the `renderLink` prop, `idFilter`, the known `MenuListProps` warning.
- [ ] **Step 2:** `pnpm verify` (typecheck, test, build). Expected: all pass, `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` exist and `dist/index.js` starts with `"use client";`.
- [ ] **Step 3:** `pnpm pack`, then `node scripts/check-pack.mjs`. Expected: exit 0.
- [ ] **Step 4:** Commit `feat: README, pack check and 0.1.0 tarball`, push `feat/initial-table`.

### Task 6: Run the System Owner app on the tarball

**Files (host app `C:\think_talent_ai\nextv3-system-owner2-react`):**
- Modify: `package.json` (file pin), `src/components/common/kit-table.jsx` (becomes shim), root layout stylesheet import
- Before-state evidence: `.playwright-cli/before-*.png`

**Interfaces:**
- Consumes: the tarball and `KitTable`, `KitDetail`, `RenderLink` from the library.

- [ ] **Step 1:** New branch `feat/starterkit-table-tarball` off `feat/kit-table-standard-filters`. Using `dev-debug` (headed `playwright-cli`), capture baseline screenshots of `/admin/manage-admin` (the look the user wants preserved: sort arrows, per-column mode icons and kebab menus, role tags, `Open` row action, tinted pager band) and of `/admin/client-list`: default, filters open, ID mode menu open, one row selected if bulk actions exist, empty-filter state ("zzzz" in Account), in light and in dark.
- [ ] **Step 2:** `grep -rnE "\.kt(\b|-)" src --include=*.scss --include=*.jsx` outside `_kit-table.scss`. Every host rule that targets `.kt`, `.kt-*` or `.pk-*` classes inside a table (`_single-account.scss` is known) must be re-pointed at `.skt-*`; list them in the commit body.
- [ ] **Step 3:** `pnpm add file:C:/github/template/starterkit-table/devopsnext-starterkit-table-0.1.0.tgz`. Expected: `package.json` shows a `file:` spec and the pnpm lockfile changes.
- [ ] **Step 4:** Add `import '@devopsnext/starterkit-table/styles.css';` immediately after the theme stylesheet imports in the root layout.
- [ ] **Step 5:** Replace `src/components/common/kit-table.jsx` with the shim: a default export `KitTable` that renders the library's `KitTable` with `renderLink` bound to `next/link` (`({href, children, ...rest}) => <Link href={href} {...rest}>{children}</Link>`), and re-exports `KitDetail`. Keep a header comment saying it is a phase-1 shim.
- [ ] **Step 6:** Reload `/admin/client-list` headed. Take the same screenshots as Step 1 and compare: header band, filter row, mode icons, pager, row actions, count, light and dark. Exercise search, a filter mode, sort, page size and an `Open` row action link (must client-navigate). `playwright-cli console error`: only the known `MenuListProps` error is allowed.
- [ ] **Step 7:** Re-shoot `/admin/manage-admin` and compare to its baseline first; it is the acceptance page. Then visit two other KitTable pages (`/admin/group-management`, `/admin/manage-role`) and confirm they render and filter.
- [ ] **Step 8:** Commit on the host branch with a body that states: file pin is machine-local and **not mergeable**, which host SCSS was re-pointed, what was and was not compared. Do not push this branch to a PR.
