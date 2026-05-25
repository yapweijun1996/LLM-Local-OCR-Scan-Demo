# LocalScan — LLM OCR Demo

A browser-only, installable PWA that extracts structured table data from images or PDFs by calling a multimodal LLM. Supports local (LM Studio), cloud (OpenAI, Gemini), and a built-in zero-config demo provider.

Live demo: https://yapweijun1996.github.io/LLM-Local-OCR-Scan-Demo/

## Highlights

- **Four providers, one switch** — LM Studio (local), OpenAI, Gemini, and a built-in "Default Demo" gateway with an XOR-encrypted API key (no setup required).
- **Reasoning controls** — per-provider effort level (None / Low / Medium / High); maps to `reasoning_effort` (OpenAI o-series), `thinking_config.thinking_budget` (Gemini 2.5), or `reasoning.effort` (Responses API).
- **Editable extraction prompt** — modify the system prompt at runtime, persisted in localStorage, with one-click Reset to Default.
- **Active model auto-detect** — for LM Studio, click `↻ Auto-detect` to fetch the currently loaded model via `/v1/models`.
- **PDF + image support** — multi-page PDFs are rendered to JPEG via `pdfjs-dist` v5; PNG/JPG/WebP supported directly.
- **History with thumbnails** — every extraction stored in IndexedDB (max 50 records) with the source image embedded for full restore.
- **Benchmark mode** — built-in 14-row PO sample with ground-truth scoring and math validation (row totals, currency, multi-line cells).
- **Installable PWA** — manifest, app icon, service worker, offline shell.
- **Apple-style UI** — system fonts, restrained color, generous spacing, mobile-responsive.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle in dist/
npm run preview      # serve dist/ at http://localhost:4173
npm run lint         # ESLint
```

Build emits a chunk-size warning from the `pdfjs-dist` worker (~1.2 MB) — known and acceptable; see backlog in `task.md` for the lazy-loading plan.

## Provider configuration

| Provider | Endpoint | Needs key | Reasoning control |
|---|---|---|---|
| **LM Studio** | `http://localhost:1234/v1/chat/completions` | No | — |
| **OpenAI** | `https://api.openai.com/v1/chat/completions` | Yes | `reasoning_effort` (o-series) |
| **Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Yes | `thinking_config.thinking_budget` |
| **Default Demo** | `https://gpt.yapweijun1996.com/v1/responses` | Bundled (XOR-encrypted) | `reasoning.effort` |

API keys typed into the UI are **never persisted** — they live in React state for the session only. The Default Demo's key is XOR-encrypted in `src/config/providers.ts` and decrypted in-memory only when needed.

## Architecture

```
src/
├─ App.tsx                       — root layout; wires history + state
├─ hooks/useAppState.ts          — useReducer for global state
├─ config/
│  ├─ providers.ts               — provider catalog + flags (encryptedKey, isResponsesApi, etc.)
│  ├─ prompt.ts                  — default extraction prompt
│  └─ groundTruth.ts             — benchmark expected output
├─ services/
│  ├─ llm.ts                     — multi-provider HTTP layer (chat completions / responses API / thinking_config)
│  ├─ postProcess.ts             — JSON extraction + row cleanup
│  ├─ accuracy.ts                — cell match + math validation
│  ├─ historyDb.ts               — IndexedDB CRUD (50-record cap)
│  ├─ preferences.ts             — localStorage prefs (no secrets)
│  ├─ xor.ts                     — XOR cipher for the demo gateway key
│  ├─ pdf.ts                     — PDF → JPEG via pdfjs-dist v5
│  ├─ fileUtils.ts               — File → base64
│  └─ pwa.ts                     — SW registration
├─ components/
│  ├─ ProviderConfig/            — Step 01: provider switch + endpoint/key/model/temperature/effort
│  ├─ UploadPanel/               — Step 02: drag-drop + sample loader + thumbnails + image modal
│  ├─ ExtractionPanel/           — Step 03: prompt editor + Run + log stream
│  ├─ ResultsPanel/              — Step 04: cleaned table + accuracy report + raw JSON
│  ├─ AdminPanel/                — Sidebar: status, history list, restore, clear
│  ├─ Hero / Masthead / Footer / StepIndicator / ComplianceBar / LMStudioBanner
└─ types/index.ts                — shared TS types
```

### Provider abstraction

`src/services/llm.ts` is the single integration point. Each provider exposes capability flags in `src/config/providers.ts`:

- `isResponsesApi` — use `/v1/responses` body shape instead of Chat Completions
- `supportsReasoningEffort` — show the effort UI control
- `supportsThinkingBudget` — Gemini-specific: emit `thinking_config.thinking_budget` instead of `reasoning_effort`
- `encryptedKey` — XOR-encrypted bearer token; auto-decrypted when `apiKey` is empty
- `needsKey` — show/hide the API key input

Adding a new provider only requires editing `providers.ts` and (if it uses a novel response shape) extending `callLLM` — no UI changes needed for standard Chat Completions or Responses API providers.

## Security & privacy posture

- All processing happens in the browser. The only network egress is the LLM provider call you select.
- API keys typed into the UI are session-only React state. Never written to localStorage or IndexedDB.
- Source images are stored in IndexedDB **only** for the history restore feature, never sent anywhere except the LLM call you initiate.
- The Default Demo key is XOR-obfuscated (not cryptographic protection — anyone reading the source can extract it). The gateway behind it is rate-limited.
- No analytics, no telemetry, no third-party scripts.

## Known limitations

See the **Known Issues / Backlog** section in [`task.md`](./task.md) for a tracked list of bugs and risks from the latest code review (10 items, ranked by severity).

## Deployment

GitHub Pages deployment is automated via `.github/workflows/deploy.yml` — every push to `main` builds and publishes to `https://yapweijun1996.github.io/LLM-Local-OCR-Scan-Demo/`.

## License

Personal demo by yapweijun1996. Not production-ready — see Known Issues before relying on it for real work.
