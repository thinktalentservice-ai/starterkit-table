import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import { Search, X } from "lucide-react";

export type SearchInputProps = Omit<TextFieldProps<"outlined">, "onChange" | "value" | "variant"> & {
  value: string;
  /** Receives the STRING, not the event. */
  onChange?: (value: string) => void;
  /** Defaults to `onChange('')`. */
  onClear?: () => void;
};

/** Toolbar search box: magnifier adornment, clear button once there is text. */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  "aria-label": ariaLabel,
  sx,
  ...props
}: SearchInputProps) {
  const clear = onClear ?? (() => onChange?.(""));

  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      sx={[{ flex: "1 1 260px", maxWidth: 360 }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{
        htmlInput: { "aria-label": ariaLabel ?? placeholder },
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ color: "var(--fg-muted)" }}>
              <Search size={15} aria-hidden="true" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" title="Clear search" aria-label="Clear search" onClick={clear}>
                <X size={12} aria-hidden="true" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
      {...props}
    />
  );
}
