import * as React from "react";
import { cn } from "@/lib/utils";

// Tooltip simples (CSS only, sem Radix) — exibe ao hover via group/tooltip
export function Tooltip({
  children,
  content,
  side = "top",
}: {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-md group-hover/tooltip:block dark:bg-zinc-100 dark:text-zinc-900",
          positionClasses[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}
