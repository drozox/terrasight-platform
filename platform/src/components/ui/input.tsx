import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm",
        "placeholder:text-on-surface-variant/60",
        "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
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
