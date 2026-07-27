import type { DnsRecords } from "@/lib/services/dns";
import type { RdapResult } from "@/lib/services/rdap";
import type { SpfResult, DmarcResult } from "@/lib/services/email-auth";
import type { Finding } from "@/lib/types";
import { scoreFromFindings, levelFromScore } from "@/lib/risk";

export function buildDomainFindings(opts: {
  dns: DnsRecords;
  rdap: RdapResult | { error: string } | null;
  spf?: SpfResult;
  dmarc?: DmarcResult;
}): Finding[] {
  const findings: Finding[] = [];
  const { dns, rdap, spf, dmarc } = opts;

  if (dns.a.length === 0 && dns.aaaa.length === 0) {
    findings.push({
      id: "no-a-record",
      title: "No A/AAAA records found",
      description: "This domain does not currently resolve to any IP address.",
      severity: "low",
      category: "DNS",
    });
  }
  if (dns.ns.length === 0) {
    findings.push({
      id: "no-ns",
      title: "No nameservers found",
      description: "Could not resolve NS records — the domain may be misconfigured or unregistered.",
      severity: "medium",
      category: "DNS",
    });
  }

  if (rdap && "error" in rdap) {
    findings.push({
      id: "rdap-unavailable",
      title: "WHOIS/RDAP data unavailable",
      description: rdap.error,
      severity: "info",
      category: "Registration",
    });
  } else if (rdap) {
    const regEvent = rdap.events.find((e) => e.action === "registration");
    if (regEvent) {
      const ageDays = (Date.now() - new Date(regEvent.date).getTime()) / 86_400_000;
      if (ageDays < 30) {
        findings.push({
          id: "domain-very-new",
          title: "Domain registered very recently",
          description: `Registered ${Math.round(ageDays)} day(s) ago. Newly registered domains are disproportionately used in phishing and scam campaigns.`,
          severity: "high",
          category: "Registration",
        });
      } else if (ageDays < 180) {
        findings.push({
          id: "domain-new",
          title: "Domain registered recently",
          description: `Registered ${Math.round(ageDays)} day(s) ago.`,
          severity: "medium",
          category: "Registration",
        });
      }
    }
    const expEvent = rdap.events.find((e) => e.action === "expiration");
    if (expEvent) {
      const daysLeft = (new Date(expEvent.date).getTime() - Date.now()) / 86_400_000;
      if (daysLeft < 30 && daysLeft > 0) {
        findings.push({
          id: "domain-expiring",
          title: "Domain registration expiring soon",
          description: `Expires in ${Math.round(daysLeft)} day(s). If not renewed, this domain could be hijacked by a third party.`,
          severity: "high",
          category: "Registration",
        });
      }
    }
  }

  if (spf && spf.grade === "F") {
    findings.push({
      id: "spf-missing",
      title: "No valid SPF policy",
      description: spf.issues[0] ?? "SPF is missing or misconfigured.",
      severity: "high",
      category: "Email Security",
    });
  }
  if (dmarc && (dmarc.grade === "F" || dmarc.grade === "D")) {
    findings.push({
      id: "dmarc-weak",
      title: "Weak or missing DMARC policy",
      description: dmarc.issues[0] ?? "DMARC is not enforcing rejection of spoofed mail.",
      severity: dmarc.grade === "F" ? "high" : "medium",
      category: "Email Security",
    });
  }

  return findings;
}

export function scoreDomain(opts: Parameters<typeof buildDomainFindings>[0]) {
  const findings = buildDomainFindings(opts);
  const riskScore = scoreFromFindings(findings);
  return { findings, riskScore, level: levelFromScore(riskScore) };
}
