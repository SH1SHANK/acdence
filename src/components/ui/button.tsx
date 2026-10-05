import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// oxlint-disable-next-line react/only-export-components
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-black hover:bg-brand-500 border-brand/20 shadow-xs active:translate-y-px font-semibold",
        default:
          "border-border-strong bg-surface-100 text-foreground hover:bg-surface-200 active:translate-y-px shadow-xs",
        outline:
          "border-border-strong bg-transparent text-foreground hover:bg-surface-100 hover:text-foreground active:translate-y-px",
        secondary:
          "border-border-default bg-surface-200 text-foreground hover:bg-surface-300 active:translate-y-px",
        ghost:
          "border-transparent bg-transparent text-foreground-light hover:bg-surface-200 hover:text-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/30",
        link: "border-transparent bg-transparent text-brand underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        tiny: "h-6 gap-1 px-2 text-xs rounded-md [&_svg:not([class*='size-'])]:size-3",
        small: "h-7 gap-1.5 px-2.5 text-xs rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-8 gap-2 px-3 text-sm rounded-md [&_svg:not([class*='size-'])]:size-4",
        large: "h-9 gap-2 px-4 text-sm rounded-md [&_svg:not([class*='size-'])]:size-4",

        // Backward compatible aliases
        xs: "h-6 gap-1 px-2 text-xs rounded-md [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 px-2.5 text-xs rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-8 gap-2 px-3 text-sm rounded-md [&_svg:not([class*='size-'])]:size-4",
        lg: "h-9 gap-2 px-4 text-sm rounded-md [&_svg:not([class*='size-'])]:size-4",

        icon: "size-8 rounded-md",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 rounded-md [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
