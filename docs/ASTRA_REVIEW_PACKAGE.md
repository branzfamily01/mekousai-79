# ASTRA REVIEW PACKAGE — Mekousai

## Mode
ASTRA ARCHITECTURE REVIEW

## Current production design
- GitHub source of truth.
- Cloudflare Worker/Static Assets + same-origin photo API.
- R2 for photo binaries; D1 for photo metadata/state.
- Mobile editor surface.
- Secrets only in Cloudflare.
- Existing site has real event-production history.

## Goal
Preserve the proven 第79回 site while designing a reusable future festival-operations kit with clean separation between reusable platform logic and event-specific content/configuration.

## Inspect
- `README.md`
- `CLOUDFLARE_DEPLOY.md`
- Worker/API/storage code and migrations
- editor/gallery code
- `docs/REQUIREMENTS.md`
- `docs/MASTER_ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/PROJECT_STATE.md`
- `AGENTS.md`

## Questions for Astra
1. Which parts should be frozen as proven infrastructure and which extracted into a reusable kit?
2. What is the safest event-specific configuration boundary for future years?
3. Should the same-origin Worker + D1/R2 topology remain the standard kit architecture?
4. What migration/versioning strategy prevents future kit work from damaging the historical 第79回 site?
5. What operational verification checklist should be mandatory before festival-day deploys?

## Required output
Classify proposed changes Maintain / Modify / Retire / Hold. Do not auto-adopt major changes. Return architecture findings, reusable-kit boundary, migration/versioning plan, operational risks, docs to update and SOL HANDOFF.
