import { useState } from 'react';
import type { Provider, ReasoningEffort, AppState } from '../../types';
import { PROVIDERS } from '../../config/providers';
import LMStudioBanner from '../LMStudioBanner/LMStudioBanner';
import s from './ProviderConfig.module.css';

interface Props {
  provider: Provider;
  config: AppState['config'];
  onProviderChange: (p: Provider) => void;
  onConfigChange: (key: keyof AppState['config'], value: string | number) => void;
}

const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';

const EFFORT_LEVELS: { value: ReasoningEffort; label: string }[] = [
  { value: 'none',   label: 'None'   },
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
];

/** Derive /v1/models URL from the chat completions endpoint. */
function modelsUrl(chatEndpoint: string): string {
  try {
    const u = new URL(chatEndpoint);
    return `${u.protocol}//${u.host}/v1/models`;
  } catch {
    return 'http://localhost:1234/v1/models';
  }
}

/** AbortSignal.timeout() is Safari ≥ 17.4 / Chrome ≥ 103; fall back for older WKWebView. */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; models: string[] }
  | { status: 'err'; msg: string };

export default function ProviderConfig({ provider, config, onProviderChange, onConfigChange }: Props) {
  const cfg = PROVIDERS[provider];
  const showEffort = cfg.supportsReasoningEffort ?? false;
  const effortLabel = cfg.supportsThinkingBudget ? 'Thinking Budget' : 'Reasoning Effort';

  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });

  async function fetchActiveModel() {
    setFetchState({ status: 'loading' });
    try {
      const res = await fetch(modelsUrl(config.endpoint), { signal: timeoutSignal(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { data?: { id: string }[] };
      const models = (data.data ?? []).map(m => m.id).filter(Boolean);
      if (models.length === 0) {
        setFetchState({ status: 'err', msg: 'No models loaded — start one in LM Studio first' });
        return;
      }
      // Auto-fill if only one model; show picker if multiple
      if (models.length === 1) {
        onConfigChange('model', models[0]);
      }
      setFetchState({ status: 'ok', models });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchState({ status: 'err', msg: `Cannot reach LM Studio: ${msg}` });
    }
  }

  return (
    <section className={s.panel} id="panel-1">
      <span className={s.panelNum}>— Step 01 —</span>
      <h2 className={s.panelTitle}>Choose AI engine</h2>
      <div className={s.panelDesc}>Configure the model endpoint, credentials, and sampling controls before staging documents.</div>

      <div className={s.providerGrid}>
        {(Object.keys(PROVIDERS) as Provider[]).map(key => {
          const p = PROVIDERS[key];
          const isActive = provider === key;
          const isCloud = p.needsKey;
          return (
            <button
              key={key}
              className={`${s.providerBtn} ${isActive ? s.active : ''}`}
              onClick={() => { onProviderChange(key); setFetchState({ status: 'idle' }); }}
            >
              <div className={s.providerName}>{p.name}</div>
              <div className={s.providerLoc}>{p.endpoint.replace('https://', '').replace('http://', '').split('/')[0]}</div>
              <span className={`${s.providerBadge} ${isCloud ? s.cloudBadge : ''}`}>
                {key === 'lmstudio' ? 'Local · Specialized'
                  : key === 'defaultdemo' ? 'Demo · Key Built-in'
                  : `Cloud · ${p.model}`}
              </span>
            </button>
          );
        })}
      </div>

      <LMStudioBanner visible={IS_HTTPS && provider === 'lmstudio'} />

      <form className={s.configGrid} onSubmit={e => e.preventDefault()}>
        <div className={s.configField}>
          <label htmlFor="provider-endpoint">Endpoint URL</label>
          <input
            id="provider-endpoint"
            name="provider-endpoint"
            type="text"
            autoComplete="off"
            value={config.endpoint}
            spellCheck={false}
            onChange={e => onConfigChange('endpoint', e.target.value)}
          />
        </div>

        {/* Model Name — with auto-detect button for LM Studio */}
        <div className={s.configField}>
          <div className={s.modelLabelRow}>
            <label htmlFor="provider-model">Model Name</label>
            {provider === 'lmstudio' && (
              <button
                type="button"
                className={`${s.fetchBtn} ${fetchState.status === 'loading' ? s.fetchBtnLoading : ''}`}
                onClick={fetchActiveModel}
                disabled={fetchState.status === 'loading'}
                title="Fetch active model from LM Studio"
              >
                {fetchState.status === 'loading' ? '…' : '↻ Auto-detect'}
              </button>
            )}
          </div>
          <input
            id="provider-model"
            name="provider-model"
            type="text"
            autoComplete="off"
            value={config.model}
            spellCheck={false}
            onChange={e => { onConfigChange('model', e.target.value); setFetchState({ status: 'idle' }); }}
          />

          {/* Status / model picker */}
          {fetchState.status === 'err' && (
            <div className={s.fetchErr}>{fetchState.msg}</div>
          )}
          {fetchState.status === 'ok' && fetchState.models.length > 1 && (
            <div className={s.modelPicker}>
              <div className={s.modelPickerLabel}>Select loaded model:</div>
              {fetchState.models.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`${s.modelPickerBtn} ${config.model === m ? s.modelPickerBtnActive : ''}`}
                  onClick={() => { onConfigChange('model', m); setFetchState({ status: 'idle' }); }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          {fetchState.status === 'ok' && fetchState.models.length === 1 && (
            <div className={s.fetchOk}>✓ Auto-filled: {fetchState.models[0]}</div>
          )}
        </div>

        <div className={`${s.configField} ${!cfg.needsKey ? s.hidden : ''}`}>
          <label htmlFor="provider-api-key">API Key <span style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>(not needed for LM Studio)</span></label>
          <input
            id="provider-api-key"
            name="provider-api-key"
            type="password"
            autoComplete="current-password"
            value={config.apiKey}
            placeholder="sk-... or AIza..."
            onChange={e => onConfigChange('apiKey', e.target.value)}
          />
        </div>
        <div className={s.configField}>
          <label htmlFor="provider-temperature">Temperature</label>
          <input
            id="provider-temperature"
            name="provider-temperature"
            type="number"
            autoComplete="off"
            min={0}
            max={2}
            step={0.1}
            value={config.temperature}
            onChange={e => onConfigChange('temperature', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Reasoning Effort / Thinking Budget — shown only for supporting providers */}
        {showEffort && (
          <div className={`${s.configField} ${s.effortField}`}>
            <label>{effortLabel}</label>
            <div className={s.effortRow}>
              {EFFORT_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${s.effortBtn} ${config.reasoningEffort === value ? s.effortActive : ''}`}
                  onClick={() => onConfigChange('reasoningEffort', value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {cfg.supportsThinkingBudget && (
              <div className={s.effortHint}>
                {config.reasoningEffort === 'none'   && 'Thinking disabled (budget = 0)'}
                {config.reasoningEffort === 'low'    && 'Budget: 2 048 tokens'}
                {config.reasoningEffort === 'medium' && 'Budget: 8 192 tokens'}
                {config.reasoningEffort === 'high'   && 'Budget: 24 576 tokens (max)'}
              </div>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
