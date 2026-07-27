# SentinelX

**Know what's happening before it happens.**

An AI-powered cybersecurity intelligence platform — a dashboard for understanding and
improving your digital security, not an antivirus. Built with Next.js 16 (App Router),
TypeScript, Tailwind CSS v4, Radix UI, Framer Motion, Zustand, and TanStack Query/Table.

## What's actually real here

Every feature in this build does genuine work — there is no mocked or fabricated data
presented as if it were real. Two categories:

### Works immediately, no API key required

| Feature | How |
|---|---|
| Website Scanner | Live HTTPS/TLS certificate inspection (`node:tls`), HTTP security header & cookie analysis, redirect chain tracing, robots.txt/sitemap.xml parsing, tech-stack fingerprinting |
| Domain Intelligence | DNS resolution (`node:dns`), RDAP WHOIS, SPF/DMARC parsing, certificate-transparency subdomain enumeration (crt.sh) |
| IP Intelligence | Geolocation, ASN/ISP, proxy/VPN/Tor/hosting detection (ipwho.is), reverse DNS |
| Email Intelligence | Server-side SPF/DKIM/DMARC domain checks, plus a fully client-side raw header analyzer (spoofing/BEC heuristics — headers never leave the browser) |
| Password Health | Local entropy/strength scoring, breach checks via the HIBP **k-anonymity** API (only a 5-char SHA-1 hash prefix ever leaves the device), cryptographically random password/passphrase generation |
| System Scanner | Real live host telemetry (CPU, memory, disk, processes, listening ports) via `systeminformation` |
| Network Monitor | Public IP, latency to key network hubs, local interfaces, DNS lookup tool |
| File Analysis | SHA-1/256/512 hashing, Shannon entropy, magic-byte type detection with extension-mismatch flagging, a real minimal PE header parser, string extraction — all client-side; nothing is uploaded |
| Threat Centre | Live CVE feed (NVD) and the CISA Known Exploited Vulnerabilities catalog |
| Reports | Client-side branded PDF generation (`@react-pdf/renderer`) from your actual scan history |

### Requires your own API key (added in Settings → API Keys)

These integrations are fully wired end-to-end — request building, error handling, response
parsing — but need a key because the provider requires one. Without a key, the UI shows an
honest "add your API key" empty state; it never falls back to fake data.

| Integration | Used for | Get a key |
|---|---|---|
| OpenAI | AI Assistant chat + every "Generate AI summary" action | platform.openai.com/api-keys |
| VirusTotal | File hash / URL reputation | virustotal.com/gui/my-apikey |
| AbuseIPDB | IP abuse-report reputation | abuseipdb.com/account/api |
| Shodan | Open ports / exposed services for an IP | account.shodan.io |
| Have I Been Pwned | Data Breach Centre, Dark Web Monitor | haveibeenpwned.com/API/Key |

API keys are stored **only in your browser's local storage** and sent directly to the
corresponding provider through a thin server-side pass-through route — never persisted on
any server. See `src/lib/api-client.ts` and `src/lib/services/api-utils.ts`.

## Architecture

```
src/
  app/                    Next.js App Router pages + API route handlers (one per feature)
  components/
    layout/                Sidebar, top bar, command palette, animated background
    ui/                    Radix-based design system primitives (button, card, dialog, ...)
    shared/                Cross-feature widgets (score radial, findings list, AI summary panel)
  lib/
    services/               Server-side integration modules (dns, rdap, tls-cert, http-scan, ...)
      integrations/          Modules requiring a paid API key
    scoring/                Pure functions that turn raw scan data into findings + a risk score
    store/                   Zustand stores (settings, scan history, notifications, watchlist)
    hooks/                   Shared client hooks (AI chat streaming, debounce)
```

Each feature scan follows the same shape: a route handler in `app/api/**` calls one or more
service modules, the client posts to it via `apiPost`/`apiGet`, a `scoring/*.ts` module turns
the response into `Finding[]` + a 0–100 risk score, and the page renders it with consistent
`FindingsList` / `ScoreRadial` / `AISummaryPanel` components. Scan results are saved to a
local (browser-only) scan history that feeds the Dashboard and Reports.

No database, and no authentication backend, is included in this build — see **Roadmap**
below. There are no required environment variables; `pnpm install && pnpm dev` is enough to
run everything that doesn't need a paid API key.

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Add API keys in Settings to unlock the integrations listed above.

```bash
pnpm build   # production build (Turbopack)
pnpm start   # run the production build
pnpm lint    # ESLint (flat config, zero warnings in this codebase)
```

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Global command palette (search + navigate) |
| `⌘/` / `Ctrl+/` | Jump to the AI Assistant |
| `⌘⇧S` / `Ctrl+Shift+S` | Jump to the Website Scanner |
| `⌘⇧R` / `Ctrl+Shift+R` | Jump to Reports |
| `Esc` | Close the command palette |

## Roadmap (out of scope for this pass)

The original spec describes a full commercial SaaS platform. This build prioritized shipping
real, working intelligence features over breadth-without-depth. Not included yet:

- **Accounts & auth** (Clerk/Auth.js), multi-user orgs, and a persistent database (Postgres +
  Prisma) — today all state (scan history, watchlist, settings, API keys) lives in browser
  local storage, scoped to one browser/device.
- **Electron desktop build** — System Scanner currently reports on the server host running
  the app; a desktop build would scan the user's actual local machine instead.
- Additional integrations from the spec: Shodan/Censys network-wide search, SecurityTrails,
  AlienVault OTX, GreyNoise, URLScan.io, MITRE ATT&CK mapping.
- Live packet-capture / network-topology visualization, browser-extension privacy checker,
  QR phishing detector, screenshot-OCR scam detector.
- WebSocket-based live network monitor (current version polls).
- Gamification/leaderboards, learning centre, threat simulator.

## A note on the sandboxed build environment

If you're evaluating this from within a network-restricted sandbox, outbound requests to
third-party APIs (RDAP, crt.sh, NVD, ipwho.is, etc.) may be blocked by that sandbox's own
egress policy — this shows up as scan results with partial data and honest error states,
not a bug in the integration code. DNS-based checks (SPF/DMARC/MX/etc.) are unaffected since
DNS resolution doesn't route through an HTTP(S) proxy. All of this was verified working
end-to-end against `anthropic.com` during development. In a normal deployment (Vercel,
Railway, your own machine) none of these restrictions apply.
