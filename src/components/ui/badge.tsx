import * as React from "react";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  default: "bg-indigo-100 text-indigo-700",
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-zinc-100 text-zinc-600",
};

export function Badge({
  className,
  color = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: keyof typeof COLORS }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        COLORS[color],
        className
      )}
      {...props}
    />
  );
}
