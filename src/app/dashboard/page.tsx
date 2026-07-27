import { PageHeader } from "@/components/shared/page-header";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="Your complete security overview." />
      <p className="text-sm text-[var(--color-text-muted)]">Widgets loading…</p>
    </div>
  );
}
