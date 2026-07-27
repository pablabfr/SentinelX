export interface ParsedAuthResults {
  spf: "pass" | "fail" | "softfail" | "neutral" | "none" | "unknown";
  dkim: "pass" | "fail" | "none" | "unknown";
  dmarc: "pass" | "fail" | "none" | "unknown";
}

export interface EmailHeaderAnalysis {
  from: string | null;
  returnPath: string | null;
  replyTo: string | null;
  subject: string | null;
  messageId: string | null;
  receivedHops: string[];
  authResults: ParsedAuthResults;
  fromReturnPathMismatch: boolean;
  urls: string[];
  spoofingScore: number; // 0-100
  signals: { label: string; severity: "critical" | "high" | "medium" | "low" | "info"; detail: string }[];
}

function extractHeader(raw: string, name: string): string | null {
  const re = new RegExp(`^${name}:\\s*(.+(?:\\n[ \\t].+)*)`, "im");
  const match = raw.match(re);
  return match ? match[1].replace(/\n[ \t]+/g, " ").trim() : null;
}

function extractEmail(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/<?([\w.+-]+@[\w-]+\.[\w.-]+)>?/);
  return match ? match[1].toLowerCase() : null;
}

function parseAuthResults(raw: string): ParsedAuthResults {
  const header = extractHeader(raw, "Authentication-Results") ?? "";
  const find = (mech: string): string => {
    const m = header.match(new RegExp(`${mech}=([a-z]+)`, "i"));
    return m ? m[1].toLowerCase() : "unknown";
  };
  return {
    spf: (find("spf") as ParsedAuthResults["spf"]) ?? "unknown",
    dkim: (find("dkim") as ParsedAuthResults["dkim"]) ?? "unknown",
    dmarc: (find("dmarc") as ParsedAuthResults["dmarc"]) ?? "unknown",
  };
}

export function analyzeEmailHeaders(raw: string): EmailHeaderAnalysis {
  const fromHeader = extractHeader(raw, "From");
  const returnPathHeader = extractHeader(raw, "Return-Path");
  const replyToHeader = extractHeader(raw, "Reply-To");
  const subject = extractHeader(raw, "Subject");
  const messageId = extractHeader(raw, "Message-ID");

  const from = extractEmail(fromHeader);
  const returnPath = extractEmail(returnPathHeader);
  const replyTo = extractEmail(replyToHeader);

  const receivedHops = Array.from(raw.matchAll(/^Received:\s*(.+(?:\n[ \t].+)*)/gim)).map((m) =>
    m[1].replace(/\n[ \t]+/g, " ").trim()
  );

  const authResults = parseAuthResults(raw);
  const fromDomain = from?.split("@")[1];
  const returnPathDomain = returnPath?.split("@")[1];
  const fromReturnPathMismatch = Boolean(fromDomain && returnPathDomain && fromDomain !== returnPathDomain);

  const urls = Array.from(new Set(Array.from(raw.matchAll(/https?:\/\/[^\s<>"')]+/gi)).map((m) => m[0]))).slice(0, 50);

  const signals: EmailHeaderAnalysis["signals"] = [];
  let spoofingScore = 0;

  if (authResults.spf === "fail") {
    signals.push({ label: "SPF authentication failed", severity: "critical", detail: "The sending server is not authorized to send mail for this domain." });
    spoofingScore += 35;
  } else if (authResults.spf === "softfail") {
    signals.push({ label: "SPF soft-fail", severity: "high", detail: "The sending server is likely not authorized." });
    spoofingScore += 20;
  } else if (authResults.spf === "none") {
    signals.push({ label: "No SPF result found", severity: "medium", detail: "This message could not be validated against SPF." });
    spoofingScore += 10;
  }

  if (authResults.dkim === "fail") {
    signals.push({ label: "DKIM signature failed", severity: "critical", detail: "The message body/headers were altered after signing, or the signature is invalid." });
    spoofingScore += 30;
  } else if (authResults.dkim === "none") {
    signals.push({ label: "No DKIM signature", severity: "medium", detail: "Message is not cryptographically signed." });
    spoofingScore += 10;
  }

  if (authResults.dmarc === "fail") {
    signals.push({ label: "DMARC alignment failed", severity: "critical", detail: "This message fails the sending domain's DMARC policy — a strong spoofing indicator." });
    spoofingScore += 25;
  }

  if (fromReturnPathMismatch) {
    signals.push({
      label: "From / Return-Path domain mismatch",
      severity: "high",
      detail: `From domain "${fromDomain}" does not match Return-Path domain "${returnPathDomain}" — a common spoofing pattern.`,
    });
    spoofingScore += 15;
  }

  if (replyTo && from && replyTo !== from) {
    signals.push({
      label: "Reply-To differs from From address",
      severity: "medium",
      detail: `Replies will go to "${replyTo}" instead of the visible sender — common in business email compromise.`,
    });
    spoofingScore += 10;
  }

  if (receivedHops.length === 0) {
    signals.push({ label: "No Received headers found", severity: "info", detail: "Could not trace the delivery path — paste the full raw headers for a complete analysis." });
  }

  const urlShorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];
  const suspiciousUrls = urls.filter((u) => urlShorteners.some((s) => u.includes(s)));
  if (suspiciousUrls.length > 0) {
    signals.push({ label: `${suspiciousUrls.length} shortened URL(s) detected`, severity: "medium", detail: "Shortened links can hide the true destination and are frequently used in phishing." });
    spoofingScore += 10;
  }

  return {
    from,
    returnPath,
    replyTo,
    subject,
    messageId,
    receivedHops,
    authResults,
    fromReturnPathMismatch,
    urls,
    spoofingScore: Math.min(100, spoofingScore),
    signals,
  };
}
