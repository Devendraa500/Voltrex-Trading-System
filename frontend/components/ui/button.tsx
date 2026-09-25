import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "custom";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    const isCustomBg = className?.includes("bg-");
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer relative z-20 pointer-events-auto select-none",
          variant === "default" && !isCustomBg && "bg-white text-black hover:bg-white/90 shadow-md",
          variant === "outline" && "border border-white/20 text-white hover:bg-white/10",
          variant === "ghost" && "text-white/80 hover:text-white hover:bg-white/5",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
