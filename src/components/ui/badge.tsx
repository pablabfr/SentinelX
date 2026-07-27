import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-[var(--color-border)] bg-white/5 text-[var(--color-text-secondary)]",
        blue: "border-[var(--color-accent-blue)]/30 bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]",
        purple: "border-[var(--color-accent-purple)]/30 bg-[var(--color-accent-purple)]/10 text-[var(--color-accent-purple)]",
        success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
        warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
        danger: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
        outline: "border-[var(--color-border)] text-[var(--color-text-secondary)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
