import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg tabular-nums shadow-none outline-none transition-colors placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-ring/20",
        className,
      )}
      {...props}
    />
  );
}
