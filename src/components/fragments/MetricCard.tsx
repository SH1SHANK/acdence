import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, isLoading, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="metric-card"
      className={cn(
        "rounded-lg border border-border-default bg-surface-100 p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs transition-colors hover:border-border-strong",
        isLoading && "animate-pulse opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
MetricCard.displayName = "MetricCard";

export const MetricCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="metric-card-header"
    className={cn("flex items-center justify-between gap-2 min-w-0", className)}
    {...props}
  />
));
MetricCardHeader.displayName = "MetricCardHeader";

export const MetricCardLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="metric-card-label"
    className={cn(
      "text-[11px] font-mono uppercase tracking-wider text-foreground-lighter flex items-center gap-1.5 truncate",
      className,
    )}
    {...props}
  />
));
MetricCardLabel.displayName = "MetricCardLabel";

export const MetricCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="metric-card-content"
    className={cn("flex items-baseline justify-between gap-3 flex-wrap", className)}
    {...props}
  />
));
MetricCardContent.displayName = "MetricCardContent";

export const MetricCardValue = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="metric-card-value"
    className={cn(
      "text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight",
      className,
    )}
    {...props}
  />
));
MetricCardValue.displayName = "MetricCardValue";

export interface MetricCardDifferentialProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "positive" | "negative" | "neutral";
  value?: string | number;
}

export const MetricCardDifferential = React.forwardRef<
  HTMLSpanElement,
  MetricCardDifferentialProps
>(({ className, variant = "neutral", value, children, ...props }, ref) => {
  return (
    <span
      ref={ref}
      data-slot="metric-card-differential"
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums px-1.5 py-0.5 rounded",
        variant === "positive" && "bg-brand/10 text-brand border border-brand/20",
        variant === "negative" && "bg-destructive/10 text-destructive border border-destructive/20",
        variant === "neutral" &&
          "bg-surface-200 text-foreground-lighter border border-border-default",
        className,
      )}
      {...props}
    >
      {variant === "positive" && <ArrowUpRight className="size-3" />}
      {variant === "negative" && <ArrowDownRight className="size-3" />}
      {variant === "neutral" && <Minus className="size-3" />}
      {value ?? children}
    </span>
  );
});
MetricCardDifferential.displayName = "MetricCardDifferential";
