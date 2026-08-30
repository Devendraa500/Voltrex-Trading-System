import React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/80 text-white shadow-2xl backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
