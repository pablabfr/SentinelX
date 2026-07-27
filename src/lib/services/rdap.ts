import { UpstreamError } from "@/lib/services/errors";

export interface RdapEvent {
  action: string;
  date: string;
}

export interface RdapResult {
  handle?: string;
  ldhName?: string;
  status: string[];
  events: RdapEvent[];
  registrar?: string;
  abuseEmail?: string;
  nameservers: string[];
  raw: unknown;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, unknown[]];
}

function extractRegistrar(entities: RdapEntity[] | undefined): string | undefined {
  if (!entities) return undefined;
  const registrar = entities.find((e) => e.roles?.includes("registrar"));
  const vcard = registrar?.vcardArray?.[1] as unknown[] | undefined;
  if (!vcard) return undefined;
  const fnEntry = vcard.find((entry) => Array.isArray(entry) && entry[0] === "fn") as
    | [string, unknown, string, string]
    | undefined;
  return fnEntry?.[3];
}

function extractAbuseEmail(entities: RdapEntity[] | undefined): string | undefined {
  if (!entities) return undefined;
  for (const entity of entities) {
    if (entity.roles?.includes("abuse")) {
      const vcard = entity.vcardArray?.[1] as unknown[] | undefined;
      const emailEntry = vcard?.find((entry) => Array.isArray(entry) && entry[0] === "email") as
        | [string, unknown, string, string]
        | undefined;
      if (emailEntry?.[3]) return emailEntry[3];
    }
  }
  return undefined;
}

async function fetchRdap(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/rdap+json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) {
    throw new UpstreamError("No RDAP record found for this target.", 404);
  }
  if (!res.ok) {
    throw new UpstreamError(`RDAP lookup failed (${res.status})`, res.status);
  }
  return res.json();
}

export async function lookupDomainRdap(domain: string): Promise<RdapResult> {
  const data = (await fetchRdap(`https://rdap.org/domain/${encodeURIComponent(domain)}`)) as {
    handle?: string;
    ldhName?: string;
    status?: string[];
    events?: RdapEvent[];
    entities?: RdapEntity[];
    nameservers?: { ldhName?: string }[];
  };

  return {
    handle: data.handle,
    ldhName: data.ldhName,
    status: data.status ?? [],
    events: data.events ?? [],
    registrar: extractRegistrar(data.entities),
    abuseEmail: extractAbuseEmail(data.entities),
    nameservers: (data.nameservers ?? []).map((ns) => ns.ldhName).filter((v): v is string => Boolean(v)),
    raw: data,
  };
}

export async function lookupIpRdap(ip: string): Promise<unknown> {
  return fetchRdap(`https://rdap.org/ip/${encodeURIComponent(ip)}`);
}
