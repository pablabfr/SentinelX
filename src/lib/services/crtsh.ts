interface CrtShEntry {
  name_value: string;
  not_before?: string;
}

export async function lookupSubdomains(domain: string): Promise<{ subdomain: string; firstSeen?: string }[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "SentinelX-Scanner/1.0" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim()) return [];
    const entries: CrtShEntry[] = JSON.parse(text);
    const map = new Map<string, string | undefined>();
    for (const entry of entries) {
      for (const name of entry.name_value.split("\n")) {
        const clean = name.trim().toLowerCase().replace(/^\*\./, "");
        if (clean.endsWith(domain.toLowerCase()) && !map.has(clean)) {
          map.set(clean, entry.not_before);
        }
      }
    }
    return Array.from(map.entries())
      .map(([subdomain, firstSeen]) => ({ subdomain, firstSeen }))
      .sort((a, b) => a.subdomain.localeCompare(b.subdomain))
      .slice(0, 200);
  } catch {
    return [];
  }
}
