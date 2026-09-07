# Mekousai Site Requirements

Status: current approved baseline, 2026-09-07

## Purpose
Preserve the proven 第79回目高祭 production site and evolve its successful patterns into a reusable future festival-operations kit without casually breaking the historical/live implementation.

## Audience and UX
- Mobile-first for visitors, junior-high students and current students.
- Editing/operations must be understandable by teachers/students under event-day pressure.
- Large, obvious controls and low-friction navigation are preferred.
- Returning to top/previous views should produce predictable scroll position.

## Photo operations
- Support multi-select/multi-upload, category organization, bulk publish/unpublish, per-photo comments and natural image aspect ratios.
- Avoid destructive/unintended cropping such as forced square thumbnails when it hides important content.
- Browser-side image processing should preserve privacy protections such as EXIF/location removal where currently implemented.

## Production architecture requirements
- GitHub source is the code source of truth.
- Cloudflare Workers Static Assets serves the site.
- Worker API handles photo management.
- R2 stores photo objects.
- D1 stores photo metadata/publication state.
- Public site and photo API currently share the same Worker/origin.
- Secrets such as editor credentials/session secrets exist only in Cloudflare secret storage.

## Verification
After production changes, test affected real flows: public site, editor auth, upload, D1/R2 behavior, publish/unpublish, CSS/JS/images, logout/session/re-access and error behavior.

## Governance
Astra owns major storage/auth/origin/deployment redesign and next-generation template architecture. Sol owns routine gallery/editor/UI/operational improvements within the proven architecture. Codex implements and tests scoped changes.
