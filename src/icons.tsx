import type { ReactNode } from "react";

// Inline SVG so the library has no icon dependency. 24px grid, stroke follows
// currentColor, so the host's token colours apply.
const Svg = ({ size, children }: { size: number; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const SearchIcon = ({ size = 15 }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

export const XIcon = ({ size = 12 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);

export const ChevronLeftIcon = ({ size = 15 }: { size?: number }) => (
  <Svg size={size}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);

export const ChevronRightIcon = ({ size = 15 }: { size?: number }) => (
  <Svg size={size}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const InboxIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Svg>
);
