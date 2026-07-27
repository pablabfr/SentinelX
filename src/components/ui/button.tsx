"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-blue)]/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent-blue)] text-black hover:brightness-110 shadow-[0_0_0_1px_rgba(0,194,255,0.3),0_0_20px_-6px_var(--color-accent-blue)]",
        purple:
          "bg-[var(--color-accent-purple)] text-white hover:brightness-110 shadow-[0_0_0_1px_rgba(110,76,255,0.3),0_0_20px_-6px_var(--color-accent-purple)]",
        secondary:
          "bg-[var(--color-panel)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-panel-hover)] hover:border-[#333]",
        ghost:
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/5",
        outline:
          "border border-[var(--color-border)] text-[var(--color-text)] hover:bg-white/5 hover:border-[#3a3a3a]",
        danger:
          "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/25",
        link: "text-[var(--color-accent-blue)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
