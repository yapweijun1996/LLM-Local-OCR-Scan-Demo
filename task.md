# LocalScan OCR Demo — Task Log

## Phase 1: Apple-Style UI/UX Redesign + PWA Persistence

Date: 2026-05-25

### Goal

Redesign the LocalScan OCR demo into a cleaner Apple-style PWA workspace with a clear admin/control panel, local persistence, and result history, while preserving the existing flow:

1. Configure AI provider.
2. Upload or load document samples.
3. Run extraction.
4. Verify and export structured output.

### Approved Improvement Scope

- Make the app a standard installable PWA with manifest metadata, app icons, theme color, and service worker registration.
- Use `localStorage` for safe lightweight preferences: provider, endpoint, model, and temperature.
- Do not persist API keys in `localStorage` or IndexedDB.
- Use IndexedDB for extraction history and cleaned results, because raw/result payloads can be large.
- Add admin history controls so users can restore recent results or clear local history.
- Keep all persistence local-first; no backend or cloud storage is introduced.

### KB-MCP Brain Notes

- Keep administrative controls visually separate from user-facing output.
- Separate staged inputs from execution actions so users understand what will run.
- Verify mobile layout explicitly; persistent sidebars must collapse cleanly on narrow screens.
- Use the prior PWA/history pattern: localStorage only for small non-secret preferences, IndexedDB for heavier durable records, and clear admin controls for local data.

### Implementation Plan

- [x] Add app shell styles and admin/control panel component.
- [x] Restyle global tokens and major workflow panels toward Apple-style clarity.
- [x] Fix touched React warnings and build blocker.
- [x] Add localStorage preference persistence.
- [x] Add IndexedDB extraction history persistence.
- [x] Add admin history restore and clear controls.
- [x] Add PWA manifest, metadata, and service worker registration.
- [x] Run build/lint.
- [x] Verify desktop and mobile in browser.

### Completed Changes

- Added Apple-style app shell, admin Control Center, responsive workflow panels, and system UI visual tokens.
- Added `localStorage` persistence for non-secret provider preferences only.
- Added IndexedDB extraction history with automatic pruning to the latest 50 records.
- Added admin history list, restore action, and clear action.
- Added PWA manifest, app icon, service worker, production registration, and PWA metadata.
- Added PDF upload support by wiring the existing PDF renderer into document staging.
- Fixed PDF.js v5 render typing by passing `canvas` to `page.render`.
- Reworked extraction logs from manual `innerHTML` mutation to React state rendering.
- Added a 45-second LLM request timeout (later raised — see Phase 2).
- Fixed form labels, input names/ids, autocomplete metadata, manifest paths, and thumbnail accessibility issues found during browser QA.

### Verification

- `npm run lint` passes with 0 errors and 0 warnings.
- `npm run build` passes.
- Build still emits the known non-blocking chunk-size warning caused by `pdfjs-dist`/PDF worker bundling.
- Desktop QA at full resolution and mobile QA at `390x844`; no horizontal overflow.
- Production preview QA at `http://127.0.0.1:4173/LLM-Local-OCR-Scan-Demo/`; SW registered, manifest loads.

---

## Phase 2: Multi-Provider Enhancements & UX Polish

Date: 2026-05-25 (same day, follow-up session)

### Goal

Extend the demo with a built-in zero-config provider, per-provider reasoning controls, runtime prompt editing, and quality-of-life UX fixes for the upload and history flows.

### Implementation Plan

- [x] Add "Default Demo" provider that ships with an XOR-encrypted API key for an OpenAI Responses API gateway.
- [x] Implement XOR encrypt/decrypt service compatible with `yapweijun1996/XOR-Cipher-Tool`.
- [x] Add reasoning-effort control (None / Low / Medium / High) for OpenAI, Gemini, and Default Demo.
- [x] Map effort levels to provider-specific API fields (`reasoning_effort`, `reasoning.effort`, `thinking_config.thinking_budget`).
- [x] Make the extraction prompt user-editable with localStorage persistence and Reset to Default.
- [x] Auto-detect active LM Studio model via `/v1/models`.
- [x] Allow click-to-zoom on image thumbnails (modal lightbox with ESC / backdrop close).
- [x] Persist base64 in `HistoryRecord` so restored history shows thumbnails.
- [x] Raise LLM request timeout from 45 s to 300 s for slow local models.
- [x] Run high-recall code review across the codebase and log findings (see below).

### Completed Changes

- **Default Demo provider**: hardcoded `https://gpt.yapweijun1996.com/v1/responses` endpoint with an XOR-encrypted gateway key (key: `20260515`). Auto-decrypts at request time; the plaintext key is never written to disk or localStorage.
- **XOR cipher** (`src/services/xor.ts`): byte-by-byte XOR with cyclic UTF-8 key, payload encoded as `String(b).padStart(3, '0')` per byte. Matches the reference tool's number-groups format.
- **Reasoning controls**: added `ReasoningEffort` union type; `supportsReasoningEffort` and `supportsThinkingBudget` flags on `ProviderConfig`; segmented button UI in `ProviderConfig`; `THINKING_BUDGET` map (None=0, Low=2048, Medium=8192, High=24576) for Gemini.
- **Editable prompt**: collapsible editor in `ExtractionPanel` with textarea, char count, modified badge, and Reset to Default. Persisted at `localStorage['localscan-custom-prompt']`.
- **LM Studio auto-detect**: `↻ Auto-detect` button derives `/v1/models` from the chat endpoint via `new URL().host`. Single model auto-fills; multiple models show a picker; 5-second `AbortSignal.timeout`.
- **Image modal**: `ImageModal` component in `UploadPanel`, fixed-position overlay with `backdrop-filter: blur(4px)`, ESC key handler.
- **History restore fix**: `HistoryRecord.base64?: string` added; `handleSetResult` saves the source image; `handleRestoreHistory` restores it. Backward compatible with old records lacking the field.
- **Timeout**: `REQUEST_TIMEOUT_MS = 300_000`. Error message uses `Math.round(... / 1000)` so it updates automatically.
- **`postProcess` defensive guards**: `forEach` calls wrapped in `Array.isArray(json.rows)` checks (incomplete — see Known Issue #1 below).
- **`extractResponsesText` fix**: skips entries with `type: 'reasoning'` and finds the first `type: 'message'` entry to read `output_text` from.
- **`preferences.ts`**: `isProvider` now accepts `'defaultdemo'`; new `isReasoningEffort` validator; persists / restores `reasoningEffort` field.
- **`UploadPanel` double-trigger fix**: removed redundant `onClick={() => fileInputRef.current?.click()}` on the `<label>` (label already forwards clicks natively to its inner `<input>`).

### Verification

- `npm run build` passes with 0 TypeScript errors.
- Manual browser QA: provider switching, prompt editor, reasoning effort, LM Studio auto-detect, image modal, history thumbnail restore all functional.
- Commits: `fc75db4` (Phase 2 core), `76b323f` (LM Studio + timeout), `65ca4b4` (picker hide), `bca1cd0` (file dialog fix).

---

## Known Issues / Backlog (from code review, 2026-05-25)

Ranked by severity. Each entry is a real bug or risk surfaced by a high-recall 3-angle review. Most are simple fixes (≤5 lines).

### Tier 1 — Crash / Wire-Protocol Bugs ✅ FIXED (commit `1f96bd5`)

1. ~~**`postProcess.ts:11` — `json.rows.length` crash when model omits `rows`.**~~ ✅ Added type-guard for parsed JSON (rejects non-objects, arrays, null); normalized return shape to always `{ header: [], rows: [] }`.
2. ~~**`fileUtils.ts:9` + `llm.ts:37/53` — PNG/WebP labeled as JPEG.**~~ ✅ Added optional `mimeType` to `FileEntry` and `HistoryRecord`; UploadPanel stores `f.type` (PDFs → `image/jpeg`); `callLLM` accepts `mimeType` and uses real MIME in both Chat Completions and Responses API data URLs.
3. ~~**`App.tsx:68` — `record.base64 ?? ''` produces broken requests.**~~ ✅ ExtractionPanel now skips files with `!file.base64` and logs `"Skipped ... no image data ... re-upload the source file"`.

### Tier 2 — Silent Logic Bugs ✅ FIXED (commit pending)

4. ~~**`accuracy.ts:14` — Division by zero → `Infinity`.**~~ ✅ Guarded `q !== 0`; emits `"Suggested Unit Price: N/A (qty = 0)"` and `suggestedPrice: 0` when qty is zero.
5. ~~**`ExtractionPanel.tsx:30` — Empty prompt persists via `?? PROMPT`.**~~ ✅ Initializer uses `|| PROMPT`; `handlePromptChange` removes the localStorage key when the value is whitespace-only.
6. ~~**`ExtractionPanel.tsx:54` — Double-tap race on `Start Extraction`.**~~ ✅ Added `runningRef = useRef(false)` synchronous mutex; flipped before any await; released in `finally` block.
7. ~~**`useAppState.ts:36` — `SET_PROVIDER` does not reset `reasoningEffort`.**~~ ✅ Reducer now resets `reasoningEffort: 'medium'` alongside `endpoint/model/apiKey`.
8. ~~**`accuracy.ts:31` — Row match fails on leading-zero `No` ('01' vs '1').**~~ ✅ New `normalizeNo()` helper trims + drops leading zeros; applied in row lookup, `truthByNo` map, and `extraRows` filter.

### Tier 3 — Defensive / UX ✅ FIXED (commit pending)

9. ~~**`llm.ts:145` — `res.json()` without content-type check.**~~ ✅ Inspect `Content-Type` header; throw explicit "Expected JSON but server returned '<ct>'. Possible cause: proxy / captive portal / wrong endpoint URL. First bytes: …" on mismatch.
10. ~~**`postProcess.ts:46` — `extractFirstJSON` global ``` strip + naive brace counter.**~~ ✅ Removed the pre-strip entirely — the brace counter already correctly skips prefix/suffix text including code fences. Triple-backticks inside string values are now preserved.

### Lower-priority / Compatibility ✅ FIXED (commit pending)

- ~~`ProviderConfig.tsx:49` — `AbortSignal.timeout(5000)` requires Safari ≥ 17.4 / Chrome ≥ 103.~~ ✅ Added `timeoutSignal(ms)` helper with feature detection; falls back to `AbortController` + `setTimeout` on older WKWebViews.
- ~~`historyDb.ts` — `saveHistoryRecord` + `pruneHistoryRecords` are separate transactions; concurrent saves can race past `MAX_HISTORY_RECORDS = 50`.~~ ✅ Merged put + prune into a single readwrite transaction. IDB serializes concurrent transactions on the same store so multi-page saves cannot race.
- ~~`xor.ts` — No length validation in `xorDecrypt`; a truncated payload silently produces a corrupted key.~~ ✅ Validates non-empty, length % 3 === 0, all-digits, and byte ≤ 255; throws actionable errors instead of silently corrupting.

---

## Future Backlog (deferred features)

- Split PDF rendering into a lazy-loaded chunk to remove the production chunk-size warning.
- Add deterministic unit tests for `postProcess`, `accuracy`, `historyDb`, and `xor` services.
- Add optional import/export for local history archives.
- Add offline fallback UX that explains cloud providers need connectivity.
- Schema version for the custom prompt in localStorage so new defaults can be opt-in upgrades.
- Per-provider default reasoning effort (e.g., LM Studio = none, others = medium).
- Optional Cloudflare-tunnel-protected gateway key rotation (avoid embedding the encrypted key in the bundle).
