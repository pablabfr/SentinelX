import { resolveTxtFlat } from "@/lib/services/dns";

export interface SpfResult {
  found: boolean;
  record?: string;
  mechanisms: string[];
  hasAll: boolean;
  allQualifier: "hard-fail" | "soft-fail" | "neutral" | "pass" | "none";
  grade: "A" | "B" | "C" | "D" | "F";
  issues: string[];
}

export interface DmarcResult {
  found: boolean;
  record?: string;
  policy?: "none" | "quarantine" | "reject";
  pct?: number;
  rua?: string[];
  ruf?: string[];
  grade: "A" | "B" | "C" | "D" | "F";
  issues: string[];
}

export interface DkimResult {
  selector: string;
  found: boolean;
  record?: string;
}

export async function checkSpf(domain: string): Promise<SpfResult> {
  const records = await resolveTxtFlat(domain);
  const spf = records.find((r) => r.toLowerCase().startsWith("v=spf1"));
  if (!spf) {
    return {
      found: false,
      mechanisms: [],
      hasAll: false,
      allQualifier: "none",
      grade: "F",
      issues: ["No SPF record found. Anyone can spoof mail claiming to be from this domain."],
    };
  }

  const mechanisms = spf.split(/\s+/).filter((m) => m && m !== "v=spf1");
  const issues: string[] = [];
  let allQualifier: SpfResult["allQualifier"] = "none";

  if (mechanisms.some((m) => m === "-all")) allQualifier = "hard-fail";
  else if (mechanisms.some((m) => m === "~all")) allQualifier = "soft-fail";
  else if (mechanisms.some((m) => m === "?all")) allQualifier = "neutral";
  else if (mechanisms.some((m) => m === "+all")) allQualifier = "pass";

  if (allQualifier === "pass") issues.push("SPF uses +all which allows any server to send mail as this domain — critical misconfiguration.");
  if (allQualifier === "none") issues.push("SPF record has no 'all' mechanism — enforcement is undefined.");
  if (allQualifier === "neutral") issues.push("SPF uses ?all (neutral) which provides little protection.");
  if (mechanisms.filter((m) => m.startsWith("include:")).length > 8) issues.push("Very high number of includes — risk of exceeding the 10 DNS lookup limit, which breaks SPF.");

  const grade: SpfResult["grade"] =
    allQualifier === "hard-fail" ? "A" : allQualifier === "soft-fail" ? "B" : allQualifier === "neutral" ? "D" : allQualifier === "pass" ? "F" : "D";

  return { found: true, record: spf, mechanisms, hasAll: allQualifier !== "none", allQualifier, grade, issues };
}

export async function checkDmarc(domain: string): Promise<DmarcResult> {
  const records = await resolveTxtFlat(`_dmarc.${domain}`);
  const dmarc = records.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  if (!dmarc) {
    return {
      found: false,
      grade: "F",
      issues: ["No DMARC record found. Email spoofing protection is not enforced for this domain."],
    };
  }

  const tags = Object.fromEntries(
    dmarc.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const [k, ...v] = part.split("=");
      return [k.trim().toLowerCase(), v.join("=").trim()];
    })
  );

  const policy = (tags["p"] as DmarcResult["policy"]) ?? "none";
  const pct = tags["pct"] ? Number(tags["pct"]) : 100;
  const issues: string[] = [];

  if (policy === "none") issues.push("Policy is 'none' — DMARC is only monitoring, not blocking spoofed mail.");
  if (pct < 100) issues.push(`Only ${pct}% of failing mail is subject to the policy.`);
  if (!tags["rua"]) issues.push("No aggregate report address (rua) configured — you won't see abuse reports.");

  const grade: DmarcResult["grade"] =
    policy === "reject" && pct === 100 ? "A" : policy === "quarantine" ? "B" : policy === "none" ? "D" : "C";

  return {
    found: true,
    record: dmarc,
    policy,
    pct,
    rua: tags["rua"]?.split(",").map((s) => s.trim()),
    ruf: tags["ruf"]?.split(",").map((s) => s.trim()),
    grade,
    issues,
  };
}

const COMMON_DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "mail", "dkim", "smtp", "s1", "s2"];

export async function checkDkim(domain: string, selectors: string[] = COMMON_DKIM_SELECTORS): Promise<DkimResult[]> {
  const results = await Promise.all(
    selectors.map(async (selector) => {
      const records = await resolveTxtFlat(`${selector}._domainkey.${domain}`);
      const record = records.find((r) => /v=dkim1|p=/i.test(r));
      return { selector, found: Boolean(record), record };
    })
  );
  return results;
}
