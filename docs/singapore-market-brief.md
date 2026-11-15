# Singapore market brief

Prepared for the build of **Tenure**, a living record for a Singapore home. Every capability below was
read from the named source's own live page on **15 November 2026** — not recalled. Where a site blocked
the reader, it is listed as unsurveyed rather than guessed at.

---

## 1. The structural gap this product fills

That leads the whole design: BCA Green Mark certifies **buildings** ("new and existing buildings"),
assessed via CorpPass, taking 4–6 months and valid for 3 years. There is no per-dwelling EPC, and no
government page states one exists — that absence is an inference from Green Mark's scope, and the app
phrases it that way: *"Singapore has no Energy Performance Certificate for a flat, so this band is
constructed rather than imported."*

The only product-level energy signal a household sees today is the NEA tick label, surfaced through the
Climate Vouchers eligible-product tiers. A home "record" therefore has to synthesise the band from
metered data, floor area, flat type, household size and climate — and show its working.

**Metering reality.** Advanced meters record at **half-hourly intervals**; cumulative meters are read
**once every two months**, with estimates in between ([OEM metering](http://www.openelectricitymarket.sg/residential/metering-options)).
This dual reality is the single most important data-quality constraint in the product, so meter
provenance is labelled on every consumption view.

**Tariff vintage.** The regulated tariff for Q4 2026 is **31.16¢/kWh including GST** (28.59¢ without),
revised **quarterly**; town gas 23.38¢/kWh; water $1.56/$1.97 per m³ ([SP tariff](https://www.spgroup.com.sg/our-services/utilities/tariff-information)).
Every payback figure in the app states the vintage it was computed at.

---

## 2. Programmes a retrofit tracker must support

| Programme | What it actually covers | Eligibility as published |
| --- | --- | --- |
| **Climate Vouchers (CFHP)** | $300 (from 15 Apr 2024) + $100 (from 15 Apr 2025) = **$400**, across **12 eligible product types**, spendable at participating retailers | All HDB households plus Singapore Citizen private households; one set per registered address; **valid to 31 Dec 2027** ([CFHP](https://www.climate-friendly-households.gov.sg/about/)) |
| **HDB Home Improvement Programme (HIP)** | Essential items (spalling concrete, structural cracks, pipe sockets) fully funded; optional package (toilets, door/grille, refuse hopper) co-paid | Flats around **30 years** old, second round at 60–70 years; scheduled **by precinct**; requires a **75% poll**; co-payment **$599.50–$1,498.75** by flat type ([gov.sg](https://www.gov.sg/explainers/5-things-you-should-know-if-your-home-is-undergoing-hip/)) |
| **EASE 2.0** | Grab bars, foldable shower seats, rocker switches | Senior households in HIP precincts |
| **SolarNova** | Block-roof solar leasing powering **common services** | Blocks and precincts — **not individual flats**; there is no residential export tariff |
| **HDB Green Towns Programme** | Town-scale energy, cooling and rainwater measures | Whole blocks and towns, not individual flats |
| **PUB water / City Energy gas** | Billed through SP at the potable water rate and 23.38¢/kWh respectively | All connected households |

**Consequence for the build:** a flat owner cannot buy rooftop PV, cannot apply for HIP directly, and
cannot claim a second voucher set at the same address. All three are modelled as *states* rather than
buttons — the record tells you where you stand instead of offering a checkout that cannot exist.

---

## 3. Competitor parity — what a resident can already get

Coverage is Tenure's honest position: `shipped` / `partial` / `planned` / `gap`. Weighted coverage is
**48%** (partial counts half); 12 of 30 capabilities ship.

### Utility insight

| Named product | Capability as published | Coverage |
| --- | --- | --- |
| **SP app — Consumption Insights** | "Check meter readings by day, month or year"; "submit meter readings for accurate billing" | Shipped / planned |
| **SP app** | "My Carbon Footprint"; "Green Goals… in line with SG Green Plan 2030" | Shipped / partial |
| **SP app** | Bill payment; EV charging network with ChargeUP rewards | Gap (deliberately out of scope) |
| **Open Electricity Market** | Half-hourly intervals on advanced meters; load profile view | Shipped |

### Municipal reporting

| Named product | Capability as published | Coverage |
| --- | --- | --- |
| **OneService** | "Submit Case" with up to **3 photos**; Singpass login | Shipped / planned |
| **OneService** | Status vocabulary: **Acknowledged · Working on it · Resolved · Reply from Agency · Reply from Town Council** | Shipped (used verbatim) |
| **OneService** | Chatbot in **English, Chinese, Malay or Tamil**; BBQ pit and void deck booking; HDB lift-fault updates | Gap / gap / partial |

Borrowing OneService's status vocabulary verbatim is the cheapest trust win available: residents already
know what those words mean, so the timeline needs no explanation.

### Strata management

| Named product | Capability as published | Coverage |
| --- | --- | --- |
| **myCondo** | `mySupplier` contractor and warranty-expiry tracking; `myFeedback`/`myReport` defect reporting | Shipped |
| **myCondo** | `myAircon` servicing booking; `myVisitor`, `myVehicle`, `myFacility`; PayNow/PayPal/HitPay | Partial / gap |
| **Qornerstone (Qommunity Plus)** | AGM e-voting with **live quorum and instant tally**; QuickPay auto-receipting with PayNow QR; InvoiceNow (IMDA-certified, IRAS-compliant); BSM Act compliance; sinking-fund planning | Gap / gap / gap / gap / partial |

### Valuation

| Named product | Capability as published | Coverage |
| --- | --- | --- |
| **99.co** | "99 Property Value" and **X-Value™ powered by SRX** | Gap |
| **99.co** | Calculators for eligibility, stamp duty, TDSR, MSR, affordability, mortgage, progressive payments | Gap |

### Statutory context

| Source | Capability | Coverage |
| --- | --- | --- |
| **HDB** | "As a flat owner, you are responsible for the upkeep and maintenance of your flat. For leaks from common property, contact your Town Council"; neighbours "may have to engage a contractor together" | Shipped — the seepage workflow |
| **CFHP** | $400 vouchers, 12 types, to 31 Dec 2027 | Shipped |
| **BCA Green Mark** | Building-level rating only | Partial — the absence is stated, not faked |

### Unsurveyed — and therefore absent

`propertyguru.com.sg` returned a Cloudflare challenge; `hdb.gov.sg/flat-portal` returned 403;
`ohmyhome.com/sg` redirected to a blog post; `sendhelper.com` now redirects to PropertyGuru. Their feature
sets are **not** in the matrix. A missing row is more honest than an invented one — and the parity page
says exactly that.

---

## 4. Tenure and the responsibility split

- **HDB**: 99-year leasehold. Remaining lease feeds CPF and loan limits, which is why every retrofit
  decision is tested against remaining term, not engineering life.
- **Town Council**: common property, external walls, roof (top floor), lifts, conservancy. Inter-floor
  leaks are a matter for the two owners; HDB handles roughly 350 leak cases a month nationally.
- **HDB**: structural repairs, HIP, EASE, goodwill repair assistance, renovation permits.
- **MCST**: common property apportioned by **share value**, funded through management and **sinking**
  funds, governed by AGM resolutions under the BSM Act.
- **Owner**: everything inside the lot boundary — and joint liability with the flat above for ceiling
  seepage. This is the highest-friction workflow in Singapore housing and the one worth owning.

---

## 5. Terminology used in the interface

| Term | Meaning | Where it appears |
| --- | --- | --- |
| Blk / `#unit` / postal code | Address format | Record header |
| HDB / resale / MOP | Public flat; secondhand purchase; minimum occupation period | Record identity |
| Household shelter | The reinforced "bomb shelter" — HDB's own term | Sensor map |
| Void deck | Ground-floor open common space | Responsibility matrix |
| Town council / conservancy | Estate manager; the upkeep charge | Rail footer, maintenance |
| MCST / subsidiary proprietor | Strata corporation; the lot owner | Condo record |
| Share value / sinking fund | Levy apportionment basis; long-term repair fund | Condo identity |
| Service yard / AC ledge | Utility balcony; condenser platform | Room notes |
| AMI | Advanced metering infrastructure (half-hourly) | Meter badge |
| EPC | Energy Performance Certificate — **does not exist for Singapore homes** | Stated explicitly |

---

## 6. Climate context that drives the analytics

Two monsoons: **Northeast, December to early March** (wet — rain ingress at windows and the AC ledge) and
**Southwest, June to September** (drier, with haze episodes that shut windows and load the AC). Roughly
**171 rain days** and **2,113 mm** a year; **31–33 °C** days, **23–25 °C** nights, relative humidity
averaging **around 82%** ([MSS](https://www.weather.gov.sg/climate-climate-of-singapore/)).

There is no heating season, so the entire thermal problem is removing heat and water vapour. That is why
the telemetry page tracks relative humidity as seriously as temperature, reports hours above the **70%
mould threshold** per room, and treats the household shelter — a concrete box with no through-draught —
as the room most likely to grow mould first.

---

## 7. What was built, and what was deliberately not

**Built:** the constructed energy band with visible weights; the lease test and payback Gantt; the
measure register with subsidy claims and warranty expiry; the routing engine and case board with
OneService's vocabulary; the 48-interval load ribbon with humidity strip; the competitor parity ledger
with citations.

**Not built, and scored as gaps:** Singpass identity, PayNow collection, InvoiceNow invoicing, AGM
e-voting with quorum, and AVM valuation. Each is a financial, identity or consent integration rather
than an interface, and shipping a convincing-looking fake of any of them would be worse than shipping
nothing. The parity page states this in the product's own words.

---

## Sources

[BCA Green Mark](https://www1.bca.gov.sg/sustainability/greenmark/) ·
[SP app](https://www.spdigital.sg/spapp) ·
[SP Consumption Insights](https://www.spdigital.sg/spapp/consumption-insight) ·
[SP tariff](https://www.spgroup.com.sg/our-services/utilities/tariff-information) ·
[OEM metering](http://www.openelectricitymarket.sg/residential/metering-options) ·
[OneService](https://www.oneservice.gov.sg/) ·
[OneService FAQ](https://www.oneservice.gov.sg/osapp-faq/) ·
[OneService app and chatbot](https://www.oneservice.gov.sg/oneservice/oneservice-app-and-chatbot/) ·
[Climate Vouchers](https://www.climate-friendly-households.gov.sg/about/) ·
[HIP explainer](https://www.gov.sg/explainers/5-things-you-should-know-if-your-home-is-undergoing-hip/) ·
[HDB ceiling leaks](https://www.hdb.gov.sg/managing-my-home/renovation-and-maintenance/home-maintenance/home-care-guide/ceiling-leaks) ·
[myCondo](https://mycondo.sg/) ·
[Qornerstone](https://qornerstone.com/) ·
[99.co](https://www.99.co/) ·
[Meteorological Service Singapore](https://www.weather.gov.sg/climate-climate-of-singapore/)
