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
import type { MRT_ColumnDef, MRT_RowData, MRT_TableState } from "material-react-table";

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

type SeededModes = Partial<MRT_TableState<MRT_RowData>>["columnFilterFns"];

function withModes<T extends MRT_RowData>(def: MRT_ColumnDef<T>, seeded: SeededModes): MRT_ColumnDef<T> {
  if (def.columns) return { ...def, columns: def.columns.map((c) => withModes(c, seeded)) } as MRT_ColumnDef<T>;
  if (def.enableColumnFilter === false) return def;
  if (def.filterVariant && CLOSED_LIST.has(def.filterVariant)) return { ...def, enableColumnFilterModes: false };
  if (isSpecialVariant(def.filterVariant)) return def;
  // The caller owns the filtering: a custom function, or an explicit mode outside
  // the text set ('between', 'fuzzy', ...) with no menu of their own. Offering text
  // modes there would list options the current mode is not in, and picking one
  // would discard the custom filter for good.
  if (typeof def.filterFn === "function") return def;
  if (def.filterFn && !def.columnFilterModeOptions && !(TEXT_MODES as string[]).includes(def.filterFn)) return def;

  const modes = def.columnFilterModeOptions ?? TEXT_MODES;
  const id = def.id ?? (def as { accessorKey?: string }).accessorKey;
  // A mode the caller seeded through initialState.columnFilterFns wins over our
  // default: MRT reads `col.filterFn ?? initialState.columnFilterFns[id]`.
  const callerSeeded = id !== undefined && seeded?.[id] !== undefined;
  return {
    ...def,
    columnFilterModeOptions: modes,
    // MRT starts every column on 'fuzzy'; start on a mode the column allows.
    ...(callerSeeded ? {} : { filterFn: def.filterFn ?? modes[0] }),
    ...(def.size != null && { size: Math.max(def.size, MIN_FILTER_SIZE) }),
  } as MRT_ColumnDef<T>;
}

/**
 * Returns `columns` with per-column filter-mode options filled in. Pass the table's
 * `initialState` so modes the caller seeded in `columnFilterFns` are not overridden.
 */
export const applyFilterModes = <T extends MRT_RowData>(
  columns: MRT_ColumnDef<T>[],
  initialState?: { columnFilterFns?: SeededModes },
): MRT_ColumnDef<T>[] => columns.map((c) => withModes(c, initialState?.columnFilterFns));
