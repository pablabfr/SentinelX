import { UpstreamError, ValidationError } from "@/lib/services/errors";

export interface IpGeoResult {
  ip: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  isProxy: boolean;
  isHosting: boolean;
  isMobile: boolean;
  isTor: boolean;
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/;

export function isValidIp(value: string): boolean {
  if (IPV4_RE.test(value)) {
    return value.split(".").every((octet) => Number(octet) <= 255);
  }
  return IPV6_RE.test(value);
}

export async function lookupIpGeo(ip: string): Promise<IpGeoResult> {
  if (!isValidIp(ip)) throw new ValidationError("Enter a valid IPv4 or IPv6 address.");

  // ipwho.is: free, HTTPS, no API key required.
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new UpstreamError(`IP geolocation lookup failed (${res.status})`, res.status);
  const data = await res.json();
  if (data.success === false) {
    throw new UpstreamError(data.message ?? "IP geolocation lookup failed.");
  }

  return {
    ip: data.ip ?? ip,
    country: data.country ?? null,
    countryCode: data.country_code ?? null,
    region: data.region ?? null,
    city: data.city ?? null,
    lat: data.latitude ?? null,
    lon: data.longitude ?? null,
    timezone: data.timezone?.id ?? null,
    isp: data.connection?.isp ?? null,
    org: data.connection?.org ?? null,
    asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
    isProxy: Boolean(data.security?.proxy),
    isHosting: Boolean(data.security?.hosting),
    isMobile: Boolean(data.security?.mobile),
    isTor: Boolean(data.security?.tor),
  };
}
