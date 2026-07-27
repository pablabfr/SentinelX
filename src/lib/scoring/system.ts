import type { SystemSnapshot } from "@/lib/services/system";
import type { Finding } from "@/lib/types";
import { scoreFromFindings, levelFromScore } from "@/lib/risk";

export function buildSystemFindings(snapshot: SystemSnapshot): Finding[] {
  const findings: Finding[] = [];

  if (snapshot.memory.usedPercent >= 90) {
    findings.push({
      id: "mem-critical",
      title: "Memory usage critically high",
      description: `${snapshot.memory.usedPercent}% of RAM in use.`,
      severity: "high",
      category: "Resources",
      recommendation: "Investigate high-memory processes below and restart or scale as needed.",
    });
  } else if (snapshot.memory.usedPercent >= 75) {
    findings.push({
      id: "mem-elevated",
      title: "Memory usage elevated",
      description: `${snapshot.memory.usedPercent}% of RAM in use.`,
      severity: "medium",
      category: "Resources",
    });
  }

  for (const disk of snapshot.disks) {
    if (disk.usedPercent >= 90) {
      findings.push({
        id: `disk-${disk.mount}`,
        title: `Disk "${disk.mount}" nearly full`,
        description: `${disk.usedPercent}% used.`,
        severity: "high",
        category: "Resources",
        recommendation: "Free up disk space to avoid service degradation.",
      });
    }
  }

  if (snapshot.cpu.currentLoad !== null && snapshot.cpu.currentLoad >= 90) {
    findings.push({
      id: "cpu-high",
      title: "CPU load critically high",
      description: `Current load: ${snapshot.cpu.currentLoad}%.`,
      severity: "medium",
      category: "Resources",
    });
  }

  const listeningPorts = snapshot.network.connections;
  if (listeningPorts.length > 20) {
    findings.push({
      id: "many-ports",
      title: `${listeningPorts.length} listening ports detected`,
      description: "A large number of open listening ports increases attack surface.",
      severity: "medium",
      category: "Network Exposure",
      recommendation: "Audit each listening service and close any that are unnecessary.",
    });
  }

  const highRiskPorts = ["21", "23", "3389", "445", "135", "139"];
  for (const conn of listeningPorts) {
    if (highRiskPorts.includes(conn.localPort)) {
      findings.push({
        id: `risky-port-${conn.localPort}`,
        title: `High-risk service listening on port ${conn.localPort}`,
        description: `${conn.process ?? "Unknown process"} is exposing a commonly-attacked protocol.`,
        severity: "high",
        category: "Network Exposure",
        recommendation: "Restrict access with a firewall or disable the service if not required.",
      });
    }
  }

  if (snapshot.uptimeSeconds > 90 * 86400) {
    findings.push({
      id: "long-uptime",
      title: "Host has not rebooted in over 90 days",
      description: `Uptime: ${Math.floor(snapshot.uptimeSeconds / 86400)} days.`,
      severity: "low",
      category: "Patch Hygiene",
      recommendation: "Schedule a reboot after applying pending kernel/security updates.",
    });
  }

  return findings;
}

export function scoreSystem(snapshot: SystemSnapshot) {
  const findings = buildSystemFindings(snapshot);
  const riskScore = scoreFromFindings(findings);
  return { findings, riskScore, level: levelFromScore(riskScore) };
}
