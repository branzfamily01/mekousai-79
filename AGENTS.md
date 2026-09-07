# AGENTS.md — Mekousai

## Governance
- Astra: Chief Architect for major Cloudflare/storage/auth/reuse architecture.
- Sol: Main Operator for routine gallery/editor/UI, operational improvements, docs, Codex specs and review.
- Codex: Repository Implementer.

## Read first
- `README.md`
- `CLOUDFLARE_DEPLOY.md` when relevant
- `docs/REQUIREMENTS.md`
- `docs/MASTER_ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/PROJECT_STATE.md`

## Production invariants
- GitHub is code source of truth.
- Static Assets and photo API currently share one Worker/origin.
- R2 stores photo binaries; D1 stores photo metadata/state.
- Never commit editor/session secrets.
- Preserve EXIF/location removal in the existing image-processing path unless an approved design replaces it safely.
- Do not destabilize the historical 第79回 site while extracting reusable future-year patterns.

## Cloudflare rules
Before material Cloudflare changes, review project trap/runbook guidance and current official Cloudflare docs for relevant pricing/limits/specs.

After production changes verify affected paths: public page, editor auth, upload, D1 writes/reads, R2 upload/read, publish/unpublish, CSS/JS/images, logout/session/re-access and errors. Rendering alone is not acceptance.

## Escalation
Do not independently change same-origin topology, R2/D1 responsibility, auth/session architecture, fundamental deployment or historical/future-kit versioning model. Report to Sol for Astra escalation.

## Change control
Classify major proposals Maintain / Modify / Retire / Hold. Major changes require explicit user acceptance.

## Scope and verification
Prefer minimal diffs. Run relevant tests, inspect the complete diff, test the actual affected user flow and report anything unverified.
