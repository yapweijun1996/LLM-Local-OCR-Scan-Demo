import type { Provider, ReasoningEffort, StoredPreferences } from '../types';
import { PROVIDERS } from '../config/providers';

const STORAGE_KEY = 'localscan.preferences.v1';

function isProvider(value: unknown): value is Provider {
  return value === 'lmstudio' || value === 'openai' || value === 'gemini' || value === 'defaultdemo';
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return value === 'none' || value === 'low' || value === 'medium' || value === 'high';
}

export function loadPreferences(): StoredPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    if (!isProvider(parsed.provider) || !parsed.config) return null;

    const defaults = PROVIDERS[parsed.provider];
    return {
      provider: parsed.provider,
      config: {
        endpoint: typeof parsed.config.endpoint === 'string' ? parsed.config.endpoint : defaults.endpoint,
        model: typeof parsed.config.model === 'string' ? parsed.config.model : defaults.model,
        temperature: typeof parsed.config.temperature === 'number' ? parsed.config.temperature : 0,
        reasoningEffort: isReasoningEffort(parsed.config.reasoningEffort) ? parsed.config.reasoningEffort : 'medium',
      },
    };
  } catch {
    return null;
  }
}

export function savePreferences(preferences: StoredPreferences): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
