import {
  LayoutDashboard,
  ShieldAlert,
  MonitorCog,
  Globe,
  Network,
  AtSign,
  KeyRound,
  EyeOff,
  DatabaseZap,
  FileSearch,
  Radar,
  Bot,
  FileBarChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
  { label: "Threat Centre", href: "/threat-centre", icon: ShieldAlert, keywords: ["cve", "kev", "apt", "ransomware"] },
  { label: "System Scanner", href: "/system-scanner", icon: MonitorCog, keywords: ["processes", "ports", "services"] },
  { label: "Website Scanner", href: "/website-scanner", icon: Globe, keywords: ["url", "ssl", "headers"] },
  { label: "IP Intelligence", href: "/ip-intelligence", icon: Network, keywords: ["ip", "asn", "geolocation"] },
  { label: "Domain Intelligence", href: "/domain-intelligence", icon: Globe, keywords: ["whois", "dns", "domain"] },
  { label: "Email Intelligence", href: "/email-intelligence", icon: AtSign, keywords: ["spf", "dkim", "dmarc", "phishing"] },
  { label: "Password Health", href: "/password-health", icon: KeyRound, keywords: ["entropy", "breach", "generator"] },
  { label: "Dark Web Monitor", href: "/dark-web-monitor", icon: EyeOff, keywords: ["breach", "monitor"] },
  { label: "Data Breaches", href: "/data-breaches", icon: DatabaseZap, keywords: ["hibp", "leak"] },
  { label: "File Analysis", href: "/file-analysis", icon: FileSearch, keywords: ["hash", "malware", "virustotal"] },
  { label: "Network Monitor", href: "/network-monitor", icon: Radar, keywords: ["bandwidth", "devices", "dns"] },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot, shortcut: "⌘/", keywords: ["chat", "ai"] },
  { label: "Reports", href: "/reports", icon: FileBarChart, keywords: ["pdf", "export"] },
  { label: "Settings", href: "/settings", icon: Settings, keywords: ["api keys", "appearance"] },
];
