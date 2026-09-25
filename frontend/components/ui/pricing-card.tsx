import React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-[#0d131b]/90 relative w-full max-w-xs rounded-xl",
        "p-1.5 shadow-2xl backdrop-blur-2xl",
        "border border-white/10",
        className
      )}
      {...props}
    />
  );
}

function Header({
  className,
  children,
  glassEffect = true,
  ...props
}: React.ComponentProps<"div"> & {
  glassEffect?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white/[0.04] relative mb-4 rounded-xl border border-white/10 p-4 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Top glass gradient with pointer-events-none */}
      {glassEffect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 rounded-[inherit]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0) 100%)",
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Plan({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-8 flex items-center justify-between", className)}
      {...props}
    />
  );
}

function Description({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-[#9ca3af] text-xs", className)} {...props} />
  );
}

function PlanName({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-[#9ca3af] flex items-center gap-2 text-sm font-medium [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "border-white/20 text-[#eef3f8]/80 rounded-full border px-2 py-0.5 text-xs bg-white/[0.04]",
        className
      )}
      {...props}
    />
  );
}

function Price({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mb-3 flex items-end gap-1", className)} {...props} />
  );
}

function MainPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-3xl font-extrabold tracking-tight text-[#eef3f8]", className)}
      {...props}
    />
  );
}

function Period({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-[#9ca3af] pb-1 text-sm", className)}
      {...props}
    />
  );
}

function OriginalPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-[#9ca3af]/60 mr-1 ml-auto text-lg line-through",
        className
      )}
      {...props}
    />
  );
}

function Body({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-6 p-3", className)} {...props} />;
}

function List({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("space-y-3", className)} {...props} />;
}

function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn(
        "text-[#9ca3af] flex items-start gap-3 text-sm",
        className
      )}
      {...props}
    />
  );
}

function Separator({
  children = "Upgrade to access",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[#9ca3af] flex items-center gap-3 text-sm",
        className
      )}
      {...props}
    >
      <span className="bg-white/10 h-[1px] flex-1" />
      <span className="text-[#9ca3af] text-xs uppercase tracking-wider shrink-0">{children}</span>
      <span className="bg-white/10 h-[1px] flex-1" />
    </div>
  );
}

export {
  Card,
  Header,
  Description,
  Plan,
  PlanName,
  Badge,
  Price,
  MainPrice,
  Period,
  OriginalPrice,
  Body,
  List,
  ListItem,
  Separator,
};
