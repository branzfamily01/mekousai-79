# Mekousai Decisions

## 2026-09-07 — Astra–Sol governance
Status: Adopted for repository governance

Astra is Chief Architect for root production/reuse architecture; Sol is Main Operator; Codex implements scoped approved changes.

## Existing production decision — Cloudflare topology
Status: Maintain

Static site and photo API are served from the same Cloudflare Worker/origin. R2 stores photo objects; D1 stores photo metadata/state.

## Existing production decision — Secrets
Status: Maintain

Editor/session secrets are stored only in Cloudflare secret storage and never in GitHub.

## Existing production decision — Photo privacy
Status: Maintain

Browser upload processing removes EXIF/location metadata as part of the current photo workflow.

## Reuse direction — Future festival kit
Status: Maintain as product direction

The proven 第79回 implementation should inform a reusable next-year kit, but historical/current site stability is preserved. Reuse work must not silently rewrite historical event content.

## Change control
Use Maintain / Modify / Retire / Hold for major architecture/policy proposals. Major changes require explicit user acceptance.
