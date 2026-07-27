import type { IpGeoResult } from "@/lib/services/ip-geo";
import type { AbuseIpDbResult } from "@/lib/services/integrations/abuseipdb";
import type { Finding } from "@/lib/types";
import { scoreFromFindings, levelFromScore } from "@/lib/risk";

export function buildIpFindings(geo: IpGeoResult, abuse: AbuseIpDbResult | null): Finding[] {
  const findings: Finding[] = [];

  if (geo.isProxy) {
    findings.push({
      id: "ip-proxy",
      title: "Address is a known proxy/VPN endpoint",
      description: "Traffic from this IP is being relayed through a proxy or VPN service.",
      severity: "medium",
      category: "Anonymization",
    });
  }
  if (geo.isTor) {
    findings.push({
      id: "ip-tor",
      title: "Address is a Tor exit node",
      description: "This IP is a known Tor exit node — connections may originate from anywhere.",
      severity: "high",
      category: "Anonymization",
    });
  }
  if (geo.isHosting) {
    findings.push({
      id: "ip-hosting",
      title: "Address belongs to a hosting/datacenter network",
      description: "This is not a typical residential or mobile IP — often used by bots, scrapers, or servers.",
      severity: "low",
      category: "Network Type",
    });
  }

  if (abuse) {
    if (abuse.abuseConfidenceScore >= 75) {
      findings.push({
        id: "abuse-high",
        title: `AbuseIPDB confidence score: ${abuse.abuseConfidenceScore}%`,
        description: `${abuse.totalReports} abuse report(s) filed against this IP.`,
        severity: "critical",
        category: "Reputation",
        recommendation: "Block or closely monitor traffic from this address.",
      });
    } else if (abuse.abuseConfidenceScore >= 25) {
      findings.push({
        id: "abuse-medium",
        title: `AbuseIPDB confidence score: ${abuse.abuseConfidenceScore}%`,
        description: `${abuse.totalReports} abuse report(s) filed against this IP.`,
        severity: "medium",
        category: "Reputation",
      });
    } else if (abuse.abuseConfidenceScore > 0) {
      findings.push({
        id: "abuse-low",
        title: `AbuseIPDB confidence score: ${abuse.abuseConfidenceScore}%`,
        description: `${abuse.totalReports} historical report(s), low overall confidence.`,
        severity: "info",
        category: "Reputation",
      });
    }
  }

  return findings;
}

export function scoreIp(geo: IpGeoResult, abuse: AbuseIpDbResult | null) {
  const findings = buildIpFindings(geo, abuse);
  const riskScore = scoreFromFindings(findings, geo.isProxy || geo.isTor ? 10 : 0);
  return { findings, riskScore, level: levelFromScore(riskScore) };
}
