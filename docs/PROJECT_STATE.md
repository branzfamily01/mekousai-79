# Mekousai Project State

Snapshot: 2026-09-07

## Current baseline
- 第79回目高祭 site is deployed from this repository.
- Production architecture uses Cloudflare Worker/Static Assets, Worker photo API, R2 and D1.
- Mobile editor and gallery flows are established.
- Runtime has already been used in real festival operations.

## Governance work
This snapshot adds architecture/governance documents only; site code, D1, R2 and production secrets are not changed.

## Product direction
Preserve the proven site while extracting reusable patterns for a future festival-operations kit.

## Immediate next work
1. Run Astra review using `docs/ASTRA_REVIEW_PACKAGE.md`.
2. Separate reusable platform concerns from 第79回 event-specific content/configuration before building a future-year kit.
3. Continue Sol-led fixes for bulk photo operations, comments, cropping/aspect ratio and navigation behavior within the current architecture.
4. Any production change must receive end-to-end verification of affected Cloudflare/D1/R2/editor/public flows.
