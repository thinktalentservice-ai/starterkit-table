// Column-filter modes for KitTable (the filter icon in each column's filter field).
//
// MRT offers 14 modes (fuzzy, between, greaterThan...) on every column unless told
// otherwise, most of them meaningless for the data (a "Between" on a name, a
// "Greater Than" on a status). Each column gets only the modes that make sense
// for it; the first mode is the default and is what the field applies as you type.
//
//   text (default)  free-text columns: name, email, description
//   ID_MODES        identifier columns: typed digits, no ends-with / empty
//   select columns  closed lists (filterVariant 'select' / 'multi-select'): no
//                   mode icon at all, the options already are the filter
//
// A column opts out by passing its own `columnFilterModeOptions` (and `filterFn`,
// which must be one of them), or `enableColumnFilterModes: false`.
import type { MRT_ColumnDef, MRT_RowData } from "material-react-table";

export type FilterMode = "contains" | "startsWith" | "endsWith" | "equals" | "notEquals" | "empty" | "notEmpty";

export const TEXT_MODES: FilterMode[] = ["contains", "startsWith", "endsWith", "equals", "notEquals", "empty", "notEmpty"];
export const ID_MODES: FilterMode[] = ["contains", "startsWith", "equals", "notEquals"];

/** Spread into an identifier column: `{accessorKey: 'clientId', ...idFilter}`. */
export const idFilter = {
  filterFn: "contains" as const,
  columnFilterModeOptions: ID_MODES,
  // ID columns are narrow: "Filter by ID" would be cut, the header already names the column.
  muiFilterTextFieldProps: { placeholder: "Filter" },
};

// The mode icon eats ~28px of the field: below this the placeholder is cut to "Filter ...".
const MIN_FILTER_SIZE = 140;

const CLOSED_LIST = new Set(["select", "multi-select", "checkbox"]);

// Range / date variants have their own two-field UI and MRT already restricts
// their menu to the matching modes; leave those columns exactly as written.
const isSpecialVariant = (v: unknown): boolean =>
  typeof v === "string" && (v.includes("range") || v.startsWith("date") || v.startsWith("time"));

function withModes<T extends MRT_RowData>(def: MRT_ColumnDef<T>): MRT_ColumnDef<T> {
  if (def.columns) return { ...def, columns: def.columns.map(withModes) } as MRT_ColumnDef<T>;
  if (def.enableColumnFilter === false) return def;
  if (def.filterVariant && CLOSED_LIST.has(def.filterVariant)) return { ...def, enableColumnFilterModes: false };
  if (isSpecialVariant(def.filterVariant)) return def;

  const modes = def.columnFilterModeOptions ?? TEXT_MODES;
  return {
    ...def,
    columnFilterModeOptions: modes,
    // MRT starts every column on 'fuzzy'; start on a mode the column allows.
    filterFn: def.filterFn ?? modes[0],
    ...(def.size != null && { size: Math.max(def.size, MIN_FILTER_SIZE) }),
  } as MRT_ColumnDef<T>;
}

/** Returns `columns` with per-column filter-mode options filled in. */
export const applyFilterModes = <T extends MRT_RowData>(columns: MRT_ColumnDef<T>[]): MRT_ColumnDef<T>[] =>
  columns.map(withModes);
