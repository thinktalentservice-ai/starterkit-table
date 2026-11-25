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
`@mui/material` (>=9), `@mui/x-date-pickers`, `material-react-table` (^3.2.1),
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
