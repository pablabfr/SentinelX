export const API_KEY_HEADERS = {
  openai: "x-sentinelx-openai-key",
  virustotal: "x-sentinelx-virustotal-key",
  abuseipdb: "x-sentinelx-abuseipdb-key",
  shodan: "x-sentinelx-shodan-key",
  hibp: "x-sentinelx-hibp-key",
} as const;

export type ApiKeyName = keyof typeof API_KEY_HEADERS;
