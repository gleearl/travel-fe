import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

/* 44px minimum on the medium size, which is the one used anywhere a thumb is
   involved. The small size is for controls that sit inside a row of text and
   are never the primary target. */
const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-[0.9375rem]",
  sm: "min-h-9 px-3 text-[0.8125rem]",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90 active:bg-ink/80",
  secondary: "bg-surface text-ink border border-rule hover:border-rule-strong active:bg-sunk",
  ghost: "text-ink-2 hover:text-ink hover:bg-accent-soft active:bg-sunk",
  danger: "text-danger hover:bg-danger/8 active:bg-danger/12",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  full = false,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-card font-medium",
        "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
        SIZES[size],
        VARIANTS[variant],
        full ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
