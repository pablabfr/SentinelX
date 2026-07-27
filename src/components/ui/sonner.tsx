"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl! border! border-[var(--color-border)]! bg-[var(--color-bg-raised)]! text-[var(--color-text)]! shadow-2xl!",
          description: "text-[var(--color-text-secondary)]!",
          actionButton: "bg-[var(--color-accent-blue)]! text-black!",
          cancelButton: "bg-white/10! text-[var(--color-text-secondary)]!",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
