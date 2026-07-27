import { UpstreamError } from "@/lib/services/errors";

export async function getPublicIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new UpstreamError("Could not determine public IP address.");
  const data = await res.json();
  return data.ip;
}

export interface LatencyTarget {
  name: string;
  url: string;
  latencyMs: number | null;
  ok: boolean;
}

const LATENCY_TARGETS = [
  { name: "Cloudflare", url: "https://1.1.1.1" },
  { name: "Google", url: "https://www.google.com/generate_204" },
  { name: "AWS (us-east-1)", url: "https://dynamodb.us-east-1.amazonaws.com" },
  { name: "NVD (US-Gov)", url: "https://services.nvd.nist.gov" },
];

export async function measureLatency(): Promise<LatencyTarget[]> {
  return Promise.all(
    LATENCY_TARGETS.map(async (target) => {
      const start = performance.now();
      try {
        await fetch(target.url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        return { name: target.name, url: target.url, latencyMs: Math.round(performance.now() - start), ok: true };
      } catch {
        return { name: target.name, url: target.url, latencyMs: null, ok: false };
      }
    })
  );
}
