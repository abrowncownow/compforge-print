# CompForge Print

CompForge Print is a print-first Teamfight Tactics reference site. Pick one or more curated build sheets, choose Letter or A4, and print them or save the packet as a PDF. A separate landscape sheet contains the complete 8×8 item recipe matrix.

The current release is an honest Set 18 PBE preview: official trait information is available, but the public PBE data snapshot currently exposes only two translated playable units. Build sheets are labeled editorial drafts and make no live-tier or win-rate claim.

## Local development

```powershell
pnpm install
pnpm run sync:data
pnpm test
pnpm run build
pnpm run dev
```

The snapshot sync checks the mutable PBE endpoint against the reviewed SHA-256 lock in `scripts/source-lock.json`, then writes normalized JSON, local assets, asset hashes, and dashboard-readable status to `public/`. It fails closed if the source hash changes, the PBE set is missing, a non-canonical item wins a recipe slot, the eight core components or 36 recipes do not validate, or an asset download fails. Review the upstream change before deliberately updating the source lock.

## Architecture

- `src/data/builds.ts` — curated, source-linked editorial build packets.
- `scripts/sync-tft-data.mjs` — pinned normalization and asset pipeline.
- `public/data/` — generated snapshot and provenance manifest.
- `public/status.json` — small status contract for the AI Capital Lab dashboard.
- `.github/workflows/deploy-pages.yml` — test/build on every push; Pages deploy is gated by repository variables `RIOT_PRODUCT_REGISTERED=true` and `PRINT_QA_APPROVED=true`.

No account, overlay, live-game instructions, player data, API key, or monetization is included. Register the public product with Riot before launch and obtain the required status before enabling any monetization.

See [docs/research-and-launch.md](docs/research-and-launch.md) for the researched Set 18 data state and release gates.

## Rights and notices

The project code is MIT licensed. Riot-owned artwork and game data are not covered by the code license; see [ASSET-NOTICE.md](ASSET-NOTICE.md).
