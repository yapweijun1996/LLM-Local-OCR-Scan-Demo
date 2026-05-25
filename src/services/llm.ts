import { PROVIDERS, XOR_KEY } from '../config/providers';
import { xorDecrypt } from './xor';
import type { Provider, ReasoningEffort } from '../types';

const MAX_TOKENS = 4000;
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes — local models can be slow

/** Maps effort level to Gemini thinking_budget token count. */
const THINKING_BUDGET: Record<ReasoningEffort, number> = {
  none: 0,
  low: 2048,
  medium: 8192,
  high: 24576,
};

interface LLMOptions {
  endpoint: string;
  model: string;
  apiKey: string;
  temperature: number;
  base64: string;
  provider?: Provider;
  /** The extraction prompt to send. Callers must supply this — no longer hardcoded here. */
  prompt: string;
  /** Reasoning / thinking effort level. */
  reasoningEffort: ReasoningEffort;
}

/** Build request body for OpenAI Chat Completions (/v1/chat/completions) */
function buildChatBody(model: string, temperature: number, base64: string, prompt: string): Record<string, unknown> {
  return {
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
      ],
    }],
    temperature,
    max_tokens: MAX_TOKENS,
  };
}

/** Build request body for OpenAI Responses API (/v1/responses) */
function buildResponsesBody(model: string, base64: string, prompt: string, effort: ReasoningEffort): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: `data:image/jpeg;base64,${base64}` },
      ],
    }],
    stream: false,
  };
  // Only include reasoning field when effort is not 'none'
  if (effort !== 'none') {
    body.reasoning = { effort };
  }
  return body;
}

/** Extract text from Responses API response shape.
 *
 * The output array may contain a "reasoning" entry (no content) before the
 * actual "message" entry. We find the first entry with type === "message"
 * and extract its first "output_text" content item.
 */
function extractResponsesText(data: unknown): string {
  const d = data as Record<string, unknown>;
  const output = d.output as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(output)) return '';

  // Skip reasoning/other entries — find the message entry
  const msgEntry = output.find(item => item.type === 'message');
  if (!msgEntry) return '';

  const content = msgEntry.content as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(content) || content.length === 0) return '';

  // Prefer output_text, fall back to first item
  const textItem = content.find(c => c.type === 'output_text') ?? content[0];
  return String(textItem?.text ?? '');
}

export async function callLLM({ endpoint, model, apiKey, temperature, base64, provider, prompt, reasoningEffort }: LLMOptions): Promise<string> {
  // Resolve provider config flags
  const cfg = provider ? PROVIDERS[provider] : undefined;
  const isResponsesApi = cfg?.isResponsesApi ?? false;

  // Auto-inject XOR-encrypted key for providers that have one
  let effectiveKey = apiKey;
  if (!effectiveKey && cfg?.encryptedKey) {
    effectiveKey = xorDecrypt(cfg.encryptedKey, XOR_KEY);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (effectiveKey) headers['Authorization'] = `Bearer ${effectiveKey}`;

  // Build base body, then inject provider-specific reasoning/thinking params
  let body: Record<string, unknown>;

  if (isResponsesApi) {
    // OpenAI Responses API: reasoning.effort
    body = buildResponsesBody(model, base64, prompt, reasoningEffort);
  } else {
    body = buildChatBody(model, temperature, base64, prompt);

    if (cfg?.supportsThinkingBudget) {
      // Gemini OpenAI-compat endpoint: thinking_config.thinking_budget
      body.thinking_config = { thinking_budget: THINKING_BUDGET[reasoningEffort] };
    } else if (cfg?.supportsReasoningEffort && reasoningEffort !== 'none') {
      // OpenAI o-series Chat Completions: reasoning_effort
      body.reasoning_effort = reasoningEffort;
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds`, { cause: err });
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();

  if (isResponsesApi) {
    const text = extractResponsesText(data);
    if (!text) throw new Error('Responses API returned empty output — check model or content policy');
    return text;
  }

  const content = (data as Record<string, unknown>);
  const choices = content.choices as Array<Record<string, unknown>> | undefined;
  const text = (choices?.[0]?.message as Record<string, unknown> | undefined)?.content as string | undefined;
  if (!text) throw new Error('LLM returned empty choices — check model, quota, or content policy');
  return text;
}
