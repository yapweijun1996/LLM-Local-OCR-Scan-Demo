# Task: Apple-Style UI/UX Redesign + PWA Persistence

Date: 2026-05-25

## Goal

Redesign the LocalScan OCR demo into a cleaner Apple-style PWA workspace with a clear admin/control panel, local persistence, and result history, while preserving the existing flow:

1. Configure AI provider.
2. Upload or load document samples.
3. Run extraction.
4. Verify and export structured output.

## Approved Improvement Scope

- Make the app a standard installable PWA with manifest metadata, app icons, theme color, and service worker registration.
- Use `localStorage` for safe lightweight preferences: provider, endpoint, model, and temperature.
- Do not persist API keys in `localStorage` or IndexedDB.
- Use IndexedDB for extraction history and cleaned results, because raw/result payloads can be large.
- Add admin history controls so users can restore recent results or clear local history.
- Keep all persistence local-first; no backend or cloud storage is introduced.

## KB-MCP Brain Notes

- Keep administrative controls visually separate from user-facing output.
- Separate staged inputs from execution actions so users understand what will run.
- Verify mobile layout explicitly; persistent sidebars must collapse cleanly on narrow screens.
- Use the prior PWA/history pattern: localStorage only for small non-secret preferences, IndexedDB for heavier durable records, and clear admin controls for local data.

## Acceptance Checks

- UI uses system typography, restrained color, clear hierarchy, subtle depth, and generous spacing.
- Admin/control panel exposes status, privacy posture, queue, active file, and quick navigation without hiding the main workflow.
- Admin/control panel exposes local history count, recent records, restore actions, and clear-history action.
- Reloading the app restores provider/model/endpoint/temperature preferences but not API keys.
- Completed extraction attempts are saved to IndexedDB and can be restored into the results panel.
- PWA manifest and service worker registration exist and build with the Vite base path.
- Mobile layout has no horizontal page scroll, overlapping text, or unusable fixed sidebar.
- Existing extraction behavior remains intact.
- TypeScript build passes.
- Lint passes.
- Browser smoke test covers desktop and mobile viewports plus benchmark staging.

## Current Findings

- Baseline `npm run build` fails in `src/services/pdf.ts` because `pdfjs-dist` v5 render parameters now require a `canvas` property.
- Results table currently renders a fragment list without a stable fragment key, which can produce React warnings.
- Build emits a non-blocking chunk-size warning because `pdfjs-dist` includes a large worker/runtime. This is acceptable for this phase unless we add route-level/lazy PDF loading.

## Implementation Plan

- [x] Add app shell styles and admin/control panel component.
- [x] Restyle global tokens and major workflow panels toward Apple-style clarity.
- [x] Fix touched React warnings and build blocker.
- [x] Add localStorage preference persistence.
- [x] Add IndexedDB extraction history persistence.
- [x] Add admin history restore and clear controls.
- [x] Add PWA manifest, metadata, and service worker registration.
- [x] Run build/lint.
- [x] Verify desktop and mobile in browser.

## Completed Changes

- Added Apple-style app shell, admin Control Center, responsive workflow panels, and system UI visual tokens.
- Added `localStorage` persistence for non-secret provider preferences only.
- Added IndexedDB extraction history with automatic pruning to the latest 50 records.
- Added admin history list, restore action, and clear action.
- Added PWA manifest, app icon, service worker, production registration, and PWA metadata.
- Added PDF upload support by wiring the existing PDF renderer into document staging.
- Fixed PDF.js v5 render typing by passing `canvas` to `page.render`.
- Reworked extraction logs from manual `innerHTML` mutation to React state rendering.
- Added a 45-second LLM request timeout to avoid indefinite Running state when an endpoint is unavailable.
- Fixed form labels, input names/ids, autocomplete metadata, manifest paths, and thumbnail accessibility issues found during browser QA.

## Verification

- `npm run lint` passes with 0 errors and 0 warnings.
- `npm run build` passes.
- Build still emits the known non-blocking chunk-size warning caused by `pdfjs-dist`/PDF worker bundling.
- Chrome DevTools desktop QA:
  - provider preferences persist through reload;
  - API key remains empty and is not stored;
  - benchmark staging updates queue/active document;
  - failed extraction is saved to IndexedDB history;
  - history restore repopulates the result panel;
  - no horizontal overflow.
- Chrome DevTools mobile QA at `390x844`:
  - admin panel and main flow collapse to single-column widths;
  - no horizontal overflow.
- Production preview QA at `http://127.0.0.1:4173/LLM-Local-OCR-Scan-Demo/`:
  - manifest loads from the correct base path;
  - service worker registration controls the app scope;
  - console has no errors or warnings.

## Future Backlog

- Split PDF rendering into a lazy-loaded module to remove the production chunk-size warning.
- Add deterministic unit tests for `postProcess`, `accuracy`, and IndexedDB history service.
- Add optional import/export for local history archives.
- Add offline fallback UX that explains cloud providers need connectivity while local results remain available.
