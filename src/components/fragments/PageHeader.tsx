import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "small" | "large";
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, size = "default", ...props }, ref) => (
    <div
      ref={ref}
      data-slot="page-header"
      data-size={size}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-5 pt-1",
        className,
      )}
      {...props}
    />
  ),
);
PageHeader.displayName = "PageHeader";

export const PageHeaderMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-header-meta"
    className={cn("flex items-start sm:items-center gap-3.5 min-w-0", className)}
    {...props}
  />
));
PageHeaderMeta.displayName = "PageHeaderMeta";

export const PageHeaderIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-header-icon"
    className={cn(
      "size-9 rounded-md bg-surface-200 border border-border-default flex items-center justify-center shrink-0 text-brand",
      className,
    )}
    {...props}
  />
));
PageHeaderIcon.displayName = "PageHeaderIcon";

export const PageHeaderSummary = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-header-summary"
    className={cn("flex flex-col gap-1 min-w-0", className)}
    {...props}
  />
));
PageHeaderSummary.displayName = "PageHeaderSummary";

export const PageHeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    data-slot="page-header-title"
    className={cn(
      "text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight",
      className,
    )}
    {...props}
  />
));
PageHeaderTitle.displayName = "PageHeaderTitle";

export const PageHeaderDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="page-header-description"
    className={cn("text-xs sm:text-sm text-foreground-light leading-relaxed", className)}
    {...props}
  />
));
PageHeaderDescription.displayName = "PageHeaderDescription";

export const PageHeaderActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-header-actions"
    className={cn("flex items-center gap-2 shrink-0 flex-wrap", className)}
    {...props}
  />
));
PageHeaderActions.displayName = "PageHeaderActions";
