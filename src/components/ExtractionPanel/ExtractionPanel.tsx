import { useEffect, useRef, useState } from 'react';
import type { AppState, ExtractionResult } from '../../types';
import { PROVIDERS } from '../../config/providers';
import { PROMPT } from '../../config/prompt';
import { callLLM } from '../../services/llm';
import { postProcess } from '../../services/postProcess';
import { validateMath, computeAccuracy } from '../../services/accuracy';
import { GROUND_TRUTH } from '../../config/groundTruth';
import s from './ExtractionPanel.module.css';

const PROMPT_STORAGE_KEY = 'localscan-custom-prompt';

interface LogLine {
  time: string;
  msg: string;
  level: 'info' | 'ok' | 'warn' | 'err';
}

interface Props {
  state: AppState;
  onSetRunning: (running: boolean) => void;
  onSetResult: (fileId: string, result: ExtractionResult) => void;
  onSetStep: (step: number) => void;
}

export default function ExtractionPanel({ state, onSetRunning, onSetResult, onSetStep }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>(
    () => localStorage.getItem(PROMPT_STORAGE_KEY) ?? PROMPT,
  );
  const [promptOpen, setPromptOpen] = useState(true);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  function handlePromptChange(value: string) {
    setCustomPrompt(value);
    localStorage.setItem(PROMPT_STORAGE_KEY, value);
  }

  function resetPrompt() {
    setCustomPrompt(PROMPT);
    localStorage.removeItem(PROMPT_STORAGE_KEY);
  }

  function addLog(msg: string, level: LogLine['level'] = 'info') {
    const t = new Date().toTimeString().slice(0, 8);
    setLogs(current => [...current, { time: t, msg, level }]);
  }

  async function runExtraction() {
    if (state.running || state.files.length === 0) return;
    setLogs([]);
    onSetRunning(true);
    onSetStep(3);

    const { endpoint, model, apiKey, temperature } = state.config;

    for (const file of state.files) {
      addLog(`Processing: ${file.name}…`);
      try {
        addLog(`→ Calling ${PROVIDERS[state.provider].name}…`);
        const raw = await callLLM({
          endpoint,
          model,
          apiKey,
          temperature,
          base64: file.base64,
          provider: state.provider,
          prompt: customPrompt,
          reasoningEffort: state.config.reasoningEffort,
        });
        addLog(`→ Raw output received (${raw.length} chars)`, 'ok');

        const cleaned = postProcess(raw);
        addLog(`→ Parsed ${cleaned.rows.length} rows, ${cleaned.header.length} columns`, 'ok');

        const mathIssues = validateMath(cleaned.rows);
        if (mathIssues.length > 0) {
          mathIssues.forEach(i => addLog(`⚠ Math mismatch row ${i.no}: ${i.msg}`, 'warn'));
        } else {
          addLog('→ All math checks passed', 'ok');
        }

        let accuracy = null;
        if (file.isBenchmark) {
          accuracy = computeAccuracy(cleaned, GROUND_TRUTH);
          addLog(`→ Benchmark accuracy: ${accuracy.overallPct}% (${accuracy.cellsMatched}/${accuracy.cellsTotal} cells)`, accuracy.overallPct >= 90 ? 'ok' : 'warn');
        }

        onSetResult(file.id, { raw, cleaned, accuracy, issues: mathIssues, isBenchmark: file.isBenchmark });
        addLog(`✓ ${file.name} complete`, 'ok');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`✗ Error: ${msg}`, 'err');
        onSetResult(file.id, { raw: null, cleaned: null, accuracy: null, issues: [], isBenchmark: file.isBenchmark, error: msg });
      }
    }

    onSetRunning(false);
    onSetStep(4);
    addLog('Extraction complete. See results below.', 'ok');
  }

  const providerName = PROVIDERS[state.provider].name;
  const canRun = state.files.length > 0 && !state.running;
  const isModified = customPrompt !== PROMPT;

  return (
    <section className={s.panel} id="panel-3">
      <span className={s.panelNum}>— Step 03 —</span>
      <h2 className={s.panelTitle}>Run extraction</h2>
      <div className={s.panelDesc}>Send staged pages to the configured engine, then clean, validate, and benchmark the returned table JSON.</div>

      {/* ── Prompt Editor ── */}
      <div className={s.promptSection}>
        <button
          className={s.promptToggle}
          onClick={() => setPromptOpen(o => !o)}
          aria-expanded={promptOpen}
        >
          <span className={s.promptToggleIcon}>{promptOpen ? '▾' : '▸'}</span>
          <span>Extraction Prompt</span>
          {isModified && <span className={s.promptModifiedBadge}>Edited</span>}
        </button>

        {promptOpen && (
          <div className={s.promptBody}>
            <textarea
              className={s.promptTextarea}
              value={customPrompt}
              onChange={e => handlePromptChange(e.target.value)}
              rows={10}
              spellCheck={false}
              aria-label="Extraction prompt"
            />
            <div className={s.promptFooter}>
              <span className={s.promptChars}>{customPrompt.length} chars</span>
              <button
                className={s.promptReset}
                onClick={resetPrompt}
                disabled={!isModified}
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={s.runBar}>
        <div className={s.runInfo}>
          <div className={s.runTarget}>
            Will process <b>{state.files.length}</b> image(s) via <b>{providerName}</b>
          </div>
        </div>
        <button className={s.btnPrimary} disabled={!canRun} onClick={runExtraction}>
          <span className={s.arrow}>{state.running ? <span className="spinner" /> : '→'}</span>
          <span>{state.running ? 'Extracting…' : 'Start Extraction'}</span>
        </button>
      </div>

      <div className={s.logArea} ref={logRef}>
        {logs.length === 0 && <div className={s.logEmpty}>Awaiting input…</div>}
        {logs.map((line, index) => (
          <div key={`${line.time}-${index}`} className={s.logLine}>
            <span className={s.logTime}>{line.time}</span>
            <span className={line.level === 'ok' ? s.logOk : line.level === 'warn' ? s.logWarn : line.level === 'err' ? s.logErr : s.logInfo}>
              {line.msg}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
