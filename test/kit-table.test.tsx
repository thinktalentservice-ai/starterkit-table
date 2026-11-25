import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { createStarterkitTheme } from "@devopsnext/starterkit-theme/mui";
import type { MRT_ColumnDef } from "material-react-table";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitDetail, KitTable } from "../src/kit-table";
import { TOKEN_NAMES } from "../src/use-concrete-mui-theme";

type Person = { id: string; name: string };
const columns: MRT_ColumnDef<Person>[] = [{ accessorKey: "name", header: "Name" }];
const people = (n: number): Person[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: i === 0 ? "Alice" : i === 1 ? "Bob" : `Person ${i}` }));

const Theme = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={createStarterkitTheme()}>{children}</ThemeProvider>
);
const table = (props: Partial<Parameters<typeof KitTable<Person>>[0]> = {}) => (
  <Theme>
    <KitTable<Person> columns={columns} data={people(3)} getRowId={(r) => r.id} noun="people" {...props} />
  </Theme>
);

describe("KitTable", () => {
  beforeEach(() => {
    for (const name of TOKEN_NAMES) document.documentElement.style.setProperty(name, "rgb(10, 20, 30)");
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("style");
    vi.restoreAllMocks();
  });

  it("renders rows and the result count", async () => {
    render(table());
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("people", { exact: false, selector: ".skt-count" }).textContent).toBe("3 people");
  });

  it("renders skeleton rows without throwing while loading, even when getRowId reads nested fields", async () => {
    // MRT feeds blank {} rows through getRowId while loading; a nested read would throw on them.
    const nested = (r: Person) => (r as unknown as { group: { id: string } }).group.id;
    render(table({ isLoading: true, data: [], getRowId: nested }));
    await waitFor(() => expect(document.querySelector(".MuiSkeleton-root")).not.toBeNull());
    expect(screen.queryByText("Alice")).toBeNull();
  });

  it("renders no pager when there is no data", async () => {
    render(table({ data: [] }));
    await screen.findByText("Nothing here yet");
    expect(document.querySelector(".skt-pager")).toBeNull();
  });

  it("renders no pager while loading (it would count MRT's skeleton rows)", async () => {
    render(table({ isLoading: true, data: [] }));
    await waitFor(() => expect(document.querySelector(".MuiSkeleton-root")).not.toBeNull());
    expect(document.querySelector(".skt-pager")).toBeNull();
  });

  it("renders a rowActions JSX array as content, not as action items", async () => {
    render(table({ rowActions: () => [<span key="a">AA-node</span>, <span key="b">BB-node</span>] }));
    expect((await screen.findAllByText("AA-node")).length).toBe(3);
    expect(screen.getAllByText("BB-node").length).toBe(3);
    expect(document.querySelector(".skt-action")).toBeNull();
  });

  it("renders rowActions items as the joined action control", async () => {
    render(table({ rowActions: (r) => [{ label: `Edit ${r.name}`, onClick: () => {} }] }));
    expect(await screen.findByRole("button", { name: "Edit Alice" })).toBeInTheDocument();
  });

  it("filters rows as you type in the search box", async () => {
    render(table());
    await screen.findByText("Bob");
    await userEvent.type(screen.getByRole("textbox", { name: "Search..." }), "ali");
    await waitFor(() => expect(screen.queryByText("Bob")).toBeNull());
    // MRT highlights the matched "ali" in a <mark>, which splits the text node: assert on the row text.
    expect(document.querySelector("tbody")).toHaveTextContent("Alice");
  });

  it("shows row checkboxes only with bulkActions, and a selection strip with Clear selection", async () => {
    const { unmount } = render(table());
    await screen.findByText("Alice");
    expect(screen.queryByLabelText("Select row")).toBeNull();
    unmount();

    render(table({ bulkActions: () => <button type="button">Do it</button> }));
    await screen.findByText("Alice");
    await userEvent.click(screen.getAllByLabelText("Select row")[0]!);
    const strip = await screen.findByRole("region", { name: "Selected rows" });
    expect(within(strip).getByText("selected", { exact: false })).toBeInTheDocument();
    expect(within(strip).getByText("Do it")).toBeInTheDocument();
    await userEvent.click(within(strip).getByText("Clear selection"));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Selected rows" })).toBeNull());
  });

  it("selects rows when getRowId is omitted (ids fall back to the index MRT uses)", async () => {
    render(table({ bulkActions: () => <button type="button">Do it</button>, getRowId: undefined }));
    await screen.findByText("Alice");
    await userEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(await screen.findByRole("region", { name: "Selected rows" })).toBeInTheDocument();
  });

  it("drops a selected row that is no longer in data after a refetch", async () => {
    const bulk = () => <button type="button">Do it</button>;
    const { rerender } = render(table({ bulkActions: bulk }));
    await screen.findByText("Alice");
    await userEvent.click(screen.getAllByLabelText("Select row")[0]!);
    await screen.findByRole("region", { name: "Selected rows" });
    rerender(table({ bulkActions: bulk, data: people(3).slice(1) }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Selected rows" })).toBeNull());
  });

  it("shows the empty title, and 'No <noun> match' when a search matches nothing", async () => {
    const { unmount } = render(table({ data: [], emptyTitle: "No people yet" }));
    expect(await screen.findByText("No people yet")).toBeInTheDocument();
    unmount();
    render(table());
    await screen.findByText("Bob");
    await userEvent.type(screen.getByRole("textbox", { name: "Search..." }), "zzz");
    expect(await screen.findByText(/No people match/)).toBeInTheDocument();
  });

  it("changes the page size from the Rows per page select", async () => {
    render(table({ data: people(12) }));
    expect(await screen.findByText("1–10 of 12")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Rows per page"), "25");
    expect(await screen.findByText("1–12 of 12")).toBeInTheDocument();
  });

  it("renders a placeholder, not a throw, when the theme tokens are missing", async () => {
    document.documentElement.removeAttribute("style");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(table());
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText("Alice")).toBeNull();
    const logged = String(spy.mock.calls[0]?.[0]);
    for (const name of TOKEN_NAMES) expect(logged).toContain(name);
  });
});

describe("KitDetail", () => {
  it("lists items, or shows the empty line", () => {
    const { rerender } = render(<KitDetail summary="2 entries" items={[{ key: "a", name: "A", desc: "first" }]} empty="Nothing" />);
    expect(screen.getByText("first")).toBeInTheDocument();
    rerender(<KitDetail summary="0 entries" items={[]} empty="Nothing" />);
    expect(screen.getByText("Nothing")).toBeInTheDocument();
  });
});

describe("KitTable toolbar options (search, filters, columns, density, full screen)", () => {
  beforeEach(() => {
    for (const name of TOKEN_NAMES) document.documentElement.style.setProperty(name, "rgb(10, 20, 30)");
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("style");
  });

  const labels = () => ({
    search: screen.queryByRole("textbox", { name: "Search..." }),
    filters: screen.queryByRole("button", { name: "Show/Hide filters" }),
    columns: screen.queryByRole("button", { name: "Show/Hide columns" }),
    density: screen.queryByRole("button", { name: "Toggle density" }),
    fullScreen: screen.queryByRole("button", { name: /full screen/i }),
  });

  it("by default shows search, filters and columns, and hides density and full screen", async () => {
    render(table());
    await screen.findByText("Alice");
    const t = labels();
    expect(t.search).not.toBeNull();
    expect(t.filters).not.toBeNull();
    expect(t.columns).not.toBeNull();
    expect(t.density).toBeNull();
    expect(t.fullScreen).toBeNull();
  });

  it("shows every option when all are switched on", async () => {
    render(table({ toolbar: { search: true, filters: true, columns: true, density: true, fullScreen: true } }));
    await screen.findByText("Alice");
    for (const [name, el] of Object.entries(labels())) expect(el, name).not.toBeNull();
  });

  it("hides each option independently", async () => {
    for (const key of ["search", "filters", "columns"] as const) {
      const { unmount } = render(table({ toolbar: { [key]: false } }));
      await screen.findByText("Alice");
      const t = labels();
      expect(t[key], `${key} hidden`).toBeNull();
      for (const other of ["search", "filters", "columns"] as const) {
        if (other !== key) expect(t[other], `${other} still shown`).not.toBeNull();
      }
      unmount();
    }
  });

  it("cycles density comfortable, compact, spacious, as the MRT button does", async () => {
    render(table({ toolbar: { density: true } }));
    await screen.findByText("Alice");
    const root = document.querySelector(".skt-table")!;
    expect(root).toHaveAttribute("data-density", "comfortable");
    await userEvent.click(screen.getByRole("button", { name: "Toggle density" }));
    await waitFor(() => expect(root).toHaveAttribute("data-density", "compact"));
    await userEvent.click(screen.getByRole("button", { name: "Toggle density" }));
    await waitFor(() => expect(root).toHaveAttribute("data-density", "spacious"));
    await userEvent.click(screen.getByRole("button", { name: "Toggle density" }));
    await waitFor(() => expect(root).toHaveAttribute("data-density", "comfortable"));
  });

  it("enters full screen from the button and leaves it with the button or Escape", async () => {
    render(table({ toolbar: { fullScreen: true } }));
    await screen.findByText("Alice");
    const root = document.querySelector(".skt-table")!;
    expect(root).not.toHaveClass("skt-table--fullscreen");
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(root).toHaveClass("skt-table--fullscreen");
    expect(screen.getByRole("button", { name: "Exit full screen" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Exit full screen" }));
    expect(root).not.toHaveClass("skt-table--fullscreen");
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    await userEvent.keyboard("{Escape}");
    expect(root).not.toHaveClass("skt-table--fullscreen");
  });

  it("honours an initial density from initialState", async () => {
    render(table({ toolbar: { fullScreen: true }, initialState: { density: "compact" } }));
    await screen.findByText("Alice");
    expect(document.querySelector(".skt-table")).toHaveAttribute("data-density", "compact");
  });
});
