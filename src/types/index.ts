export type Provider = 'lmstudio' | 'openai' | 'gemini' | 'defaultdemo';

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface ProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  needsKey: boolean;
  /** Uses OpenAI Responses API (/v1/responses) instead of Chat Completions */
  isResponsesApi?: boolean;
  /** XOR-encrypted API key (key: XOR_KEY). Auto-injected when apiKey is empty. */
  encryptedKey?: string;
  /** Provider supports a reasoning/thinking effort control (show the UI control). */
  supportsReasoningEffort?: boolean;
  /** Gemini-style: use thinking_config.thinking_budget instead of reasoning_effort. */
  supportsThinkingBudget?: boolean;
}

export interface FileEntry {
  id: string;
  name: string;
  base64: string;
  isBenchmark: boolean;
  fromHistory?: boolean;
}

export interface TableData {
  header: string[];
  rows: Record<string, string>[];
}

export interface MathIssue {
  no: string;
  msg: string;
  suggestedPrice: number;
}

export interface CellResult {
  match: boolean;
  expected: string;
  actual: string | null;
}

export interface RowAccuracy {
  no: string;
  missing: boolean;
  cells: Record<string, CellResult>;
}

export interface AccuracyResult {
  rowsExpected: number;
  rowsGot: number;
  extraRows: number;
  cellsTotal: number;
  cellsMatched: number;
  overallPct: number;
  rowMatchPct: number;
  perRow: RowAccuracy[];
}

export interface ExtractionResult {
  raw: string | null;
  cleaned: TableData | null;
  accuracy: AccuracyResult | null;
  issues: MathIssue[];
  isBenchmark: boolean;
  error?: string;
}

export interface AppState {
  provider: Provider;
  files: FileEntry[];
  activeFileId: string | null;
  results: Record<string, ExtractionResult>;
  running: boolean;
  step: number;
  config: {
    endpoint: string;
    model: string;
    apiKey: string;
    temperature: number;
    reasoningEffort: ReasoningEffort;
  };
}

export interface StoredPreferences {
  provider: Provider;
  config: {
    endpoint: string;
    model: string;
    temperature: number;
    reasoningEffort: ReasoningEffort;
  };
}

export interface HistoryRecord {
  id: string;
  fileName: string;
  provider: Provider;
  providerName: string;
  modelName: string;
  createdAt: string;
  isBenchmark: boolean;
  result: ExtractionResult;
  /** base64 JPEG of the source image. Stored so the thumbnail is visible on restore.
   *  Optional for backward compatibility with records saved before this field existed. */
  base64?: string;
}

export type AppAction =
  | { type: 'SET_PROVIDER'; provider: Provider; endpoint: string; model: string }
  | { type: 'SET_CONFIG'; key: keyof AppState['config']; value: string | number }
  | { type: 'ADD_FILE'; file: FileEntry }
  | { type: 'RESTORE_HISTORY'; file: FileEntry; result: ExtractionResult }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'SET_ACTIVE_FILE'; id: string }
  | { type: 'SET_RESULT'; fileId: string; result: ExtractionResult }
  | { type: 'SET_RUNNING'; running: boolean }
  | { type: 'SET_STEP'; step: number };
