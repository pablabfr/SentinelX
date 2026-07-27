import dns from "node:dns/promises";
import type { SoaRecord } from "node:dns";

export interface DnsRecords {
  a: string[];
  aaaa: string[];
  mx: { priority: number; exchange: string }[];
  txt: string[][];
  ns: string[];
  cname: string[];
  soa: SoaRecord | null;
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function lookupDnsRecords(domain: string): Promise<DnsRecords> {
  const [a, aaaa, mx, txt, ns, cname, soa] = await Promise.all([
    safe(dns.resolve4(domain), []),
    safe(dns.resolve6(domain), []),
    safe(dns.resolveMx(domain), []),
    safe(dns.resolveTxt(domain), []),
    safe(dns.resolveNs(domain), []),
    safe(dns.resolveCname(domain), []),
    safe(dns.resolveSoa(domain), null),
  ]);

  return {
    a,
    aaaa,
    mx: mx.sort((x, y) => x.priority - y.priority),
    txt,
    ns,
    cname,
    soa,
  };
}

export async function reverseDns(ip: string): Promise<string[]> {
  return safe(dns.reverse(ip), []);
}

export async function resolveTxtFlat(domain: string): Promise<string[]> {
  const records = await safe(dns.resolveTxt(domain), []);
  return records.map((chunks) => chunks.join(""));
}
