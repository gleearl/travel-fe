import { useId } from "react";
import { useTheme, type ThemePreference } from "../lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/* Three options side by side, one always on: a segmented control, built from
   real radio buttons so arrow keys move between them and a screen reader
   announces "1 of 3". The device's setting comes first because it is the
   default and, for most people, the right answer. */
export function AppearancePicker() {
  const { preference, theme, setPreference } = useTheme();
  const name = useId();

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="Appearance"
        className="inline-flex w-full rounded-card border border-rule bg-sunk p-1 sm:w-auto sm:self-start"
      >
        {OPTIONS.map((option) => {
          const on = preference === option.value;
          return (
            <label
              key={option.value}
              className={[
                "relative flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[0.375rem] px-3.5 text-[0.875rem] transition-colors sm:flex-none",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                on ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={on}
                onChange={() => setPreference(option.value)}
                className="sr-only"
              />
              <ThemeIcon value={option.value} />
              {option.label}
            </label>
          );
        })}
      </div>
      {preference === "system" ? (
        <p className="text-[0.8125rem] text-ink-3">
          Your device is set to {theme} right now, so that is what you'll see. It changes when your device does.
        </p>
      ) : null}
    </div>
  );
}

function ThemeIcon({ value }: { value: ThemePreference }) {
  const common = { width: 14, height: 14, viewBox: "0 0 16 16", "aria-hidden": true, fill: "none" } as const;
  if (value === "light") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (value === "dark") {
    return (
      <svg {...common}>
        <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 13.75h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
