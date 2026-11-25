# @devopsnext/starterkit-table

The Think Talent page-kit data table on [material-react-table](https://www.material-react-table.com/):
search, live count, per-column filters with valid-mode menus, selection strip,
row actions, detail rows, pager, empty state. Styled only with
[`@devopsnext/starterkit-theme`](https://www.npmjs.com/package/@devopsnext/starterkit-theme)
tokens, so it follows the active brand and light/dark scheme.

## Install

```bash
pnpm add @devopsnext/starterkit-table@<version>
```

Peers (install them in the host, one copy each): `react`, `react-dom` (>=18),
`@mui/material` (>=9), `@mui/icons-material` (>=6, imported by material-react-table), `lucide-react` (>=1, the search, clear, pager and empty-state icons), `@mui/x-date-pickers`, `material-react-table` (^3.2.1),
`@emotion/react`, `@emotion/styled`, and `@devopsnext/starterkit-theme` (>=1.7.0).

## Use

Import the stylesheets once, at the app root, theme first:

```js
import "@devopsnext/starterkit-theme/presets/think.css"; // the tokens
import "@devopsnext/starterkit-theme/styles.css";
import "@devopsnext/starterkit-table/styles.css";
```

The table needs a MUI `ThemeProvider` above it (the starterkit theme's
`createStarterkitTheme()` is the usual one). Inside it renders under its own
scoped theme with concrete colours resolved from the tokens, because MRT cannot
parse `var(--token)` colours.

```jsx
import { KitTable, idFilter } from "@devopsnext/starterkit-table";

const columns = [
  { accessorKey: "id", header: "ID", size: 110, ...idFilter },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status", filterVariant: "select",
    filterSelectOptions: ["Active", "Archived"] },
];

<KitTable
  columns={columns}
  data={rows}
  getRowId={(r) => String(r.id)}
  noun="accounts"
  rowActions={(r) => [{ label: "Open", to: `/accounts/${r.id}`, showLabel: true }]}
  renderLink={({ href, children, ...rest }) => <Link href={href} {...rest}>{children}</Link>}
/>
```

### Props

`columns`, `data`, `getRowId`, `isLoading`, `noun`, `searchPlaceholder`,
`actions`, `bulkActions(rows, clear)`, `rowActions(row)`, `renderLink`,
`renderDetailPanel(row)`, `initialSort`, `emptyTitle`, `emptyHint`, `emptyIcon`,
`initialState`, `filters`, `total`, `getRowClassName`, `actionsSize`,
`actionsHeader`, `searchResetKey`, `sortResetKey`, `selectionResetKey`,
`isRowLocked`, `searchAriaLabel`, `pageSizes`, `countAtEnd`. Any other prop goes
straight to `useMaterialReactTable`. The full contract is the doc comment on
`KitTable` in `src/kit-table.tsx`.

`renderLink` renders row-action items that have `to`. Without it they are plain
`<a href>`; pass your router's link to get client-side navigation.

Icons: the table's own icons are `lucide-react` (same set the System Owner app uses). The
full-screen toggle uses `@mui/icons-material` so it matches the MRT buttons beside it
(filters, columns, density), which are MUI icons.

### Toolbar options

Every control the material-react-table toolbar offers is available, and each one
is switched on or off with the `toolbar` prop:

```jsx
<KitTable {...props} toolbar={{ search: true, filters: true, columns: true, density: true, fullScreen: true }} />
<KitTable {...props} toolbar={{ search: false, columns: false }} />   // hide some, keep the rest
```

| Option | Control | Default |
|---|---|---|
| `search` | search box | on |
| `filters` | show/hide the per-column filter row | on |
| `columns` | show/hide columns menu | on |
| `density` | row density: comfortable, compact, spacious (`initialState.density` sets the start) | off |
| `fullScreen` | table fills the viewport; Esc or the button leaves | off |

Defaults keep the kit's look (the first three on). Other material-react-table
options (grouping, column ordering, pinning, faceted values, filter variants such as
`multi-select`, `range-slider`, `date`) are passed straight through to
`useMaterialReactTable`; they are MRT's own, not re-tested here.

### Filter modes

Each filterable column's filter icon lists only the modes valid for it
(`applyFilterModes`, applied by `KitTable`):

| Column | Modes |
|---|---|
| text (default) | contains, startsWith, endsWith, equals, notEquals, empty, notEmpty |
| ID (`...idFilter`) | contains, startsWith, equals, notEquals |
| `select`, `multi-select` | none (no icon) |
| range / date variants | MRT's own |

Fuzzy is not offered. A column can set its own `columnFilterModeOptions`
(and a `filterFn` from that list) to override. Filterable columns are raised to
a 140px minimum so the icon does not cut the placeholder.

### Also exported

`KitDetail`, `Toolbar`, `ResultCount`, `EmptyState`, `Pager`, `RowActions`,
`SearchInput`, `useConcreteMuiTheme`, `applyFilterModes`, `idFilter`,
`TEXT_MODES`, `ID_MODES`.

## Known issues

- Opening a column filter menu logs `React does not recognize the MenuListProps
  prop` in development. material-react-table 3.2.1 still passes `MenuListProps`,
  which MUI 9 removed; it cannot be overridden from outside MRT. Harmless at
  runtime.
- Classes are prefixed `skt-`. The one host class the table styles is
  `pk-cell-muted` inside a cell (a two-line clamp), kept by name.

## Develop

```bash
pnpm install
pnpm verify      # typecheck + test + build
pnpm pack        # -> devopsnext-starterkit-table-<version>.tgz
pnpm pack:check  # fails if the tarball holds anything but dist, styles.css, README, LICENSE
```
