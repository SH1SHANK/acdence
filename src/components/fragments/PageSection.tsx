import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {}

export const PageSection = React.forwardRef<HTMLElement, PageSectionProps>(
  ({ className, ...props }, ref) => (
    <section
      ref={ref}
      data-slot="page-section"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  ),
);
PageSection.displayName = "PageSection";

export const PageSectionMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-section-meta"
    className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2", className)}
    {...props}
  />
));
PageSectionMeta.displayName = "PageSectionMeta";

export const PageSectionSummary = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-section-summary"
    className={cn("flex flex-col gap-0.5", className)}
    {...props}
  />
));
PageSectionSummary.displayName = "PageSectionSummary";

export const PageSectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    data-slot="page-section-title"
    className={cn(
      "text-base sm:text-lg font-semibold font-heading text-foreground tracking-tight",
      className,
    )}
    {...props}
  />
));
PageSectionTitle.displayName = "PageSectionTitle";

export const PageSectionDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="page-section-description"
    className={cn("text-xs text-foreground-light leading-relaxed", className)}
    {...props}
  />
));
PageSectionDescription.displayName = "PageSectionDescription";

export const PageSectionAside = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-section-aside"
    className={cn("flex items-center gap-2 shrink-0", className)}
    {...props}
  />
));
PageSectionAside.displayName = "PageSectionAside";

export const PageSectionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="page-section-content" className={cn("w-full", className)} {...props} />
));
PageSectionContent.displayName = "PageSectionContent";
