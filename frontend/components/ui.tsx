"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const Panel = forwardRef<
  HTMLElement,
  { children: ReactNode; className?: string }
>(function Panel({ children, className }, ref) {
  return (
    <motion.section
      ref={ref as React.Ref<HTMLElement>}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("panel", className)}
    >
      {children}
    </motion.section>
  );
});


export function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn("button", `button-${variant}`, className)}
      {...props}
    />
  );
}

export function SignalBadge({ signal }: { signal: string }) {
  return (
    <span className={cn("signal", `signal-${signal.toLowerCase()}`)}>
      {signal}
    </span>
  );
}
