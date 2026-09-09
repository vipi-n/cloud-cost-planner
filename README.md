# CloudScope

CloudScope is a guided cloud-cost planner. Beginners choose what they are
building and adjust understandable usage inputs; experienced users can enter
compute, memory, request, storage, network, database, GPU, and availability
requirements directly.

## Live website

[Open CloudScope](https://cloud-cost-planner.vercel.app/)

The calculator currently compares normalized planning estimates for:

- Amazon Web Services
- Microsoft Azure
- Google Cloud
- Cloudflare
- DigitalOcean
- Vercel
- Railway
- Render
- Fly.io
- Hetzner Cloud

It supports ten country and display-currency profiles. Country selects a nearby
deployment geography; provider region determines infrastructure pricing, while
the dated FX snapshot controls only currency display.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Verification

```bash
npm run lint
npm run build
```

## Pricing architecture

`src/lib/catalog.ts` is a versioned, reviewed catalog of normalized public list
prices and source links. `src/lib/estimator.ts` converts workload inputs into
shared billing units and returns itemized estimates.

The production ingestion design is hybrid:

1. Ingest AWS Price List Bulk, Azure Retail Prices, Google Cloud Billing
   Catalog, DigitalOcean Sizes, and Hetzner Pricing APIs daily.
2. Review versioned official-page snapshots for Vercel, Railway, Render,
   Fly.io, and Cloudflare product pricing weekly; their management/billing APIs
   do not expose complete public SKU catalogs.
3. Validate units, tiers, regions, and unexpected price changes before
   publishing a catalog version.
4. Preserve old catalog versions so saved estimates remain reproducible.
5. Use decimal arithmetic in a server-side production pricing pipeline. The
   current browser calculator uses JavaScript numbers and rounded planning
   outputs, so it must not be presented as an invoice.

## Important limitations

- Estimates use normalized rates, not every regional provider SKU.
- Taxes, support plans, negotiated discounts, commitments, logs, load
  balancers, NAT gateways, retries, and provider-specific extras may be absent.
- FX values are dated reference values, not live settlement rates.
- Users should verify a shortlisted configuration with the provider calculator
  before purchasing.

No cloud credentials are required for the current catalog. Future ingestion
credentials must be stored in deployment secret management and must never be
committed to the repository.
