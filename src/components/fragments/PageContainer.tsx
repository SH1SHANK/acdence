import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pageContainerVariants = cva(
  "mx-auto w-full @container px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-5 sm:gap-8",
  {
    variants: {
      size: {
        small: "max-w-[768px]",
        default: "max-w-[1200px]",
        large: "max-w-[1600px]",
        full: "max-w-none",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageContainerVariants> {}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="page-container"
      data-size={size}
      className={cn(pageContainerVariants({ size }), className)}
      {...props}
    />
  ),
);
PageContainer.displayName = "PageContainer";
