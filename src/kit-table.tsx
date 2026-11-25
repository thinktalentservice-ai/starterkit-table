import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Checkbox from "@mui/material/Checkbox";
import { ThemeProvider } from "@mui/material/styles";
import {
  MaterialReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleFiltersButton,
  useMaterialReactTable,
} from "material-react-table";
import type {
  MRT_ColumnDef,
  MRT_RowData,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_TableInstance,
  MRT_TableOptions,
} from "material-react-table";
import { EmptyState, Pager, ResultCount, RowActions, Toolbar } from "./chrome";
import type { RenderLink, RowActionItem } from "./chrome";
import { applyFilterModes } from "./filter-modes";
import { SearchInput } from "./search-input";
import { useConcreteMuiTheme } from "./use-concrete-mui-theme";

/**
 * Page-kit table on material-react-table. Styles: styles.css (`.skt-*`).
 *
 * Renders the kit toolbar (search, live count, filter + column toggles, page
 * actions), then the table frame: a selection strip when rows are selected,
 * the MRT table, and the kit pager.
 *
 * - `bulkActions(rows, clear)` turns on row checkboxes. It renders into the
 *   selection strip and receives the selected originals; call `clear()` once
 *   the action has succeeded.
 * - `rowActions(row)` returns RowActions items (or a node) for the last column.
 *   Items with `to` render through `renderLink` (a router link) when given.
 * - `renderDetailPanel(row)` adds an expand chevron per row.
 * - `filters` renders after the search box (filter chips, selects).
 * - `total` overrides the count's denominator when `data` is pre-filtered
 *   (e.g. by a business-unit filter outside the table).
 * - `getRowClassName(row)` adds a class per row (brand scope for BU rows).
 * - `actionsSize` / `actionsHeader` size and label the row-actions column.
 * - `searchResetKey`: the search clears whenever this value changes (a tab id).
 * - `sortResetKey`: sorting returns to `initialSort` whenever this changes, so a
 *   page control (a focused tool) can drive the order.
 * - `enableRowSelection(row)` (MRT's own option) disables a row's checkbox;
 *   `isRowLocked(row)` additionally shows it ticked (already done, can't redo).
 * - `selectionResetKey`: the selection clears whenever this value changes.
 * - Selection drops rows that are no longer in `data` (after a refetch); the
 *   header checkbox selects every row that matches the search, across pages.
 * - `emptyIcon`, `searchAriaLabel`: page-specific empty-state icon and search label.
 * - `pageSizes`: rows-per-page choices; the first is the default.
 * - `countAtEnd`: show the count as "Showing X of Y" at the toolbar's right end.
 * - Any other prop passes straight to useMaterialReactTable.
 */

const PAGE_SIZES = [10, 25, 50];

// Header band: a faint primary wash over the card surface, so it follows brand
// and light/dark. Uses the exact same wash as the pager (.skt-pager in styles.css):
// keep both in sync. Vertical on purpose: every head cell has the same height,
// so the per-cell paint lines up into one band; a horizontal or diagonal
// gradient would restart in each column.
const HEAD_BG = "rgb(var(--primary-channel) / 0.06)";
// Soft corners on the header band (and the pager) — square bands read harsh.
const HEAD_RADIUS = "10px";

const headCellSx = {
  height: 42,
  py: 0,
  px: 2,
  // Painted on the CELLS, not the row: a <tr> cannot take border-radius, so
  // the rounded ends come from the first/last cell.
  backgroundColor: HEAD_BG,
  // MRT sets `background-image: inherit` on head cells; neutralise it.
  backgroundImage: "none",
  // No bottom line under the header.
  boxShadow: "none",
  borderBottom: "none",
  "&:first-of-type": { borderTopLeftRadius: HEAD_RADIUS, borderBottomLeftRadius: HEAD_RADIUS },
  "&:last-of-type": { borderTopRightRadius: HEAD_RADIUS, borderBottomRightRadius: HEAD_RADIUS },
  fontSize: "12px",
  fontWeight: 600,
  // Dark labels on the pale HEAD_BG tint.
  color: "var(--fg1)",
  verticalAlign: "middle",
  "& .Mui-TableHeadCell-Content-Wrapper": { minWidth: 0 },
  "& .MuiTableSortLabel-root, & .MuiTableSortLabel-root:hover, & .MuiTableSortLabel-root.Mui-active": { color: "inherit" },
  // Root + icon (0,3,0): MRT paints the ACTIVE sort arrow with its own
  // `!important` at (0,2,0) on the label, which beat a plain icon selector.
  "& .MuiTableSortLabel-root .MuiTableSortLabel-icon": { color: "inherit !important" },
  "& .MuiCheckbox-root, & .MuiCheckbox-root.Mui-checked, & .MuiCheckbox-root.MuiCheckbox-indeterminate": { color: "inherit" },
  // Idle sort arrows only on hover/focus: eight faded arrows in a row is noise.
  // MRT marks every sort label Mui-active, so key off the header's aria-sort.
  '&[aria-sort="none"] .MuiTableSortLabel-root': { opacity: 0 },
  '&[aria-sort="none"]:hover .MuiTableSortLabel-root, &[aria-sort="none"] .MuiTableSortLabel-root:focus-visible': { opacity: 0.5 },
  // Column-filter fields render inside the header as MUI standard TextFields
  // (underline, no box): transparent over the tinted band, dark text, primary
  // underline on focus. (One key — a duplicate key here silently overwrote the
  // earlier one.)
  // Breathing room under the filter fields (cell has py: 0). On the inner
  // wrapper, not the Collapse root: root padding would show while collapsed.
  "& .MuiCollapse-wrapperInner": { paddingBottom: "12px" },
  "& .MuiCollapse-root .MuiInputBase-root": {
    fontSize: "13px",
    fontWeight: 400,
    backgroundColor: "transparent",
    color: "var(--fg1)",
    "&:before": { borderBottomColor: "var(--border)" },
    "&:hover:not(.Mui-disabled, .Mui-error):before": { borderBottomColor: "var(--fg2)" },
    "&:after": { borderBottomColor: "var(--primary-solid)" },
  },
  "& .MuiCollapse-root .MuiInputBase-input::placeholder": { color: "var(--fg2)", opacity: 1 },
};

// The row itself paints nothing (fill + corners live on the cells, headCellSx).
const headRowSx = { background: "none", boxShadow: "none" };

const bodyCellSx = {
  height: 58,
  py: 1.5,
  px: 2,
  borderBottom: "1px solid var(--border)",
  fontSize: "14px",
  color: "var(--fg1)",
  verticalAlign: "middle",
};

export type KitTableProps<T extends MRT_RowData> = Omit<
  MRT_TableOptions<T>,
  "columns" | "data" | "getRowId" | "initialState" | "renderDetailPanel" | "state"
> & {
  columns: MRT_ColumnDef<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  isLoading?: boolean;
  noun?: string;
  searchPlaceholder?: string;
  actions?: ReactNode;
  bulkActions?: (rows: T[], clear: () => void) => ReactNode;
  rowActions?: (row: T) => RowActionItem[] | ReactNode;
  /** Router link for RowActions items that have `to` (e.g. next/link). */
  renderLink?: RenderLink;
  renderDetailPanel?: (row: T) => ReactNode;
  initialSort?: MRT_SortingState;
  emptyTitle?: string;
  emptyHint?: ReactNode;
  initialState?: MRT_TableOptions<T>["initialState"];
  filters?: ReactNode;
  total?: number;
  getRowClassName?: (row: T) => string | undefined;
  actionsSize?: number;
  actionsHeader?: string;
  searchResetKey?: unknown;
  sortResetKey?: unknown;
  selectionResetKey?: unknown;
  isRowLocked?: (row: T) => boolean;
  emptyIcon?: ReactNode;
  searchAriaLabel?: string;
  pageSizes?: number[];
  countAtEnd?: boolean;
};

// 'use no memo' on every component that reads the MRT instance: useMaterialReactTable
// returns the SAME mutable table object on every render, so the React Compiler
// memoizes anything derived from it on that identity and it never updates — the
// table sticks on its loading skeletons and the count on the skeleton row count.

function KitPager<T extends MRT_RowData>({ table, pageSizes }: { table: MRT_TableInstance<T>; pageSizes: number[] }) {
  "use no memo";
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getPrePaginationRowModel().rows.length;
  if (total === 0) return null;

  return (
    <Pager page={pageIndex + 1} pageSize={pageSize} total={total} onPage={(p) => table.setPageIndex(p - 1)}>
      <label className="skt-rpp">
        Rows per page
        <select value={pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}>
          {pageSizes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </Pager>
  );
}

function SelectionStrip<T extends MRT_RowData>({
  table,
  bulkActions,
}: {
  table: MRT_TableInstance<T>;
  bulkActions: (rows: T[], clear: () => void) => ReactNode;
}) {
  "use no memo";
  const rows = table.getSelectedRowModel().rows.map((r) => r.original);
  if (rows.length === 0) return null;
  const clear = () => table.resetRowSelection();

  return (
    <div className="skt-bulk" role="region" aria-label="Selected rows">
      <span className="skt-bulk__count" aria-live="polite">
        <b>{rows.length}</b> selected
      </span>
      <button type="button" className="skt-link-btn" onClick={clear}>
        Clear selection
      </button>
      <span className="skt-toolbar__spacer" />
      {bulkActions(rows, clear)}
    </div>
  );
}

function KitTableInner<T extends MRT_RowData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  noun = "rows",
  searchPlaceholder = "Search...",
  actions,
  bulkActions,
  rowActions,
  renderLink,
  renderDetailPanel,
  initialSort,
  emptyTitle = "Nothing here yet",
  emptyHint,
  initialState,
  filters,
  total,
  getRowClassName,
  actionsSize = 120,
  actionsHeader = "Actions",
  searchResetKey,
  sortResetKey,
  selectionResetKey,
  isRowLocked,
  emptyIcon,
  searchAriaLabel,
  pageSizes = PAGE_SIZES,
  countAtEnd = false,
  ...options
}: KitTableProps<T>) {
  "use no memo";
  const [globalFilter, setGlobalFilter] = useState("");
  const query = globalFilter.trim();

  // Reset during render, not in an effect: React's pattern for state derived
  // from a prop change, and it avoids one render with the stale query.
  const [lastResetKey, setLastResetKey] = useState(searchResetKey);
  if (lastResetKey !== searchResetKey) {
    setLastResetKey(searchResetKey);
    setGlobalFilter("");
  }

  const [sorting, setSorting] = useState<MRT_SortingState>(initialSort ?? []);
  const [lastSortKey, setLastSortKey] = useState(sortResetKey);
  if (lastSortKey !== sortResetKey) {
    setLastSortKey(sortResetKey);
    setSorting(initialSort ?? []);
  }

  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [lastSelectionKey, setLastSelectionKey] = useState(selectionResetKey);
  if (lastSelectionKey !== selectionResetKey) {
    setLastSelectionKey(selectionResetKey);
    setRowSelection({});
  }

  // TanStack caches each row's accessor values and only rebuilds rows when
  // `data` changes. Accessors that read other queries (a lookup map built from
  // a second fetch) would keep the values computed before that fetch landed,
  // so hand MRT a fresh array whenever the columns change, and none while loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `columns` is the cache-buster
  const tableData = useMemo(() => (isLoading ? [] : [...data]), [data, columns, isLoading]);

  // Only rows still in the data count as selected: a refetch that removes a
  // row (deleted, mapped elsewhere) must not leave it in a bulk action.
  // While loading, MRT feeds blank skeleton rows ({}) through getRowId, so a
  // caller's `row.group.groupId` would throw. Index ids until real rows land.
  // The SAME function feeds MRT and the selection filter below: they must agree
  // on ids, or every selection is filtered out.
  const rowIdOf = useMemo<(row: T, index: number) => string>(
    () => (isLoading || !getRowId ? (_row, i) => `row-${i}` : getRowId),
    [isLoading, getRowId],
  );
  const liveSelection = useMemo(() => {
    const ids = new Set(tableData.map((row, i) => rowIdOf(row, i)));
    return Object.fromEntries(Object.entries(rowSelection).filter(([id, on]) => on && ids.has(id)));
  }, [rowSelection, tableData, rowIdOf]);

  // Each column's filter icon lists only the modes valid for it (filter-modes).
  const modeColumns = useMemo(() => applyFilterModes(columns), [columns]);

  const table = useMaterialReactTable<T>({
    columns: modeColumns,
    data: tableData,
    getRowId: rowIdOf,
    mrtTheme: (theme) => (theme as unknown as { kitTable: Record<string, string> }).kitTable,

    enableTopToolbar: false,
    enableColumnActions: false,
    // Filter icon in each column filter field (opens the mode menu).
    enableColumnFilterModes: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableKeyboardShortcuts: false,
    enableSortingRemoval: false,
    enableRowSelection: Boolean(bulkActions),
    enableRowActions: Boolean(rowActions),
    positionActionsColumn: "last",
    globalFilterFn: "contains",
    // TanStack's default makes a column searchable only if the FIRST row's
    // value is a string or number, so one leading null (an account with no
    // domain) silently drops the whole column from search. Decide on the
    // first non-empty value instead; Dates and objects stay out.
    // Reads `tableData` through the column's accessor, never the outer `table`:
    // TanStack calls this while building the filtered row model INSIDE
    // useMaterialReactTable (any search or column filter), before `table` is
    // assigned for this render, so `table.getCoreRowModel()` threw.
    getColumnCanGlobalFilter: (column) => {
      const read = column.accessorFn;
      if (!read) return false;
      for (let i = 0; i < tableData.length; i++) {
        const v = read(tableData[i] as T, i);
        if (v != null && v !== "") return typeof v === "string" || typeof v === "number";
      }
      return false;
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { globalFilter, sorting, rowSelection: liveSelection, isLoading, showSkeletons: isLoading },
    initialState: {
      density: "comfortable",
      pagination: { pageIndex: 0, pageSize: pageSizes[0] ?? 10 },
      ...initialState,
    },

    // A group row's `original` is its first leaf: no detail panel for it.
    renderDetailPanel: renderDetailPanel
      ? ({ row }) => (row.getIsGrouped() ? null : renderDetailPanel(row.original))
      : undefined,
    renderRowActions: rowActions
      ? ({ row }) => {
          // A group row's `original` is its first leaf: never act on it.
          if (row.getIsGrouped()) return null;
          const out = rowActions(row.original);
          return Array.isArray(out) ? <RowActions items={out as RowActionItem[]} renderLink={renderLink} /> : out;
        }
      : undefined,
    renderBottomToolbar: ({ table: t }) => <KitPager table={t} pageSizes={pageSizes} />,
    renderEmptyRowsFallback: () => (
      <EmptyState
        icon={query ? undefined : emptyIcon}
        title={query ? `No ${noun} match “${query}”` : emptyTitle}
        hint={query ? "Check the spelling or clear the search to see everything." : emptyHint}
      />
    ),

    displayColumnDefOptions: {
      // Own checkboxes: MRT 3.2.1 passes the Checkbox `inputProps`, which MUI 9
      // removed, so React warns on every render and the aria-label never
      // reaches the <input>. Even `inputProps: undefined` still warns.
      "mrt-row-select": {
        size: 52,
        grow: false,
        Header: ({ table: t }) => (
          <Checkbox
            size="small"
            checked={t.getIsAllRowsSelected()}
            indeterminate={t.getIsSomeRowsSelected()}
            disabled={!t.getPreGroupedRowModel().flatRows.some((r) => r.getCanSelect())}
            onChange={t.getToggleAllRowsSelectedHandler()}
            slotProps={{ input: { "aria-label": "Select all matching rows" } }}
          />
        ),
        Cell: ({ row }) => (
          <Checkbox
            size="small"
            checked={row.getIsSelected() || Boolean(isRowLocked?.(row.original))}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            slotProps={{ input: { "aria-label": "Select row" } }}
          />
        ),
      },
      "mrt-row-expand": { size: 52, grow: false, header: "" },
      "mrt-row-actions": {
        header: actionsHeader,
        size: actionsSize,
        grow: false,
        muiTableHeadCellProps: { align: "right" },
        muiTableBodyCellProps: { align: "right" },
      },
    },
    muiTablePaperProps: { elevation: 0, sx: { borderRadius: 0, boxShadow: "none", backgroundImage: "none" } },
    // No frame around the table any more, so the last row keeps its hairline
    // to close the table off from the pager below.
    // `separate`: under MUI's default `collapse` model cells ignore
    // border-radius, so the header band's rounded ends would not render.
    muiTableProps: { sx: { borderCollapse: "separate", borderSpacing: 0 } },
    muiTableHeadRowProps: { sx: headRowSx },
    muiTableHeadCellProps: { sx: headCellSx },
    muiTableBodyCellProps: { sx: bodyCellSx },
    muiTableBodyRowProps: ({ row }) => ({
      className: getRowClassName?.(row.original),
      sx: {
        transition: "background-color 0.12s",
        // MRT paints its own hover wash as a `td::after` overlay (grey at 30%),
        // on top of any td background. Override that overlay: a td background
        // alone never gets rid of the grey.
        // Replacing MRT's rule replaces the WHOLE object, so the pseudo-element's
        // geometry (content/position/size) must be restated or nothing renders.
        "&:hover td:after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          backgroundColor: "rgb(var(--fg2-channel) / 0.1)",
        },
        ...(row.getIsSelected() && { "& > td": { backgroundColor: "var(--primary-bg)" } }),
      },
    }),
    muiDetailPanelProps: { sx: { backgroundColor: "var(--surface-elevated)" } },
    // MUI "standard" TextField (underline only) for every column filter, select included.
    // helperText null: MRT prints "Filter Mode: Contains" under each field, which
    // spills into the next column in narrow ones; the icon's menu shows the mode.
    muiFilterTextFieldProps: { variant: "standard", size: "small", helperText: null },
    muiSkeletonProps: { animation: "wave" },
    ...(options as Partial<MRT_TableOptions<T>>),
  });

  const shown = table.getFilteredRowModel().rows.length;

  return (
    <div className="skt-table">
      <Toolbar>
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder={searchPlaceholder} aria-label={searchAriaLabel} />
        {filters}
        {!isLoading && !countAtEnd && <ResultCount shown={shown} total={total ?? data.length} noun={noun} />}
        <span className="skt-toolbar__spacer" />
        {!isLoading && countAtEnd && (
          <span className="skt-count" aria-live="polite">
            Showing {shown} of {total ?? data.length}
          </span>
        )}
        <span className="skt-tools">
          <MRT_ToggleFiltersButton table={table} size="small" />
          <MRT_ShowHideColumnsButton table={table} size="small" />
        </span>
        {actions}
      </Toolbar>

      <div className="skt-frame">
        {bulkActions && <SelectionStrip table={table} bulkActions={bulkActions} />}
        <MaterialReactTable table={table} />
      </div>
    </div>
  );
}

export function KitTable<T extends MRT_RowData>(props: KitTableProps<T>) {
  // MRT needs concrete colours (see use-concrete-mui-theme). Until they are
  // resolved, hold the table's space so nothing jumps when it arrives.
  const theme = useConcreteMuiTheme();
  if (!theme) return <div className="skt-frame skt-placeholder" aria-busy="true" />;

  return (
    <ThemeProvider theme={theme}>
      <KitTableInner {...props} />
    </ThemeProvider>
  );
}

/** Expanded-row body: a short summary line, then a two-column list of entries. */
export function KitDetail({
  summary,
  items,
  empty,
}: {
  summary: ReactNode;
  items: { key: string; name: ReactNode; desc?: ReactNode }[];
  empty: ReactNode;
}) {
  return (
    <div className="skt-detail">
      <p className="skt-detail__summary">{summary}</p>
      {items.length === 0 ? (
        <p className="skt-detail__empty">{empty}</p>
      ) : (
        <ul className="skt-detail__list">
          {items.map((it) => (
            <li key={it.key}>
              <span className="skt-detail__name">{it.name}</span>
              {it.desc && <span className="skt-detail__desc">{it.desc}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
