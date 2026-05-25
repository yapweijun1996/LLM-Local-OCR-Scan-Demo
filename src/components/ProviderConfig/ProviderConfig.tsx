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

export default function ProviderConfig({ provider, config, onProviderChange, onConfigChange }: Props) {
  const cfg = PROVIDERS[provider];
  const showEffort = cfg.supportsReasoningEffort ?? false;
  const effortLabel = cfg.supportsThinkingBudget ? 'Thinking Budget' : 'Reasoning Effort';

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
              onClick={() => onProviderChange(key)}
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
        <div className={s.configField}>
          <label htmlFor="provider-model">Model Name</label>
          <input
            id="provider-model"
            name="provider-model"
            type="text"
            autoComplete="off"
            value={config.model}
            spellCheck={false}
            onChange={e => onConfigChange('model', e.target.value)}
          />
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
