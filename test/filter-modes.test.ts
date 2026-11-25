import { describe, expect, it } from "vitest";
import type { MRT_ColumnDef } from "material-react-table";
import { ID_MODES, TEXT_MODES, applyFilterModes, idFilter } from "../src/filter-modes";

type Row = { id: number; name: string };
const apply = (cols: MRT_ColumnDef<Row>[]) => applyFilterModes(cols);

describe("applyFilterModes", () => {
  it("gives a text column TEXT_MODES and starts on contains", () => {
    const [col] = apply([{ accessorKey: "name", header: "Name" }]);
    expect(col?.columnFilterModeOptions).toEqual(TEXT_MODES);
    expect(col?.filterFn).toBe("contains");
  });

  it("keeps the idFilter preset's modes and placeholder", () => {
    const [col] = apply([{ accessorKey: "id", header: "ID", ...idFilter }]);
    expect(col?.columnFilterModeOptions).toEqual(ID_MODES);
    expect(col?.muiFilterTextFieldProps).toEqual({ placeholder: "Filter" });
  });

  it("starts on the first allowed mode when the caller gave modes but no filterFn", () => {
    const [col] = apply([{ accessorKey: "name", header: "N", columnFilterModeOptions: ["equals", "notEquals"] }]);
    expect(col?.filterFn).toBe("equals");
  });

  it("hides the mode icon on select and multi-select columns", () => {
    const cols = apply([
      { accessorKey: "name", header: "A", filterVariant: "select" },
      { accessorKey: "id", header: "B", filterVariant: "multi-select" },
    ]);
    expect(cols.map((c) => c.enableColumnFilterModes)).toEqual([false, false]);
  });

  it("returns filter-disabled, range and date columns untouched", () => {
    const off: MRT_ColumnDef<Row> = { accessorKey: "name", header: "A", enableColumnFilter: false };
    const range: MRT_ColumnDef<Row> = { accessorKey: "id", header: "B", filterVariant: "range-slider" };
    const date: MRT_ColumnDef<Row> = { accessorKey: "id", header: "C", filterVariant: "date" };
    const out = apply([off, range, date]);
    expect(out[0]).toBe(off);
    expect(out[1]).toBe(range);
    expect(out[2]).toBe(date);
  });

  it("recurses into grouped columns", () => {
    const [group] = apply([{ header: "G", columns: [{ accessorKey: "name", header: "N" }] }]);
    expect(group?.columns?.[0]?.columnFilterModeOptions).toEqual(TEXT_MODES);
  });

  it("raises a narrow size to 140 and leaves an undefined size alone", () => {
    const [narrow, free] = apply([
      { accessorKey: "id", header: "A", size: 80 },
      { accessorKey: "name", header: "B" },
    ]);
    expect(narrow?.size).toBe(140);
    expect(free?.size).toBeUndefined();
  });
});

describe("applyFilterModes: columns that bring their own filtering", () => {
  it("returns a column whose filterFn is a function untouched", () => {
    const col: MRT_ColumnDef<Row> = { accessorKey: "name", header: "N", filterFn: (row) => row.original.id > 1 };
    expect(apply([col])[0]).toBe(col);
  });

  it("returns a column with an explicit non-text filterFn and no options untouched", () => {
    const between: MRT_ColumnDef<Row> = { accessorKey: "id", header: "A", filterFn: "between" };
    const fuzzy: MRT_ColumnDef<Row> = { accessorKey: "name", header: "B", filterFn: "fuzzy" };
    const out = apply([between, fuzzy]);
    expect(out[0]).toBe(between);
    expect(out[1]).toBe(fuzzy);
  });

  it("keeps an explicit text filterFn and still limits the menu to text modes", () => {
    const [col] = apply([{ accessorKey: "name", header: "N", filterFn: "equals" }]);
    expect(col?.filterFn).toBe("equals");
    expect(col?.columnFilterModeOptions).toEqual(TEXT_MODES);
  });

  it("does not set filterFn when the caller seeds the column's mode in initialState", () => {
    const [col] = applyFilterModes<Row>([{ accessorKey: "name", header: "N" }], { columnFilterFns: { name: "startsWith" } });
    expect(col?.filterFn).toBeUndefined();
    expect(col?.columnFilterModeOptions).toEqual(TEXT_MODES);
  });

  it("matches initialState to the column by id before accessorKey", () => {
    const [col] = applyFilterModes<Row>([{ id: "full", accessorFn: (r) => r.name, header: "N" }], {
      columnFilterFns: { full: "endsWith" },
    });
    expect(col?.filterFn).toBeUndefined();
  });
});
