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
    // MRT highlights the matched "ali" in a <mark>, which splits the text node: assert on the row text.
    expect(document.querySelector("tbody")).toHaveTextContent("Alice");
    expect(screen.getByText("people", { exact: false, selector: ".skt-count" }).textContent).toBe("3 people");
  });

  it("renders skeleton rows without throwing while loading with no data", async () => {
    render(table({ isLoading: true, data: [] }));
    await waitFor(() => expect(document.querySelector(".skt-table")).not.toBeNull());
    expect(screen.queryByText("Alice")).toBeNull();
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
