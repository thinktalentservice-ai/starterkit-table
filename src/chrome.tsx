import type { MouseEvent, ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon } from "./icons";

export function Toolbar({ children }: { children?: ReactNode }) {
  return <div className="skt-toolbar">{children}</div>;
}

export function ResultCount({ shown, total, noun = "items" }: { shown: number; total: number; noun?: string }) {
  return (
    <span className="skt-count" aria-live="polite">
      {shown === total ? (
        <>
          <b>{total}</b> {noun}
        </>
      ) : (
        <>
          <b>{shown}</b> of {total} {noun}
        </>
      )}
    </span>
  );
}

export function EmptyState({
  icon,
  title = "Nothing here yet",
  hint,
}: {
  icon?: ReactNode;
  title?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="skt-empty" role="status">
      <span className="skt-empty__icon" aria-hidden="true">
        {icon ?? <InboxIcon />}
      </span>
      <p className="skt-empty__title">{title}</p>
      {hint && <p className="skt-empty__hint">{hint}</p>}
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  children,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  children?: ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // A page past the end (rows removed while on the last page) reads as the last
  // page, not as an inverted "31–25 of 25".
  const current = Math.min(Math.max(page, 1), pages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return (
    <div className="skt-pager">
      <div>{children}</div>
      <span>
        {start}–{end} of {total}
      </span>
      <div className="skt-pager__nav">
        <button
          type="button"
          className="skt-pager__btn"
          disabled={current <= 1}
          onClick={() => onPage(current - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          className="skt-pager__btn"
          disabled={current >= pages}
          onClick={() => onPage(current + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}

export type RenderLink = (props: {
  href: string;
  className: string;
  title: string;
  "aria-label": string;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
}) => ReactNode;

export type RowActionItem = {
  label: string;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
  showLabel?: boolean;
};

/** Joined row-action control. Items with `to` render a link: a plain <a>, or the host's router link via `renderLink`. */
export function RowActions({ items, renderLink }: { items: RowActionItem[]; renderLink?: RenderLink }) {
  return (
    <div className="skt-actions">
      {items.map((it) => {
        const cls = `skt-action${it.primary ? " skt-action--primary" : ""}`;
        const content = (
          <>
            {it.icon}
            {it.showLabel && it.label}
          </>
        );
        if (it.to) {
          const linkProps = {
            href: it.to,
            className: cls,
            title: it.label,
            "aria-label": it.label,
            onClick: (e: MouseEvent) => e.stopPropagation(),
            children: content,
          };
          return renderLink ? (
            <RenderedLink key={it.label} render={renderLink} {...linkProps} />
          ) : (
            <a key={it.label} {...linkProps} />
          );
        }
        return (
          <button
            key={it.label}
            type="button"
            className={cls}
            title={it.label}
            aria-label={it.label}
            onClick={(e) => {
              e.stopPropagation();
              it.onClick?.();
            }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function RenderedLink({ render, ...props }: { render: RenderLink } & Parameters<RenderLink>[0]) {
  return <>{render(props)}</>;
}
