import type { HttpScanResult } from "@/lib/services/http-scan";
import type { TlsCertInfo } from "@/lib/services/tls-cert";
import type { Finding } from "@/lib/types";
import { scoreFromFindings, levelFromScore } from "@/lib/risk";

export interface WebsiteScanBundle {
  hostname: string;
  http: HttpScanResult;
  tls: TlsCertInfo | { error: string };
}

export function buildWebsiteFindings(bundle: WebsiteScanBundle): Finding[] {
  const findings: Finding[] = [];
  const { http, tls } = bundle;

  if (!http.https) {
    findings.push({
      id: "no-https",
      title: "Site is not served over HTTPS",
      description: "Traffic to this site is unencrypted, exposing visitors to eavesdropping and tampering.",
      severity: "critical",
      category: "Transport Security",
      recommendation: "Obtain a TLS certificate and force all traffic to HTTPS.",
    });
  }

  for (const h of http.securityHeaders) {
    if (!h.present && h.severity !== "info") {
      findings.push({
        id: `header-${h.name}`,
        title: `Missing ${h.name}`,
        description: `The response did not include a ${h.name} header.`,
        severity: h.severity,
        category: "HTTP Security Headers",
        recommendation: h.recommendation,
      });
    }
  }

  for (const cookie of http.cookies) {
    if (!cookie.secure) {
      findings.push({
        id: `cookie-secure-${cookie.name}`,
        title: `Cookie "${cookie.name}" missing Secure flag`,
        description: "This cookie can be transmitted over unencrypted connections.",
        severity: "medium",
        category: "Cookies",
        recommendation: "Set the Secure attribute on all cookies.",
      });
    }
    if (!cookie.httpOnly) {
      findings.push({
        id: `cookie-httponly-${cookie.name}`,
        title: `Cookie "${cookie.name}" missing HttpOnly flag`,
        description: "This cookie is accessible to JavaScript, increasing XSS impact.",
        severity: "medium",
        category: "Cookies",
        recommendation: "Set the HttpOnly attribute on session/auth cookies.",
      });
    }
    if (!cookie.sameSite || cookie.sameSite.toLowerCase() === "none") {
      findings.push({
        id: `cookie-samesite-${cookie.name}`,
        title: `Cookie "${cookie.name}" has weak SameSite policy`,
        description: "Without a strict SameSite policy this cookie is more exposed to CSRF.",
        severity: "low",
        category: "Cookies",
        recommendation: "Set SameSite=Lax or Strict where possible.",
      });
    }
  }

  if ("error" in tls) {
    findings.push({
      id: "tls-error",
      title: "Could not verify TLS certificate",
      description: tls.error,
      severity: "medium",
      category: "Transport Security",
    });
  } else {
    if (tls.daysUntilExpiry < 0) {
      findings.push({
        id: "tls-expired",
        title: "TLS certificate has expired",
        description: `The certificate expired on ${new Date(tls.validTo).toLocaleDateString()}.`,
        severity: "critical",
        category: "Transport Security",
        recommendation: "Renew the TLS certificate immediately.",
      });
    } else if (tls.daysUntilExpiry < 14) {
      findings.push({
        id: "tls-expiring",
        title: "TLS certificate expiring soon",
        description: `The certificate expires in ${tls.daysUntilExpiry} day(s).`,
        severity: "high",
        category: "Transport Security",
        recommendation: "Renew the certificate before it expires to avoid a browser warning outage.",
      });
    } else if (tls.daysUntilExpiry < 30) {
      findings.push({
        id: "tls-expiring-soon",
        title: "TLS certificate expires within 30 days",
        description: `The certificate expires in ${tls.daysUntilExpiry} day(s).`,
        severity: "low",
        category: "Transport Security",
      });
    }
    if (!tls.authorized) {
      findings.push({
        id: "tls-untrusted",
        title: "TLS certificate is not trusted",
        description: tls.authorizationError ?? "The certificate chain could not be verified.",
        severity: "high",
        category: "Transport Security",
        recommendation: "Use a certificate issued by a publicly trusted CA.",
      });
    }
  }

  if (http.redirectChain.length > 3) {
    findings.push({
      id: "redirect-chain",
      title: "Long redirect chain",
      description: `${http.redirectChain.length} hops before reaching the final destination.`,
      severity: "low",
      category: "Configuration",
      recommendation: "Reduce redirect hops to improve performance and reduce hijack surface.",
    });
  }

  if (!http.robotsTxt.found) {
    findings.push({
      id: "no-robots",
      title: "No robots.txt found",
      description: "Search engine crawling directives are not defined.",
      severity: "info",
      category: "Configuration",
    });
  }

  return findings;
}

export function scoreWebsiteBundle(bundle: WebsiteScanBundle) {
  const findings = buildWebsiteFindings(bundle);
  const score = scoreFromFindings(findings);
  const level = levelFromScore(score);
  const securityScore = 100 - score;
  return { findings, riskScore: score, level, securityScore };
}
