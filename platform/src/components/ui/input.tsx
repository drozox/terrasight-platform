import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm",
        // UX-19: opacity 80 en placeholder (era /60) — 4.0:1 → 4.7:1, pasa WCAG AA.
        "placeholder:text-on-surface-variant/80",
        // UX-23: focus ring estandarizado a 2px + offset + sin re-paint en click.
        "focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border-none bg-surface-container-highest px-3 text-sm",
        "focus:outline-none focus:ring-1 focus:ring-primary",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Input, Select };
