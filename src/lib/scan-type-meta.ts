import {
  Globe,
  Network,
  Globe2,
  AtSign,
  KeyRound,
  MonitorCog,
  Radar,
  FileSearch,
  DatabaseZap,
  type LucideIcon,
} from "lucide-react";
import type { ScanType } from "@/lib/types";

export const scanTypeMeta: Record<ScanType, { label: string; icon: LucideIcon; href: string }> = {
  website: { label: "Website Scan", icon: Globe, href: "/website-scanner" },
  ip: { label: "IP Lookup", icon: Network, href: "/ip-intelligence" },
  domain: { label: "Domain Lookup", icon: Globe2, href: "/domain-intelligence" },
  email: { label: "Email Check", icon: AtSign, href: "/email-intelligence" },
  password: { label: "Password Check", icon: KeyRound, href: "/password-health" },
  system: { label: "System Scan", icon: MonitorCog, href: "/system-scanner" },
  network: { label: "Network Scan", icon: Radar, href: "/network-monitor" },
  file: { label: "File Analysis", icon: FileSearch, href: "/file-analysis" },
  breach: { label: "Breach Search", icon: DatabaseZap, href: "/data-breaches" },
};
