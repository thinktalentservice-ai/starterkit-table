import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, Pager, ResultCount, RowActions, Toolbar } from "../src/chrome";
import { SearchInput } from "../src/search-input";

describe("ResultCount", () => {
  it("shows the plain total when nothing is filtered out", () => {
    render(<ResultCount shown={5} total={5} noun="admins" />);
    expect(screen.getByText("admins", { exact: false }).textContent).toBe("5 admins");
  });

  it("shows 'X of N' when filtered", () => {
    render(<ResultCount shown={2} total={5} noun="admins" />);
    expect(screen.getByText("of 5 admins", { exact: false }).textContent).toBe("2 of 5 admins");
  });
});

describe("EmptyState", () => {
  it("renders title and hint as a status region", () => {
    render(<EmptyState title="No rows" hint="Clear the filter" />);
    expect(screen.getByRole("status")).toHaveTextContent("No rows");
    expect(screen.getByText("Clear the filter")).toBeInTheDocument();
  });
});

describe("Toolbar", () => {
  it("renders its children", () => {
    render(<Toolbar><span>child</span></Toolbar>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});

describe("Pager", () => {
  it("shows the visible range and disables Previous on the first page", () => {
    render(<Pager page={1} pageSize={10} total={25} onPage={() => {}} />);
    expect(screen.getByText("1–10 of 25")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).toBeEnabled();
  });

  it("disables Next on the last page and calls onPage with page±1", async () => {
    const onPage = vi.fn();
    render(<Pager page={3} pageSize={10} total={25} onPage={onPage} />);
    expect(screen.getByLabelText("Next page")).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Previous page"));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("clamps a page past the end to the last page instead of an inverted range", () => {
    render(<Pager page={4} pageSize={10} total={25} onPage={() => {}} />);
    expect(screen.getByText("21–25 of 25")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });

  it("clamps page 0 or negative to the first page", () => {
    render(<Pager page={0} pageSize={10} total={25} onPage={() => {}} />);
    expect(screen.getByText("1–10 of 25")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("shows 0–0 of 0 when empty and keeps both buttons disabled", () => {
    render(<Pager page={1} pageSize={10} total={0} onPage={() => {}} />);
    expect(screen.getByText("0–0 of 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });
});

describe("RowActions", () => {
  it("renders a plain anchor for an item with `to` and no renderLink", () => {
    render(<RowActions items={[{ label: "Open", to: "/x", showLabel: true }]} />);
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/x");
  });

  it("uses renderLink's element when provided", () => {
    render(
      <RowActions
        items={[{ label: "Open", to: "/x" }]}
        renderLink={({ href, children, ...rest }) => <a data-custom="yes" href={`/base${href}`} {...rest}>{children}</a>}
      />,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("data-custom", "yes");
    expect(link).toHaveAttribute("href", "/base/x");
  });

  it("does not let a click bubble to the row", () => {
    const onRow = vi.fn();
    render(
      <div onClick={onRow}>
        <RowActions items={[{ label: "Open", to: "/x" }, { label: "Edit", onClick: () => {} }]} />
      </div>,
    );
    const stopNav = (e: Event) => e.preventDefault(); // jsdom cannot navigate
    document.addEventListener("click", stopNav, true);
    fireEvent.click(screen.getByRole("link", { name: "Open" }));
    document.removeEventListener("click", stopNav, true);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onRow).not.toHaveBeenCalled();
  });

  it("calls a button item's onClick", async () => {
    const onClick = vi.fn();
    render(<RowActions items={[{ label: "Edit", onClick }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("SearchInput", () => {
  it("passes the string (not the event) to onChange", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Search..." />);
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("shows the clear button only when there is text, and clearing calls onChange('')", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchInput value="" onChange={onChange} />);
    expect(screen.queryByLabelText("Clear search")).toBeNull();
    rerender(<SearchInput value="abc" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Clear search"));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("icons come from lucide-react (not hand-drawn SVG)", () => {
  it("SearchInput uses the lucide search icon, and the clear button the lucide x icon", () => {
    const { container } = render(<SearchInput value="abc" onChange={() => {}} />);
    expect(container.querySelector("svg.lucide-search")).not.toBeNull();
    expect(container.querySelector("svg.lucide-x")).not.toBeNull();
  });

  it("Pager uses lucide chevrons", () => {
    const { container } = render(<Pager page={2} pageSize={10} total={30} onPage={() => {}} />);
    expect(container.querySelector("svg.lucide-chevron-left")).not.toBeNull();
    expect(container.querySelector("svg.lucide-chevron-right")).not.toBeNull();
  });

  it("EmptyState uses the lucide inbox icon by default", () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector("svg.lucide-inbox")).not.toBeNull();
  });

  it("keeps the icon sizes the app used: search 15, clear 12, chevrons 15, inbox 20", () => {
    const { container } = render(
      <>
        <SearchInput value="abc" onChange={() => {}} />
        <Pager page={2} pageSize={10} total={30} onPage={() => {}} />
        <EmptyState />
      </>,
    );
    const size = (sel: string) => container.querySelector(sel)?.getAttribute("width");
    expect([size("svg.lucide-search"), size("svg.lucide-x"), size("svg.lucide-chevron-left"), size("svg.lucide-inbox")]).toEqual(["15", "12", "15", "20"]);
  });
});
