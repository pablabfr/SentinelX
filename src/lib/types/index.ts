export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "safe";

export interface RiskScore {
  score: number; // 0-100, higher = riskier
  level: RiskLevel;
  summary: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  recommendation?: string;
  evidence?: string;
}

export interface ScanMeta {
  id: string;
  type: ScanType;
  target: string;
  startedAt: string;
  finishedAt?: string;
  status: "queued" | "running" | "completed" | "error";
  error?: string;
}

export type ScanType =
  | "website"
  | "ip"
  | "domain"
  | "email"
  | "password"
  | "system"
  | "network"
  | "file"
  | "breach";

export interface AIExplanation {
  plainEnglish: string;
  technical: string;
  recommendedActions: string[];
  priority: "immediate" | "high" | "moderate" | "low";
  estimatedFixTime: string;
  difficulty: "easy" | "moderate" | "advanced";
}

export interface ApiKeys {
  openai?: string;
  virustotal?: string;
  abuseipdb?: string;
  shodan?: string;
  hibp?: string;
  ipinfo?: string;
}
