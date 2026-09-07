# Mekousai Master Architecture

Status: approved production baseline consolidated by Sol; Astra architecture review pending
Last updated: 2026-09-07

## Production baseline
- GitHub repository is the code source of truth.
- One Cloudflare Worker/origin serves Static Assets and the photo API.
- R2 stores photo binaries.
- D1 stores photo metadata, category, description, visibility and representative-photo state.
- `editor.html` is the mobile-oriented editor surface.
- Secrets remain in Cloudflare secret storage only.

This is a proven event-production architecture. Do not redesign it merely for aesthetic purity.

## Historical/current repo boundary
`mekousai-79` is the 第79回 site. Reusable improvements should be designed so they can seed future festival kits without silently rewriting historical content or destabilizing the existing production site.

## Media boundary
Photo binary storage and photo metadata are separate responsibilities (R2 vs D1). UI operations should preserve that distinction and keep publish state explicit.

## Privacy
Photo upload processing should continue to remove EXIF/location metadata when the current browser compression path is used. Never commit production editor/session secrets.

## Operational design
Editor workflows optimize for event-day speed: multi-select, bulk actions, clear status, category navigation and mobile use. Runtime behavior must degrade predictably on upload/API errors.

## Cloudflare discipline
Architecture-affecting Cloudflare changes require current official-document verification for material pricing/limits/specs and consultation of project trap/runbook guidance. Production acceptance requires end-to-end flow verification, not rendering only.

## Governance
- Astra: fundamental Worker/D1/R2/auth/origin design, major next-year reusable-kit architecture, destructive migration.
- Sol: routine UX/editor/gallery improvements, photo operations, bounded API changes under existing contracts, docs and Codex tasks.
- Codex: implementation and tests.

## Escalation
Astra review before changing R2/D1 responsibility, auth/session architecture, same-origin topology, major deployment model, or historical/current-site separation.
