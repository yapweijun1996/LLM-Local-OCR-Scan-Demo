import type { Provider, ProviderConfig } from '../types';

/**
 * XOR key for encrypting/decrypting the Default Demo API key.
 * See: https://github.com/yapweijun1996/XOR-Cipher-Tool
 */
export const XOR_KEY = '20260515';

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  lmstudio: {
    name: 'LM Studio',
    endpoint: 'http://localhost:1234/v1/chat/completions',
    model: 'allenai/olmocr-2-7b',
    needsKey: false,
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    needsKey: true,
    supportsReasoningEffort: true,   // o-series models: reasoning_effort field
  },
  gemini: {
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash-preview-05-20',
    needsKey: true,
    supportsReasoningEffort: true,   // thinking_config.thinking_budget
    supportsThinkingBudget: true,
  },
  defaultdemo: {
    name: 'Default Demo',
    endpoint: 'https://gpt.yapweijun1996.com/v1/responses',
    model: 'gpt-5.4-mini',
    needsKey: false,
    isResponsesApi: true,
    supportsReasoningEffort: true,   // reasoning.effort in Responses API
    // gw_524fa12f91c74c0aa21d73fbaa7b97a27a7db3b5a6b33708  ← XOR-encrypted below
    encryptedKey:
      '085071109003002001087084003002084015001086006001081000083087002004' +
      '085002001086080087081002083012005081000001081002085087001082007087' +
      '006087002006005000010',
  },
};
