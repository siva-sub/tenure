# Tenure

**Live: <https://siva-sub.github.io/tenure/>**

**The living record of a Singapore home.** A production-built web application that keeps one
property's record over time: its energy performance, the retrofit measures installed and whether
they pay back inside the lease, who is responsible for what maintenance, and live room-sensor and
CT-clamp telemetry.

Two homes are modelled — a 1986 four-room HDB flat in Tampines (Town Council, 58 years of lease
left, partly retrofitted) and a 1997 condominium apartment in Bukit Merah (MCST, 70 years left,
barely touched) — because the interesting decisions only show up when the two tenures disagree.

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # typecheck + production bundle
npm run preview       # serve dist on http://localhost:4173
npm run build:pages   # bundle for the /tenure/ subpath
npm test              # 40 domain + boundary tests
```

## Deployment

The site is deployed to **GitHub Pages** by GitHub Actions on every push to `main`
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)): install → typecheck → 40 tests → build with
`VITE_BASE=/tenure/` → deploy the artifact. Nothing is deployed if a test fails.

Two static-hosting details matter for a client-routed SPA, and both are handled:

- **Deep links** — Pages has no rewrite rules, so `scripts/postbuild.mjs` prerenders a directory shell for
  each route (`/tenure/retrofit/` answers **200**) and keeps `dist/404.html` as the shell for anything
  unmatched, so unknown paths still boot the router instead of showing a host error page.
- **Subpath assets** — `base` is driven by `VITE_BASE`, and the font and icon URLs are relative, so the same
  build works at a domain root or under a project subpath. `_redirects`/`_headers` ship too, for hosts that
  read them.

---

## Why this is not a generic property dashboard

Five decisions are specific to Singapore, and each one changes the product rather than decorating it.

### 1. There is no EPC to import, so the score is constructed and auditable

BCA Green Mark rates **buildings**, not homes, and Singapore has no per-dwelling Energy Performance
Certificate. A residential "energy band" therefore cannot be looked up — it has to be derived. Tenure
derives it from metered consumption, floor area, flat type, household size and the tropical cooling
load, and then **shows every input and its weight** instead of presenting a black-box number. The page
says so in the lede, because a fabricated certificate would be the dishonest version of this product.

### 2. The lease is the unit of account, not the engineering lifetime

A 99-year leasehold term means "what is the payback?" is the wrong question. The right one is *does the
payback land inside the lease I actually hold?* `src/domain/lease.ts` computes the lease position and
tests every measure against it:

| verdict | meaning |
| --- | --- |
| `inside-lease` | breaks even with room to spare |
| `tight` | inside, but within the last 15% of the remaining term |
| `beyond-lease` | the flat changes hands before the measure pays for itself |

A retrofit register that ignores this overstates every saving. The figures are also computed over the
shorter of the asset's service life and the remaining lease — measuring them over the payback horizon
returns exactly zero by construction, which is the trap this build originally fell into and now has a
regression test for.

### 3. Responsibility is routed, not just recorded

In an HDB estate the owner, the Town Council and HDB each own a different slice of the building. A
leaking ceiling is a different legal animal from a leaking riser. `src/domain/responsibility.ts` is a
deterministic rule engine that routes a free-text report to the correct party **and shows the basis**,
so a resident can disagree and re-route. The report form previews the routing live as you type.

### 4. The subsidy layer is the only cash incentive that exists

Climate Vouchers ($400 across 12 product types, valid to 31 December 2027) materially change payback
arithmetic, so measures carry their claim and the programme tracker records the voucher as spent. HIP
is modelled with its real constraint: it is scheduled **by precinct**, requires a 75% poll, and cannot
be applied for — the record tracks eligibility state rather than pretending it is a checkout.

### 5. Half-hourly data is a privilege, and the UI admits when it is not

AMI smart meters report half-hourly; homes without one are read once every two months with estimates
in between. The meter provenance is labelled on every consumption view (`AMI · half-hourly, metered`
versus `CT clamp · live, billing estimated`), because a consumer who cannot tell metered data from
estimated data cannot trust either.

---

## Architecture

```
src/
├── domain/                 Pure, framework-free. Every calculation is testable in isolation.
│   ├── types.ts            The vocabulary of a home record (no React, no HTTP, no storage).
│   ├── lease.ts            Lease position, payback analysis, the lease test.
│   ├── energy.ts           Banding, EUI scoring, peer percentile, mould risk, tariff windows.
│   ├── responsibility.ts    Owner / Town Council / MCST / HDB routing rules with stated basis.
│   ├── seed.ts             Two seeded properties, the measure register, 48 + 90-day telemetry.
│   ├── parity.ts           The competitor matrix (evidenced from live pages).
│   └── format.ts           en-SG money, dates, durations, tabular numbers.
├── data/api.ts             The boundary: zod validation, simulated latency, localStorage mutations.
├── app/                    Shell, providers, query hooks, routing.
├── components/             Instruments (dial, tenure clock, load ribbon, peer band), palette, sheet.
├── pages/                  Six routes.
└── styles/                 Tokens → base → shell → components → pages. No UI framework.
```

**State is split by kind.** Server-shaped data goes through TanStack Query (caching, retries,
invalidation); only the property in focus, density and lease-strictness persist locally, and those go
through a small preferences context. Toasts live in a dependency-free external store, because mutations
resolve outside the React tree and should be able to raise one without prop drilling.

**Swapping in a real backend** means replacing the `read*` functions in `src/data/api.ts` with `fetch`
calls. Nothing above that file knows the fixture exists.

## What the four instruments do

- **Score dial** — a seven-band A–G gauge with a marker riding the arc, not a needle through the number.
- **Tenure clock** — the term bar in true proportion, then a Gantt of payback horizons against the
  remaining lease, with the lease expiry drawn as a dashed wall.
- **Load ribbon** — 48 half-hourly columns with the cooling share stacked underneath, the 7pm–11pm peak
  window shaded, and a humidity strip beneath it coloured against the 70% mould threshold.
- **Peer band** — where this household sits against same-flat-type, same-town peers.

## Design direction

The brief was Anthropic's *Frontend Aesthetics* guidance: commit to one aesthetic, use distinctive
type, layer the background, orchestrate motion once rather than scattering micro-interactions, and
avoid the generic AI look. Concretely:

- **Type** — Fraunces (high optical size, wonk axis on) against Azeret Mono for data and Schibsted
  Grotesk for UI. No Inter, no system-ui, no Space Grotesk.
- **Structure** — a dark site-office rail framing a warm paper ledger. The visual metaphor is the
  lease: the mark is a term band, the stamp is the energy band, the tenure clock is the centrepiece.
- **Background** — paper grain and a surveyor's grid, both fixed and masked; contour lines only inside
  the rail. Nothing is a flat fill and nothing is a purple gradient.
- **Fonts are self-hosted** (14 woff2 files, `/fonts.css`). No third-party CDN sits in the critical
  path: the typography cannot break behind a blocked network, and no font request leaks the reader's IP
  to Google.
- **Motion** — one orchestrated entrance (staggered via a `--i` counter), rules that draw in, a needle
  that sweeps, a stamp that presses. All of it collapses under `prefers-reduced-motion`.

## Verification

| check | result |
| --- | --- |
| `tsc -b` (strict, `noUncheckedIndexedAccess`) | clean |
| `vitest run` | 40 tests passing |
| axe-core, WCAG 2.1 A + AA, five routes (local and live) | 0 serious/critical violations |
| Playwright interaction suite | 14/14 checks passing |
| Live deployment (browser, all routes + deep links) | 13/13 checks passing |
| Console errors / failed requests | none |
| Horizontal overflow, 390 / 1280 / 1440 px | none |
| Production bundle | 158 kB gzipped JS (React + router + query + zod); fonts self-hosted |
| Live site | <https://siva-sub.github.io/tenure/> — deployed by CI, deep links verified |

Reproduce with a running `npm run preview`:

```bash
node scripts/a11y.mjs      # accessibility audit
node scripts/e2e.mjs       # interaction suite
node scripts/shots.mjs     # screenshots + layout audit into ./screenshots
```

## Honest gaps

These are integration problems disguised as interface features, and the parity page scores them as gaps
rather than faking coverage:

- **Singpass / Myinfo** login, **PayNow QR** collection and **InvoiceNow** invoicing — financial and
  identity rails, not UI.
- **AGM e-voting with live quorum** — the actual bottleneck for every condo retrofit is consent.
- **AVM valuation** (SRX/99.co style) — retrofit value only materialises at resale.
- **Chinese / Malay / Tamil** localisation — a Singapore product that only speaks English excludes the
  households most likely to need maintenance help.
- **No backend.** Mutations persist to `localStorage`; there is no auth, no multi-user access control
  and no audit log. The data layer is shaped so that this is the only missing piece.
- **Fixture data.** Tariff is labelled Q4 2026 and every figure is sample data, not a real address.

## Attribution

Competitor capabilities were read from the named live pages on 15 November 2026 and are recorded in
[`docs/singapore-market-brief.md`](docs/singapore-market-brief.md) — that analysis is deliberately
internal, not a public page. The public `/programmes` page shows only what the record actually supports,
with each claim linked to its official source. Product and programme names belong to their owners;
nothing here implies affiliation.
