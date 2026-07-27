export interface PasswordStrength {
  length: number;
  entropy: number;
  score: number; // 0-100
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  charsetSize: number;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  issues: string[];
  crackTimeDisplay: string;
}

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "letmein", "monkey", "111111",
  "iloveyou", "admin", "welcome", "password1", "123123", "1234567890", "dragon", "sunshine",
  "princess", "football", "baseball", "trustno1", "master", "shadow", "superman", "michael",
]);

export function analyzePasswordStrength(password: string): PasswordStrength {
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSymbol) charsetSize += 33;
  if (charsetSize === 0) charsetSize = 1;

  const entropy = length > 0 ? Math.round(length * Math.log2(charsetSize) * 10) / 10 : 0;

  const issues: string[] = [];
  if (length < 8) issues.push("Shorter than the recommended 8-character minimum.");
  if (length < 12) issues.push("Consider using 12+ characters for stronger protection.");
  if (!hasLower) issues.push("Add lowercase letters.");
  if (!hasUpper) issues.push("Add uppercase letters.");
  if (!hasDigit) issues.push("Add numbers.");
  if (!hasSymbol) issues.push("Add symbols for extra entropy.");
  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push("This is one of the most commonly breached passwords — never use it.");
  if (/^(.)\1+$/.test(password)) issues.push("Repeating a single character provides almost no security.");
  if (/^(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/i.test(password)) issues.push("Contains a common keyboard or sequential pattern.");

  let score = Math.min(100, Math.round((entropy / 100) * 100));
  if (COMMON_PASSWORDS.has(password.toLowerCase())) score = Math.min(score, 5);
  if (length === 0) score = 0;

  const label: PasswordStrength["label"] =
    score >= 80 ? "Very Strong" : score >= 60 ? "Strong" : score >= 35 ? "Fair" : score >= 15 ? "Weak" : "Very Weak";

  const guessesPerSecond = 10_000_000_000; // offline fast hash attack estimate
  const combinations = Math.pow(charsetSize, length);
  const seconds = combinations / guessesPerSecond / 2;
  const crackTimeDisplay = formatCrackTime(seconds);

  return { length, entropy, score, label, charsetSize, hasLower, hasUpper, hasDigit, hasSymbol, issues, crackTimeDisplay };
}

function formatCrackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return "Instantly";
  const units: [string, number][] = [
    ["century", 100 * 365.25 * 86400],
    ["year", 365.25 * 86400],
    ["month", 30 * 86400],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, unitSeconds] of units) {
    if (seconds >= unitSeconds) {
      const value = Math.round(seconds / unitSeconds);
      if (value > 1_000_000) return "Billions of years";
      return `${value.toLocaleString()} ${unit}${value !== 1 ? "s" : ""}`;
    }
  }
  return "Instantly";
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export interface BreachCheckResult {
  breached: boolean;
  timesSeen: number;
}

/**
 * Privacy-preserving breach check: only the first 5 characters of the
 * SHA-1 hash ever leave the device (k-anonymity), never the password itself.
 */
export async function checkPasswordBreached(password: string): Promise<BreachCheckResult> {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!res.ok) throw new Error(`Breach check failed (${res.status})`);

  const text = await res.text();
  const match = text
    .split("\n")
    .map((line) => line.trim().split(":"))
    .find(([suf]) => suf === suffix);

  return { breached: Boolean(match), timesSeen: match ? Number(match[1]) : 0 };
}

const AMBIGUOUS = "il1Lo0O";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

export function generatePassword(opts: {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}): string {
  let charset = "";
  if (opts.lower) charset += LOWER;
  if (opts.upper) charset += UPPER;
  if (opts.digits) charset += DIGITS;
  if (opts.symbols) charset += SYMBOLS;
  if (!charset) charset = LOWER + DIGITS;
  if (opts.excludeAmbiguous) {
    charset = charset
      .split("")
      .filter((c) => !AMBIGUOUS.includes(c))
      .join("");
  }

  const values = new Uint32Array(opts.length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}

const WORDLIST = [
  "anchor", "beacon", "canyon", "delta", "ember", "falcon", "granite", "harbor", "indigo", "jungle",
  "kernel", "lunar", "meadow", "nectar", "onyx", "prairie", "quartz", "raven", "summit", "tundra",
  "umbra", "velvet", "willow", "xenon", "yonder", "zephyr", "amber", "boulder", "cascade", "drift",
  "echo", "flint", "glacier", "horizon", "ivory", "jasper", "knoll", "lagoon", "mirage", "nebula",
  "orbit", "pinnacle", "quasar", "ridge", "sable", "thicket", "unity", "vertex", "wisp", "zenith",
];

export function generatePassphrase(wordCount = 5, separator = "-", capitalize = true): string {
  const values = new Uint32Array(wordCount);
  crypto.getRandomValues(values);
  const words = Array.from(values, (v) => {
    const w = WORDLIST[v % WORDLIST.length];
    return capitalize ? w[0].toUpperCase() + w.slice(1) : w;
  });
  const numberSuffix = crypto.getRandomValues(new Uint32Array(1))[0] % 900 + 100;
  return `${words.join(separator)}${separator}${numberSuffix}`;
}
