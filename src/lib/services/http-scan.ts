import { UpstreamError } from "@/lib/services/errors";

export interface RedirectHop {
  url: string;
  status: number;
}

export interface SecurityHeaderCheck {
  name: string;
  present: boolean;
  value?: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  recommendation: string;
}

export interface CookieInfo {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  raw: string;
}

export interface TechSignal {
  name: string;
  category: string;
  evidence: string;
}

export interface HttpScanResult {
  finalUrl: string;
  status: number;
  https: boolean;
  redirectChain: RedirectHop[];
  headers: Record<string, string>;
  securityHeaders: SecurityHeaderCheck[];
  cookies: CookieInfo[];
  technologies: TechSignal[];
  robotsTxt: { found: boolean; content?: string; disallowCount: number };
  sitemapXml: { found: boolean; urlCount: number };
  title: string | null;
  server: string | null;
}

const SECURITY_HEADER_SPECS: {
  header: string;
  severityIfMissing: SecurityHeaderCheck["severity"];
  recommendation: string;
}[] = [
  {
    header: "strict-transport-security",
    severityIfMissing: "high",
    recommendation: "Add Strict-Transport-Security to force HTTPS and prevent downgrade/SSL-stripping attacks.",
  },
  {
    header: "content-security-policy",
    severityIfMissing: "high",
    recommendation: "Add a Content-Security-Policy to mitigate XSS and data-injection attacks.",
  },
  {
    header: "x-frame-options",
    severityIfMissing: "medium",
    recommendation: "Add X-Frame-Options (or frame-ancestors in CSP) to prevent clickjacking.",
  },
  {
    header: "x-content-type-options",
    severityIfMissing: "medium",
    recommendation: "Add X-Content-Type-Options: nosniff to stop MIME-sniffing attacks.",
  },
  {
    header: "referrer-policy",
    severityIfMissing: "low",
    recommendation: "Add a Referrer-Policy to control how much referrer information is leaked.",
  },
  {
    header: "permissions-policy",
    severityIfMissing: "low",
    recommendation: "Add a Permissions-Policy to restrict access to sensitive browser APIs.",
  },
];

function parseSetCookies(headers: Headers): CookieInfo[] {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  return raw.map((cookieStr) => {
    const [pair, ...attrs] = cookieStr.split(";").map((s) => s.trim());
    const name = pair.split("=")[0];
    const lower = attrs.map((a) => a.toLowerCase());
    const sameSiteAttr = attrs.find((a) => a.toLowerCase().startsWith("samesite"));
    return {
      name,
      secure: lower.includes("secure"),
      httpOnly: lower.includes("httponly"),
      sameSite: sameSiteAttr ? sameSiteAttr.split("=")[1] ?? "Lax" : null,
      raw: cookieStr,
    };
  });
}

function detectTechnologies(headers: Record<string, string>, html: string): TechSignal[] {
  const signals: TechSignal[] = [];
  const server = headers["server"];
  if (server) signals.push({ name: server, category: "Web Server", evidence: `Server header: ${server}` });
  const poweredBy = headers["x-powered-by"];
  if (poweredBy) signals.push({ name: poweredBy, category: "Framework", evidence: `X-Powered-By header` });

  const patterns: { test: RegExp; name: string; category: string }[] = [
    { test: /wp-content|wp-includes/i, name: "WordPress", category: "CMS" },
    { test: /cdn\.shopify\.com|Shopify/i, name: "Shopify", category: "E-commerce" },
    { test: /_next\/static/i, name: "Next.js", category: "Framework" },
    { test: /__NUXT__/i, name: "Nuxt.js", category: "Framework" },
    { test: /data-reactroot|react-dom/i, name: "React", category: "Framework" },
    { test: /ng-version/i, name: "Angular", category: "Framework" },
    { test: /cf-ray|cloudflare/i, name: "Cloudflare", category: "CDN/Security" },
    { test: /vercel/i, name: "Vercel", category: "Hosting" },
    { test: /google-analytics\.com|gtag\(/i, name: "Google Analytics", category: "Analytics" },
    { test: /googletagmanager\.com/i, name: "Google Tag Manager", category: "Analytics" },
    { test: /jquery/i, name: "jQuery", category: "JS Library" },
    { test: /bootstrap/i, name: "Bootstrap", category: "CSS Framework" },
    { test: /tailwind/i, name: "Tailwind CSS", category: "CSS Framework" },
    { test: /drupal/i, name: "Drupal", category: "CMS" },
    { test: /joomla/i, name: "Joomla", category: "CMS" },
    { test: /webflow/i, name: "Webflow", category: "CMS" },
    { test: /wix\.com|_wixCIDX/i, name: "Wix", category: "CMS" },
  ];

  for (const p of patterns) {
    if (p.test.test(html)) {
      signals.push({ name: p.name, category: p.category, evidence: "Detected in page markup" });
    }
  }

  const generatorMatch = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
  if (generatorMatch) {
    signals.push({ name: generatorMatch[1], category: "CMS", evidence: "meta generator tag" });
  }

  const seen = new Set<string>();
  return signals.filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)));
}

async function followRedirects(inputUrl: string, maxHops = 10): Promise<{ res: Response; chain: RedirectHop[] }> {
  let current = inputUrl;
  const chain: RedirectHop[] = [];
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "SentinelX-Scanner/1.0 (+https://sentinelx.security)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      chain.push({ url: current, status: res.status });
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    chain.push({ url: current, status: res.status });
    return { res, chain };
  }
  throw new UpstreamError("Too many redirects (possible redirect loop).");
}

export async function scanWebsite(inputUrl: string): Promise<HttpScanResult> {
  let normalized = inputUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

  let finalRes: Response;
  let chain: RedirectHop[];
  try {
    ({ res: finalRes, chain } = await followRedirects(normalized));
  } catch (err) {
    throw new UpstreamError(err instanceof Error ? `Could not reach target: ${err.message}` : "Could not reach target.");
  }

  const html = await finalRes.text().catch(() => "");
  const headers: Record<string, string> = {};
  finalRes.headers.forEach((value, key) => (headers[key.toLowerCase()] = value));

  const securityHeaders: SecurityHeaderCheck[] = SECURITY_HEADER_SPECS.map((spec) => ({
    name: spec.header,
    present: Boolean(headers[spec.header]),
    value: headers[spec.header],
    severity: headers[spec.header] ? "info" : spec.severityIfMissing,
    recommendation: spec.recommendation,
  }));

  const finalUrl = finalRes.url || normalized;
  const origin = new URL(finalUrl).origin;

  const [robotsRes, sitemapRes] = await Promise.allSettled([
    fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(6000) }),
    fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(6000) }),
  ]);

  let robotsTxt: HttpScanResult["robotsTxt"] = { found: false, disallowCount: 0 };
  if (robotsRes.status === "fulfilled" && robotsRes.value.ok) {
    const text = await robotsRes.value.text();
    robotsTxt = {
      found: true,
      content: text.slice(0, 4000),
      disallowCount: (text.match(/disallow:/gi) ?? []).length,
    };
  }

  let sitemapXml: HttpScanResult["sitemapXml"] = { found: false, urlCount: 0 };
  if (sitemapRes.status === "fulfilled" && sitemapRes.value.ok) {
    const text = await sitemapRes.value.text();
    sitemapXml = { found: true, urlCount: (text.match(/<loc>/gi) ?? []).length };
  }

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    finalUrl,
    status: finalRes.status,
    https: finalUrl.startsWith("https://"),
    redirectChain: chain,
    headers,
    securityHeaders,
    cookies: parseSetCookies(finalRes.headers),
    technologies: detectTechnologies(headers, html),
    robotsTxt,
    sitemapXml,
    title: titleMatch ? titleMatch[1].trim().slice(0, 200) : null,
    server: headers["server"] ?? null,
  };
}
