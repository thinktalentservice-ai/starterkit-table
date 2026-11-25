# @devopsnext/starterkit-table: Phase 2 Plan (publish, adopt, clean up)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship `@devopsnext/starterkit-table` 0.1.0 to npm, move System Owner off the local tarball onto that exact version, and delete the app's now-dead copies of the table code.

**Architecture:** Four stages in strict order, each ending at a verifiable state: (1) harden the library, (2) release it, (3) pin it in the host, (4) delete the host's dead code. Every irreversible step (publish, push, PR) is a stop for the user.

**Tech Stack:** as phase 1 (TS, tsup, vitest, pnpm); npm public registry (`registry.npmjs.org`, scope `@devopsnext`, `npm whoami` = `devopsnext`).

**Specs:** `docs/superpowers/specs/2026-11-25-starterkit-table-design.md`; phase-1 plan `docs/superpowers/plans/2026-11-25-starterkit-table.md`.

## Where phase 1 left things

- Library repo `C:\github\template\starterkit-table`, branch `feat/initial-table` (pushed, 6 commits, not merged to `main`). 38 tests green. `*.tgz` is gitignored, so the tarball is not in git.
- Host repo `C:\think_talent_ai\nextv3-system-owner2-react`: branch `feat/starterkit-table-tarball` (2 commits, local only) stacked on `feat/kit-table-standard-filters` (pushed, **no PR open yet**, not merged). `package.json` pins `file:C:/github/...tgz`: not mergeable.
- Baseline screenshots for pixel diffs are in the host's `.playwright-cli/before-*.png` (gitignored): manage-admin with filters open, client-list.
- Host supply-chain gate (`pnpm-workspace.yaml`): `minimumReleaseAge: 1440`, strict. A same-day package needs an exact `minimumReleaseAgeExclude` line with a `# published <ISO8601>` marker, enforced by `scripts/check-release-age.mjs`.

## Global Constraints

- **Use pnpm, not npm,** for everything in this repo (install, scripts, pack, publish, view, whoami). Publish from `main` with `pnpm publish --access public` (pnpm checks branch and clean tree; `--no-git-checks` only for a dry run elsewhere).
- Never `pnpm publish`, `git push` to a shared branch, or open/merge a PR without the user saying so for that step (each is a stop).
- PRs for the host go to `thinktalentservice-ai/nextv3-system-owner2-react` (origin), never upstream.
- The host pin ends as a bare exact version (`"0.1.0"`), no caret, no `file:`.
- Visual parity is the acceptance test: 0 differing pixels (every 2nd px, RGB delta > 12) against the `before-*` baselines in light scheme, on every page touched.
- Detailed commit bodies (what / why / how / not verified), `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Delete a host class, component or file only after a grep shows zero remaining users.

## Review Focus

1. A fresh clone of the host with the published package installs and builds (no machine-local path anywhere in `package.json` or the lockfile).
2. `pnpm build` (production) of the host passes: phase 1 only ran the dev server.
3. A class deleted from `_page-kit.scss` / `_kit-table.scss` that a page still uses (`pk-actions`, `pk-action` are used directly by user-management; `pk-frame` by two pages).
4. The library's CSS cascade position after the host's `style.scss` still beats Bootstrap for table rules.
5. `next/link` row actions still client-navigate under the `/system-owner` basePath.

---

## Open decisions (need the user's answer before Stage 2)

1. **Who runs `pnpm publish`.** `pnpm whoami` here is `devopsnext`, so publishing from this machine is possible. Recommended: the agent prepares everything and runs `pnpm publish --dry-run`; the user runs the real `pnpm publish --access public` (or says "publish" explicitly for that one step).
2. **Version.** Recommended `0.1.0` (first release, API may still move), since nothing is published yet.
3. **Shim.** Recommended: keep `src/components/common/kit-table.jsx` as the single place that binds `next/link` to `renderLink` (17 lines), rather than editing 14 call sites to pass it. Pages keep their import path.

---

### Stage 1: Harden the library (before anything is public)

A published version cannot be edited, so the deferred minors that are cheap and user-visible land first. One task each, TDD (test fails first), `pnpm verify` green after each.

**Files:** `src/chrome.tsx`, `src/kit-table.tsx`, `src/filter-modes.ts`, `styles.css`, `scripts/check-pack.mjs`, `test/*`

- [ ] **1.1 Pager range clamp.** `Pager` clamps `page` to `[1, pages]` before computing start/end. Test: `page=4,pageSize=10,total=25` shows `21–25 of 25` and never `31–25`.
- [ ] **1.2 No fake count while loading.** `KitPager` returns null when `table.getState().isLoading`. Test: `isLoading` with `data=[]` renders no `.skt-pager`.
- [ ] **1.3 `rowActions` JSX arrays.** Narrow the return type to `RowActionItem[] | ReactElement | null`; treat an array as items only if every entry has a string `label`. Test: `rowActions` returning `[<A/>,<B/>]`-style nodes renders them, not empty buttons.
- [ ] **1.4 `applyFilterModes` edges.** Leave a column untouched when `filterFn` is a function; do not set `filterFn` when the caller gave `initialState.columnFilterFns[id]` (pass `initialState` through as an optional second arg); an explicit non-text `filterFn` with no options is left unchanged. Tests: one per case.
- [ ] **1.5 Standalone `Pager` look.** `.skt-pager` keeps the base (border-top, `--surface-elevated`); `.skt-frame .skt-pager` carries the in-table wash. Test reads `styles.css` for both selectors. Parity is re-proved in Stage 3.
- [ ] **1.6 Radii.** Decide per value: map to `--radius`, `--radius-chip`, `--radius-card` only where the rendered px is identical in light (8/6/12) and dark; otherwise amend the spec to say radii stay as literals. Record the ruling in the commit. (Do not trade parity for purity.)
- [ ] **1.7 `check-pack` freshness.** Fail if `package/dist/index.js` does not start with `"use client";` or is older than the newest `src/` file. Add a test-less script check run by `pnpm verify`.
- [ ] **1.8 Close the test gaps.** Loading test uses a nested `getRowId` (`r => r.group.groupId`) and asserts `.MuiSkeleton-root`; the missing-token test asserts the logged message names the tokens; add "no pager at `data=[]`".
- [ ] **1.9** `pnpm verify`; commit per task; push `feat/initial-table`.

### Stage 2: Release engineering

**Files:** `.github/workflows/ci.yml` (new), `package.json`, `.gitignore`, `README.md`

- [ ] **2.1 CI.** Model `.github/workflows/ci.yml` on the sibling libraries' (checkout, pnpm, node 22, `pnpm install --frozen-lockfile`, `pnpm verify`, `pnpm pack` + `pnpm pack:check`). Push; CI must be green on the branch.
- [ ] **2.2 Publish metadata.** Add `repository`, `homepage`, `bugs`, `publishConfig: {access: "public"}`, and `prepublishOnly: "pnpm verify && pnpm pack:check"` (pack first inside the script). Keep `*.tgz` ignored; document that the tarball is a build artifact.
- [ ] **2.3 PR.** Open a PR `feat/initial-table` → `main` in `thinktalentservice-ai/starterkit-table`. **Stop: user reviews and merges.**
- [ ] **2.4 Dry run.** On `main`: `pnpm publish --dry-run`. Expected: file list = `dist`, `styles.css`, `README.md`, `LICENSE`, `package.json` only. **Stop: user decides to publish** (decision 1).
- [ ] **2.5 Publish and tag.** `pnpm publish --access public`; `git tag v0.1.0 && git push origin v0.1.0`. Verify: `pnpm view @devopsnext/starterkit-table version` prints `0.1.0`; record `pnpm view @devopsnext/starterkit-table time --json` for the release-age marker. (Never read a single time key with a dotted path: the registry client splits on dots and returns nothing.)

### Stage 3: Host adopts the published version

**Branch:** new `feat/starterkit-table-adopt` off the merged host `main`. **Precondition:** `feat/kit-table-standard-filters` is merged first (open its PR to origin `main`, user merges); the local `feat/starterkit-table-tarball` commits are cherry-picked as a base, then the pin is changed.

- [ ] **3.1** Replace the `file:` pin with `pnpm add @devopsnext/starterkit-table@0.1.0 --save-exact`; open `package.json` and confirm a bare `"0.1.0"`.
- [ ] **3.2** Add to `pnpm-workspace.yaml` `minimumReleaseAgeExclude`: `'@devopsnext/starterkit-table@0.1.0' # published <ISO from 2.5>`, with the bridge comment the existing entries carry. Delete the line once 24h have passed. `node scripts/check-release-age.mjs` passes.
- [ ] **3.3** `pnpm install --frozen-lockfile` in a **fresh clone** of the branch (Review Focus 1). `grep -n "file:" package.json pnpm-lock.yaml` finds no table entry.
- [ ] **3.4** `pnpm build` (production). Fix anything it reports; record the result.
- [ ] **3.5** Pixel parity: reload and screenshot `/admin/manage-admin` (filters open) and `/admin/client-list` against the `before-*` baselines; 0 differing pixels. Also eyeball dark mode and `/admin/group-management`, `/admin/manage-role`.
- [ ] **3.6** Commit; push; **stop** for the PR to origin `main` (user merges).

### Stage 4: Delete the host's dead copies

**Branch:** `chore/remove-local-table-code` off Stage 3's merged `main`. Each deletion is preceded by a grep showing zero users (Global Constraints); the grep output goes in the commit body.

- [ ] **4.1 Filters copy.** `src/components/common/kit-table-filters.js` is imported by 10 pages for `idFilter`. Re-export it from the shim (`export { idFilter } from '@devopsnext/starterkit-table'`), point the 10 imports at the shim, delete the file.
- [ ] **4.2 Theme hook.** `src/utils/theme/use-concrete-mui-theme.js` has no users after the shim; delete it. Check `font-typography.mjs` is still used by `mui-theme.js` before touching it (it is: leave it).
- [ ] **4.3 Page-kit components.** In `src/components/page/index.jsx` remove `Pager`, `ResultCount`, `RowActions` (0 users outside the old table). Keep `Toolbar` (2 users), `EmptyState` (3), `Tag`, `TabBar`, `PageHeader`, `Page`, `UnitShare`.
- [ ] **4.4 SCSS.** Delete `src/assets/scss/_kit-table.scss` and its `@import 'kit-table'`. In `_page-kit.scss` delete only rules with zero remaining users: expected `.pk-pager*`, `.pk-count`; **keep** `.pk-actions`/`.pk-action*` (user-management uses them directly), `.pk-frame` (two pages), `.pk-link-btn` (usage-dashboard), `.pk-toolbar`, `.pk-empty*`.
- [ ] **4.5 SearchInput.** `src/components/form/search-input.jsx` is used only by `views/role/permission-picker.jsx`: re-export the library's `SearchInput` from `components/form/index.js` and delete the local file. Optional: skip if the picker's look changes by any pixel.
- [ ] **4.6** `pnpm build`; pixel parity on the five pages from 3.5; `grep -rn "kt-\|\.kt\b" src` empty.
- [ ] **4.7** Commit per deletion group; push; **stop** for the PR.

## Self-review

- Spec coverage: publish (Stage 2), exact pin (3.1), local-copy removal (Stage 4), deferred minors (Stage 1). The two unresolved spec statements (radii literals, icons peer) are 1.6 and phase-1's fix.
- Order dependencies: Stage 3 needs the `standard-filters` host PR merged, otherwise the library's filter modes would be compared against a `main` that lacks them.
- Not covered: Storybook/docs site, a second consumer app, automated visual regression in CI (the pixel diff stays manual), the MRT `MenuListProps` warning (needs an MRT upgrade or a patch; track separately).
