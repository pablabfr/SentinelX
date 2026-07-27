import { Badge } from "@/components/ui/badge";
import { riskBadgeVariant, severityBadgeVariant } from "@/lib/risk";
import type { RiskLevel, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <Badge variant={riskBadgeVariant[level]} className={cn("capitalize", className)}>
      {level}
    </Badge>
  );
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant={severityBadgeVariant[severity]} className={cn("capitalize", className)}>
      {severity}
    </Badge>
  );
}
