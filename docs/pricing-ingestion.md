# Pricing ingestion design

Cloud provider prices cannot be maintained reliably through a single universal
API. The production pipeline uses provider adapters and immutable raw
snapshots.

## Adapter strategy

- Daily official API imports: AWS Price List Bulk API, Azure Retail Prices API,
  Google Cloud Billing Catalog API, DigitalOcean Sizes API, and Hetzner Cloud
  Pricing API.
- Weekly official-document imports: Cloudflare product pricing, Vercel regional
  pricing, Railway pricing, Render pricing and compute plans, and Fly.io
  resource pricing.
- Store the raw response or document before normalization.
- Diff every snapshot and quarantine implausible price, currency, unit, tier,
  region, or schema changes for review.

## Normalized entities

Keep SKUs, offers, and price tiers separate. A normalized record should retain:

- Provider, service, provider SKU/meter ID, source URL and source version
- Observation time, effective period, and raw snapshot hash
- Category, resource family, plan, purchase option, and commitment term
- Region, zone, CPU architecture/class, vCPU, RAM, GPU, and storage attributes
- Decimal currency amount, original billing unit, increment, minimum charge,
  tier boundaries, included quantity, and monthly cap
- Tax status, operating system/license, tenancy, network direction, and
  provider-specific attributes

Never flatten tiered pricing or discard the provider's original billing unit.
Estimate calculations should use decimal arithmetic server-side and preserve
the exact catalog version used.

## Provider caveats

- AWS public catalogs omit Spot prices and require careful term/dimension
  handling.
- Azure's public retail API is paginated and does not include negotiated rates.
- GCP monetary amounts use units plus nanos and have aggregation rules.
- DigitalOcean's monthly Droplet amount is a cap, not `hourly × 730`.
- Hetzner prices may be project-currency and VAT specific.
- Railway subscription fees act as included usage credit in relevant plans.
- Vercel has regional CPU/memory prices plus many independent allowances.
- Fly.io pricing includes per-second resources, region multipliers, and
  stopped-machine fees.

Any required provider token must be server-only, read-only where possible, and
stored in managed secret storage. It must never appear in browser bundles,
catalog snapshots, logs, or source control.
