import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

// oxlint-disable-next-line react/only-export-components
export const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-brand/20 bg-brand/10 text-brand font-medium",
        brand: "border-brand/20 bg-brand/10 text-brand font-medium",
        secondary: "border-border-default bg-surface-200 text-foreground-light",
        destructive: "border-destructive/25 bg-destructive/10 text-destructive",
        warning: "border-warning/25 bg-warning/10 text-warning",
        success: "border-brand/25 bg-brand/10 text-brand",
        outline: "border-border-strong bg-transparent text-foreground-light",
        ghost: "border-transparent bg-transparent text-foreground-muted",
        link: "border-transparent text-brand underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
