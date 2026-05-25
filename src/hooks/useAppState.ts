import { useEffect, useReducer } from 'react';
import type { AppState, AppAction, Provider } from '../types';
import { PROVIDERS } from '../config/providers';
import { loadPreferences, savePreferences } from '../services/preferences';

function createInitialState(): AppState {
  const preferences = loadPreferences();
  const provider = preferences?.provider ?? 'lmstudio';
  const defaults = PROVIDERS[provider];

  return {
    provider,
    files: [],
    activeFileId: null,
    results: {},
    running: false,
    step: 1,
    config: {
      endpoint: preferences?.config.endpoint ?? defaults.endpoint,
      model: preferences?.config.model ?? defaults.model,
      apiKey: '',
      temperature: preferences?.config.temperature ?? 0,
      reasoningEffort: preferences?.config.reasoningEffort ?? 'medium',
    },
  };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROVIDER': {
      return {
        ...state,
        provider: action.provider,
        config: {
          ...state.config,
          endpoint: action.endpoint,
          model: action.model,
          apiKey: '',
          // Reset effort to a sensible default — a 'high' setting tuned for Gemini
          // would bleed into OpenAI o-series billing if preserved.
          reasoningEffort: 'medium',
        },
      };
    }
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, [action.key]: action.value } };

    case 'ADD_FILE': {
      const files = [...state.files, action.file];
      const step = files.length === 1 ? Math.max(state.step, 2) : state.step;
      return { ...state, files, activeFileId: action.file.id, step };
    }

    case 'RESTORE_HISTORY':
      return {
        ...state,
        files: [...state.files, action.file],
        activeFileId: action.file.id,
        results: { ...state.results, [action.file.id]: action.result },
        step: 4,
      };

    case 'REMOVE_FILE': {
      const files = state.files.filter(f => f.id !== action.id);
      const results = { ...state.results };
      delete results[action.id];
      const activeFileId = state.activeFileId === action.id
        ? (files[files.length - 1]?.id ?? null)
        : state.activeFileId;
      return { ...state, files, results, activeFileId };
    }

    case 'SET_ACTIVE_FILE':
      return { ...state, activeFileId: action.id };

    case 'SET_RESULT':
      return { ...state, results: { ...state.results, [action.fileId]: action.result } };

    case 'SET_RUNNING':
      return { ...state, running: action.running };

    case 'SET_STEP':
      return { ...state, step: action.step };

    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { provider, config } = state;

  useEffect(() => {
    savePreferences({
      provider,
      config: {
        endpoint: config.endpoint,
        model: config.model,
        temperature: config.temperature,
        reasoningEffort: config.reasoningEffort,
      },
    });
  }, [provider, config.endpoint, config.model, config.temperature, config.reasoningEffort]);

  function setProvider(provider: Provider) {
    const cfg = PROVIDERS[provider];
    dispatch({ type: 'SET_PROVIDER', provider, endpoint: cfg.endpoint, model: cfg.model });
  }

  function setConfig(key: keyof AppState['config'], value: string | number) {
    dispatch({ type: 'SET_CONFIG', key, value });
  }

  function addFile(file: AppState['files'][0]) {
    dispatch({ type: 'ADD_FILE', file });
  }

  function restoreHistory(file: AppState['files'][0], result: AppState['results'][string]) {
    dispatch({ type: 'RESTORE_HISTORY', file, result });
  }

  function removeFile(id: string) {
    dispatch({ type: 'REMOVE_FILE', id });
  }

  function setActiveFile(id: string) {
    dispatch({ type: 'SET_ACTIVE_FILE', id });
  }

  function setResult(fileId: string, result: AppState['results'][string]) {
    dispatch({ type: 'SET_RESULT', fileId, result });
  }

  function setRunning(running: boolean) {
    dispatch({ type: 'SET_RUNNING', running });
  }

  function setStep(step: number) {
    dispatch({ type: 'SET_STEP', step });
  }

  return { state, setProvider, setConfig, addFile, restoreHistory, removeFile, setActiveFile, setResult, setRunning, setStep };
}
