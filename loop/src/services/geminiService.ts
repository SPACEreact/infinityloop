import type { Asset, DirectorSuggestion, Project, UsageTotals } from '../types';
import { MASTER_PROMPT } from '../constants';
import { apiConfig, DEFAULT_GEMINI_BASE_URL } from './config';
import { knowledgeBase } from './knowledgeService';

type ProjectAsset = {
  id: string;
  type: string;
  name: string;
  content: string;
  summary?: string;
  tags: string[];
};

const MODEL_NAMESPACE_PREFIX = 'models/';

const DEFAULT_TEXT_MODEL = 'gemini-pro';
const FALLBACK_TEXT_MODEL = 'gemini-pro-vision';

type GeminiModel = {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
  description?: string;
};

type ModelSelection = {
  primary: string | null;
  fallback: string | null;
};

const NETLIFY_FUNCTION_PATH = '/.netlify/functions/gemini-api';

type DirectGeminiEndpoint = {
  type: 'direct';
  baseUrl: string;
  apiKey: string;
};

type ProxyGeminiEndpoint = {
  type: 'proxy';
  baseUrl: string;
};

type GeminiEndpoint = DirectGeminiEndpoint | ProxyGeminiEndpoint;

const TEXT_MODEL_PRIORITY = [
  DEFAULT_TEXT_MODEL,
  FALLBACK_TEXT_MODEL,
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.0-pro',
  'gemini-1.0-pro-001'
];

const MOCK_MODEL_ENTRIES: GeminiModel[] = [
  {
    name: `${MODEL_NAMESPACE_PREFIX}${DEFAULT_TEXT_MODEL}`,
    displayName: 'Gemini Pro',
    description: 'Primary text generation model optimized for high quality story outputs.',
    supportedGenerationMethods: ['generateContent']
  },
  {
    name: `${MODEL_NAMESPACE_PREFIX}${FALLBACK_TEXT_MODEL}`,
    displayName: 'Gemini Pro Vision',
    description: 'Multimodal model suitable for quota-limited environments and vision prompts.',
    supportedGenerationMethods: ['generateContent']
  }
];

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

type ModelCacheEntry = {
  timestamp: number;
  models: GeminiModel[];
};

const modelCatalogCache = new Map<string, ModelCacheEntry>();

const normalizeModelName = (model: string): string =>
  model.startsWith(MODEL_NAMESPACE_PREFIX) ? model : `${MODEL_NAMESPACE_PREFIX}${model}`;

const trimModelNamespace = (model: string): string =>
  model.startsWith(MODEL_NAMESPACE_PREFIX) ? model.slice(MODEL_NAMESPACE_PREFIX.length) : model;

const supportsTextGeneration = (model: GeminiModel): boolean => {
  const methods = (model.supportedGenerationMethods ?? []).map(method => method.toLowerCase());
  return methods.some(method => method.includes('generatecontent') || method.includes('createcontent'));
};

const selectModel = (
  models: GeminiModel[],
  requested?: string | null
): ModelSelection => {
  const availableModels = models.filter(model => supportsTextGeneration(model));

  if (!availableModels.length) {
    return { primary: null, fallback: null };
  }

  const requestedName = requested ? normalizeModelName(requested) : null;
  const priorityList = TEXT_MODEL_PRIORITY;

  const orderedCandidates = [
    ...(requestedName ? [requestedName] : []),
    ...priorityList,
    ...availableModels.map(model => model.name)
  ];

  const seen = new Set<string>();
  const resolved = orderedCandidates.filter(name => {
    const normalized = normalizeModelName(name);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return availableModels.some(model => model.name === normalized);
  });

  const [primary = null, fallback = null] = resolved;
  const trimmedPrimary = primary ? trimModelNamespace(primary) : null;
  const trimmedFallback = fallback ? trimModelNamespace(fallback) : null;

  return {
    primary: trimmedPrimary,
    fallback: trimmedFallback && trimmedFallback === trimmedPrimary ? null : trimmedFallback
  };
};

const getModelCacheKey = (endpoint: GeminiEndpoint): string =>
  endpoint.type === 'direct' ? `direct:${endpoint.apiKey}` : `proxy:${endpoint.baseUrl}`;

const isCacheEntryFresh = (entry: ModelCacheEntry | undefined): boolean =>
  !!entry && Date.now() - entry.timestamp < MODEL_CACHE_TTL_MS;

const fetchModelCatalogDirect = async (endpoint: DirectGeminiEndpoint): Promise<GeminiModel[]> => {
  const baseUrl = endpoint.baseUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/models?key=${encodeURIComponent(endpoint.apiKey)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await parseResponseJson(response, 'Gemini models request');
  return Array.isArray((data as { models?: GeminiModel[] })?.models)
    ? ((data as { models?: GeminiModel[] }).models as GeminiModel[])
    : [];
};

const fetchModelCatalogViaProxy = async (endpoint: ProxyGeminiEndpoint): Promise<GeminiModel[]> => {
  const { payload } = await requestGeminiProxy(
    endpoint,
    'listModels',
    {},
    'Gemini proxy models request'
  );

  if (Array.isArray(payload?.data?.models)) {
    return payload.data.models as GeminiModel[];
  }

  if (Array.isArray(payload?.data)) {
    return payload.data as GeminiModel[];
  }

  return [];
};

const fetchModelCatalogForEndpoint = async (endpoint: GeminiEndpoint): Promise<GeminiModel[]> => {
  const cacheKey = getModelCacheKey(endpoint);
  const cachedEntry = modelCatalogCache.get(cacheKey);
  if (isCacheEntryFresh(cachedEntry)) {
    return cachedEntry!.models;
  }

  const models = endpoint.type === 'proxy'
    ? await fetchModelCatalogViaProxy(endpoint)
    : await fetchModelCatalogDirect(endpoint);

  modelCatalogCache.set(cacheKey, { timestamp: Date.now(), models });
  return models;
};

const resolveModelSelectionForEndpoint = async (
  endpoint: GeminiEndpoint,
  requested?: string | null
): Promise<ModelSelection> => {
  const catalog = await fetchModelCatalogForEndpoint(endpoint);
  return selectModel(catalog, requested);
};

const readEnvString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const resolveProxyBaseUrl = (configuredBaseUrl?: string): string | null => {
  const envProxyRaw = (import.meta.env.VITE_GEMINI_PROXY_URL ?? '') as string | undefined;
  const envProxy = readEnvString(envProxyRaw);

  if (envProxy) {
    return envProxy;
  }

  const normalizedConfigured = readEnvString(configuredBaseUrl);
  if (normalizedConfigured && !normalizedConfigured.includes('generativelanguage.googleapis.com')) {
    return normalizedConfigured;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname ?? '';
    if (hostname && (hostname.endsWith('.netlify.app') || hostname.endsWith('.netlify.dev'))) {
      return NETLIFY_FUNCTION_PATH;
    }
  }

  return null;
};

const getGeminiEndpoint = (): GeminiEndpoint | null => {
  const config = apiConfig.getConfigByName('gemini');
  const apiKey = readEnvString(config?.apiKey);
  const configuredBase = readEnvString(config?.baseUrl);

  if (apiKey) {
    const normalizedBase = (configuredBase || DEFAULT_GEMINI_BASE_URL).replace(/\/$/, '');
    return {
      type: 'direct',
      baseUrl: normalizedBase || DEFAULT_GEMINI_BASE_URL,
      apiKey,
    };
  }

  const proxyBaseUrl = resolveProxyBaseUrl(configuredBase);
  if (!proxyBaseUrl) {
    return null;
  }

  return {
    type: 'proxy',
    baseUrl: proxyBaseUrl.replace(/\/$/, ''),
  };
};

export const isMockMode = !getGeminiEndpoint();

export interface GeminiResult<T> {
  data: T | null;
  error: string | null;
  isMock: boolean;
  usage?: UsageTotals;
}

const ZERO_USAGE: UsageTotals = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

const sanitizeUsageTotals = (usage?: UsageTotals | null): UsageTotals | undefined => {
  if (!usage) {
    return undefined;
  }

  const prompt = Number.isFinite(usage.promptTokens)
    ? Math.max(0, Math.round(usage.promptTokens))
    : 0;
  const completion = Number.isFinite(usage.completionTokens)
    ? Math.max(0, Math.round(usage.completionTokens))
    : 0;

  const total = Number.isFinite(usage.totalTokens)
    ? Math.max(0, Math.round(usage.totalTokens))
    : prompt + completion;

  if (!prompt && !completion && !total) {
    return ZERO_USAGE;
  }

  return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
};

const createResult = <T>(
  data: T | null,
  error: string | null,
  isMock: boolean,
  usage?: UsageTotals | null
): GeminiResult<T> => ({
  data,
  error,
  isMock,
  usage: sanitizeUsageTotals(usage)
});

const coerceNumeric = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'object' && value !== null) {
    const candidateTokens =
      (value as { tokens?: unknown }).tokens ??
      (value as { tokenCount?: unknown }).tokenCount ??
      (value as { value?: unknown }).value ??
      (value as { amount?: unknown }).amount;

    if (candidateTokens !== undefined) {
      return coerceNumeric(candidateTokens);
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const result = coerceNumeric(item);
        if (result !== undefined) {
          return result;
        }
      }
    }
  }

  return undefined;
};

const buildUsageFromNumbers = (
  prompt?: number,
  completion?: number,
  total?: number
): UsageTotals | undefined => {
  const normalizedPrompt = prompt ?? (total !== undefined ? total : undefined);
  let normalizedCompletion = completion;

  if (normalizedPrompt !== undefined && total !== undefined) {
    const derivedCompletion = total - normalizedPrompt;
    if (Number.isFinite(derivedCompletion)) {
      normalizedCompletion = Math.max(0, Math.round(derivedCompletion));
    }
  }

  if (normalizedCompletion === undefined && total !== undefined && normalizedPrompt === undefined) {
    normalizedCompletion = Math.max(0, Math.round(total));
  }

  if (normalizedPrompt === undefined && normalizedCompletion === undefined) {
    return undefined;
  }

  return sanitizeUsageTotals({
    promptTokens: normalizedPrompt ?? 0,
    completionTokens: normalizedCompletion ?? 0
  });
};

const parseUsageObject = (candidate: unknown): UsageTotals | undefined => {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const promptCandidates = [
    'promptTokens',
    'promptTokenCount',
    'prompt_token_count',
    'prompt_tokens',
    'inputTokens',
    'inputTokenCount',
    'input_token_count',
    'input_tokens',
    'totalPromptTokens',
    'promptTotalTokens'
  ];

  const completionCandidates = [
    'completionTokens',
    'completionTokenCount',
    'completion_token_count',
    'completion_tokens',
    'outputTokens',
    'outputTokenCount',
    'output_token_count',
    'output_tokens',
    'candidatesTokenCount',
    'candidates_tokens',
    'candidatesTotalTokens'
  ];

  const totalCandidates = [
    'totalTokenCount',
    'totalTokens',
    'total_tokens',
    'totalTokenUsage',
    'total_token_count',
    'total',
    'tokenCount'
  ];

  const resolveFromKeyList = (keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = (candidate as Record<string, unknown>)[key];
      const numeric = coerceNumeric(value);
      if (numeric !== undefined) {
        return numeric;
      }
      if (value && typeof value === 'object') {
        const nestedNumeric = coerceNumeric((value as { count?: unknown }).count);
        if (nestedNumeric !== undefined) {
          return nestedNumeric;
        }
      }
    }
    return undefined;
  };

  const prompt = resolveFromKeyList(promptCandidates);
  const completion = resolveFromKeyList(completionCandidates);
  const total = resolveFromKeyList(totalCandidates);

  const promptObject = (candidate as { prompt?: unknown }).prompt;
  const completionObject = (candidate as { completion?: unknown }).completion;

  const promptFromObject = coerceNumeric(promptObject);
  const completionFromObject = coerceNumeric(completionObject);

  return (
    buildUsageFromNumbers(
      prompt ?? promptFromObject,
      completion ?? completionFromObject,
      total
    ) ?? undefined
  );
};

const parseUsageTree = (
  value: unknown,
  seen: Set<object>
): UsageTotals | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const reference = value as object;
  if (seen.has(reference)) {
    return undefined;
  }
  seen.add(reference);

  const direct = parseUsageObject(value);
  if (direct) {
    return direct;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseUsageTree(item, seen);
      if (parsed) {
        return parsed;
      }
    }
    return undefined;
  }

  const nestedKeys = [
    'usageMetadata',
    'usage',
    'tokenUsage',
    'usageData',
    'usage_data',
    'metadata',
    'data',
    'result',
    'response',
    'extra',
    'billing',
    'tokens',
    'candidates'
  ];

  for (const key of nestedKeys) {
    const nested = (value as Record<string, unknown>)[key];
    if (!nested) {
      continue;
    }

    if (Array.isArray(nested)) {
      for (const item of nested) {
        const parsed = parseUsageTree(item, seen);
        if (parsed) {
          return parsed;
        }
      }
    } else if (typeof nested === 'object') {
      const parsed = parseUsageTree(nested, seen);
      if (parsed) {
        return parsed;
      }
    }
  }

  return undefined;
};

const extractUsageFromPayload = (payload: unknown): UsageTotals | undefined =>
  parseUsageTree(payload, new Set<object>());

const extractUsageFromHeaders = (headers?: Headers | null): UsageTotals | undefined => {
  if (!headers) {
    return undefined;
  }

  const promptHeaderCandidates = [
    'x-usage-prompt-tokens',
    'x-prompt-tokens',
    'x-token-usage-prompt',
    'x-google-usage-prompt-tokens'
  ];

  const completionHeaderCandidates = [
    'x-usage-completion-tokens',
    'x-completion-tokens',
    'x-token-usage-completion',
    'x-google-usage-completion-tokens'
  ];

  const totalHeaderCandidates = [
    'x-usage-total-tokens',
    'x-total-tokens',
    'x-token-usage-total',
    'x-google-usage-total-tokens'
  ];

  const readHeaderValue = (names: string[]): number | undefined => {
    for (const name of names) {
      const raw = headers.get(name);
      if (raw) {
        const numeric = coerceNumeric(raw);
        if (numeric !== undefined) {
          return numeric;
        }
      }
    }
    return undefined;
  };

  return buildUsageFromNumbers(
    readHeaderValue(promptHeaderCandidates),
    readHeaderValue(completionHeaderCandidates),
    readHeaderValue(totalHeaderCandidates)
  );
};

const resolveUsage = (
  ...sources: Array<UsageTotals | undefined>
): UsageTotals | undefined => {
  for (const source of sources) {
    const sanitized = sanitizeUsageTotals(source);
    if (sanitized) {
      return sanitized;
    }
  }
  return undefined;
};

const parseResponseJson = async (response: Response, requestDescription: string): Promise<any> => {
  const rawText = await response.text();
  let parsed: any;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const message = `${requestDescription} failed: ${response.status} ${response.statusText}${rawText ? ` - ${rawText}` : ''}`;
    const error = new Error(message);
    (error as { status?: number }).status = response.status;
    if (parsed && typeof parsed === 'object') {
      (error as { error?: unknown }).error = parsed;
    }
    throw error;
  }

  if (parsed === undefined) {
    if (!rawText.trim()) {
      return {};
    }
    throw new Error(`${requestDescription} returned an unexpected response format.`);
  }

  return parsed;
};

const shouldUseFallbackModel = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  if (message.includes('quota') && (message.includes('exceeded') || message.includes('exhausted'))) {
    return true;
  }

  if (message.includes('permission denied') || message.includes('not found')) {
    return true;
  }

  const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
  if (status === 429 || status === 403 || status === 404) {
    return true;
  }

  const payload = typeof error === 'object' && error ? (error as { error?: { status?: string; code?: number } }).error : undefined;
  if (payload) {
    const payloadStatus = payload.status?.toLowerCase();
    if (payloadStatus && (payloadStatus.includes('resource_exhausted') || payloadStatus.includes('permission_denied') || payloadStatus.includes('not_found'))) {
      return true;
    }

    if (typeof payload.code === 'number' && (payload.code === 429 || payload.code === 403 || payload.code === 404)) {
      return true;
    }
  }

  return false;
};

const extractTextFromResponse = (data: any): string => {
  const candidates = data?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        const combined = parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .filter(Boolean)
          .join('\n')
          .trim();
        if (combined) {
          return combined;
        }
      }
      const text = typeof candidate?.content?.text === 'string' ? candidate.content.text.trim() : '';
      if (text) {
        return text;
      }
    }
  }

  if (typeof data?.text === 'string' && data.text.trim()) {
    return data.text.trim();
  }

  throw new Error('No text content returned from model');
};

type GeminiProxyAction = 'generateContent' | 'listModels';

type GeminiProxyResult<T = any> = {
  payload: T;
  usage?: UsageTotals;
};

const requestGeminiProxy = async (
  endpoint: ProxyGeminiEndpoint,
  action: GeminiProxyAction,
  payload: Record<string, unknown>,
  description: string
): Promise<GeminiProxyResult<any>> => {
  const response = await fetch(endpoint.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await parseResponseJson(response, description);

  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    const errorMessage =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error?: string }).error
        : `${description} failed.`;
    throw new Error(errorMessage);
  }

  const usage = resolveUsage(
    extractUsageFromPayload(data),
    extractUsageFromHeaders(response.headers)
  );

  return { payload: data, usage };
};

const requestGeminiContentDirect = async (
  endpoint: DirectGeminiEndpoint,
  prompt: string,
  model: string
): Promise<{ text: string; usage?: UsageTotals }> => {
  const normalizedBase = endpoint.baseUrl.replace(/\/$/, '');
  const normalizedModel = normalizeModelName(model);
  const url = `${normalizedBase}/${normalizedModel}:generateContent?key=${encodeURIComponent(endpoint.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  const data = await parseResponseJson(response, 'Gemini text request');
  const usage = resolveUsage(
    extractUsageFromPayload(data),
    extractUsageFromHeaders(response.headers)
  );

  return { text: extractTextFromResponse(data), usage };
};

const requestTextWithFallback = async (
  prompt: string,
  preferredModel: string = DEFAULT_TEXT_MODEL,
  retryCount: number = 3
): Promise<{ text: string; modelUsed: string; usedFallback: boolean; usage?: UsageTotals }> => {
  const endpoint = getGeminiEndpoint();
  if (!endpoint) {
    throw new Error('Gemini API key is not configured');
  }

  const selection = await resolveModelSelectionForEndpoint(endpoint, preferredModel);
  if (!selection.primary) {
    throw new Error('No text generation models available for this API key.');
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (endpoint.type === 'proxy') {
        const proxyResponse = await requestGeminiProxy(
          endpoint,
          'generateContent',
          { prompt, model: selection.primary },
          'Gemini proxy text request'
        );

        const payload = proxyResponse.payload ?? {};
        const payloadData = (payload as { data?: unknown }).data;
        const textSource =
          typeof payloadData === 'string'
            ? payloadData
            : typeof payload === 'string'
              ? (payload as string)
              : typeof (payload as { text?: unknown }).text === 'string'
                ? (payload as { text: string }).text
                : '';

        const text = typeof textSource === 'string' ? textSource.trim() : '';
        if (!text) {
          throw new Error('Gemini proxy text request returned no data');
        }

        const modelUsed = typeof (payload as { modelUsed?: unknown }).modelUsed === 'string'
          ? (payload as { modelUsed: string }).modelUsed
          : selection.primary;
        const usedFallback = typeof (payload as { usedFallback?: unknown }).usedFallback === 'boolean'
          ? (payload as { usedFallback: boolean }).usedFallback
          : false;

        const usage = resolveUsage(
          proxyResponse.usage,
          extractUsageFromPayload(payload),
          extractUsageFromPayload(payloadData)
        );

        return { text, modelUsed, usedFallback, usage };
      }

      try {
        const { text, usage } = await requestGeminiContentDirect(endpoint, prompt, selection.primary);
        return { text, modelUsed: selection.primary, usedFallback: false, usage };
      } catch (error) {
        if (!shouldUseFallbackModel(error) || !selection.fallback || selection.fallback === selection.primary) {
          throw error;
        }

        const { text: fallbackText, usage } = await requestGeminiContentDirect(endpoint, prompt, selection.fallback);
        return { text: fallbackText, modelUsed: selection.fallback, usedFallback: true, usage };
      }
    } catch (error) {
      lastError = error;
      
      // Check if it's a configuration issue first
      if (isConfigurationError(error)) {
        console.error('API configuration error:', error);
        throw error;
      }
      
      // If it's a network error or timeout, retry with exponential backoff
      if (attempt < retryCount && isRetryableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`Network error, retrying in ${delay}ms... (${attempt + 1}/${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's a quota/permission error and we have more attempts, wait longer
      if (attempt < retryCount && shouldUseFallbackModel(error)) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
        console.warn(`API quota/permission error, retrying in ${delay}ms... (${attempt + 1}/${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Log the error for debugging
      console.error(`API request failed on attempt ${attempt + 1}:`, error);
      
      throw error;
    }
  }

  throw lastError || new Error('Max retry attempts exceeded');
};

const isRetryableError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  // Network errors
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return true;
  }

  // HTTP status codes that are retryable
  const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  return false;
};

const isConfigurationError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  // API key configuration errors
  if (message.includes('api key') && message.includes('not configured')) {
    return true;
  }
  
  // Authentication errors that won't be fixed by retrying
  if (message.includes('authentication failed') || message.includes('invalid api key')) {
    return true;
  }
  
  // HTTP status codes that indicate configuration issues
  const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
  if (status === 401) {
    return true;
  }

  return false;
};

// Smarter prompt optimization for reduced quota usage while maintaining quality
const MAX_EFFECTIVE_PROMPT_LENGTH = 15000; // Significantly reduced to save tokens
const MAX_CONVERSATION_CONTEXT = 3000; // Limit conversation history
const MAX_KNOWLEDGE_CONTEXT = 8000; // Limit knowledge base context
const CORE_KNOWLEDGE_PRIORITY = [
  'Story Structures',
  'Film Techniques', 
  'Camera Movements and Techniques'
];

const truncateConversationHistory = (
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxLength: number
): string[] => {
  if (!history.length || maxLength <= 0) {
    return [];
  }

  const collected: string[] = [];
  let totalLength = 0;
  let truncated = false;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];
    const formatted = `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`;
    const addition = formatted.length + (collected.length ? 1 : 0);

    if (totalLength + addition > maxLength) {
      truncated = true;
      break;
    }

    collected.push(formatted);
    totalLength += addition;
  }

  collected.reverse();

  if (!truncated) {
    return collected;
  }

  const indicator = '[Earlier context truncated]';
  let indicatorBlock = indicator;

  if (indicatorBlock.length > maxLength) {
    indicatorBlock = indicatorBlock.slice(0, maxLength);
    return [indicatorBlock];
  }

  const resultWithIndicator = [indicatorBlock, ...collected];

  while (resultWithIndicator.join('\n').length > maxLength && resultWithIndicator.length > 1) {
    resultWithIndicator.splice(1, 1);
  }

  if (resultWithIndicator.join('\n').length > maxLength) {
    return [indicatorBlock.slice(0, maxLength)];
  }

  return resultWithIndicator;
};

const validateAndOptimizePrompt = (fullPrompt: string): string => {
  if (fullPrompt.length <= MAX_EFFECTIVE_PROMPT_LENGTH) {
    return fullPrompt;
  }
  
  // Aggressively truncate to fit within quota limits
  const truncated = fullPrompt.substring(0, MAX_EFFECTIVE_PROMPT_LENGTH - 100);
  const lastCompleteSection = truncated.lastIndexOf('\n\n');
  
  return lastCompleteSection > MAX_EFFECTIVE_PROMPT_LENGTH * 0.7 
    ? truncated.substring(0, lastCompleteSection) + '\n\n[Context truncated for quota efficiency]'
    : truncated + '\n[Context truncated for quota efficiency]';
};

const getOptimizedKnowledgeContext = (outputType?: string, tagWeights?: Record<string, number>): string => {
  // Use compact knowledge context for maximum quota efficiency  
  const coreKnowledge = knowledgeBase.getCompactContext();
  
  // Add minimal context-specific guidance
  let specificContext = '';
  if (outputType?.toLowerCase().includes('story')) {
    specificContext = '→ Focus: Character psychology, Want vs Need conflict\n';
  } else if (outputType?.toLowerCase().includes('image') || outputType?.toLowerCase().includes('visual')) {
    specificContext = '→ Focus: Visual composition, lighting mood, cinematic framing\n';
  }
  
  const fullContext = coreKnowledge + specificContext;
  
  // Ensure we stay within strict limits for quota preservation
  return fullContext.length > MAX_KNOWLEDGE_CONTEXT 
    ? fullContext.substring(0, MAX_KNOWLEDGE_CONTEXT - 50) + '...\n'
    : fullContext;
};

const KNOWLEDGE_CONTEXT = getOptimizedKnowledgeContext();

const LOOP_SIGNATURE = 'Loop Studio Mock Feed';

const TAG_WEIGHT_THRESHOLD = 0;

const prominentTags = (tagWeights: Record<string, number>) =>
  Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, weight]) => `${tag} (${Math.round(weight * 100)}%)`)
    .join(', ');

const ASSET_PROMPT_TAG_LIMIT = 4;
const ASSET_PROMPT_PREVIEW_LENGTH = 220;

type PromptConversion = {
  id: string;
  aliases?: string[];
  displayName: string;
  promptFormat: string;
  notes?: string;
};

const PROMPT_CONVERSION_TABLE: PromptConversion[] = [
  {
    id: 'midjourney',
    aliases: ['midjourney-v6', 'mj', 'midjourney-v5'],
    displayName: 'Midjourney',
    promptFormat: 'subject, medium, lighting, mood, composition, stylers',
    notes: 'Use :: to weight concepts and --ar for aspect ratio tweaks when relevant.'
  },
  {
    id: 'sora',
    aliases: ['openai-sora', 'sora-1'],
    displayName: 'Sora',
    promptFormat: 'subject • camera move • setting • lighting • mood • format',
    notes: 'Keep prompts under 400 characters and emphasise temporal beats when describing motion.'
  },
  {
    id: 'runway',
    aliases: ['runway-gen2', 'runwayml'],
    displayName: 'Runway Gen-2',
    promptFormat: 'subject, action, environment, cinematic style, lighting, color grade',
    notes: 'Short sentences separated by commas work best. Reference aspect ratio if critical.'
  },
  {
    id: 'stable-diffusion',
    aliases: ['sdxl', 'stability-ai', 'stable-diffusion-xl'],
    displayName: 'Stable Diffusion XL',
    promptFormat: 'subject, detailed descriptors, art style, lighting, color palette, lens info',
    notes: 'Avoid negative phrases; use balanced commas and include desired guidance scale if needed.'
  }
];

const getPromptConversion = (targetModel?: string | null): PromptConversion | null => {
  if (!targetModel) {
    return null;
  }

  const normalized = targetModel.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const match = PROMPT_CONVERSION_TABLE.find(entry => {
    if (entry.id === normalized) {
      return true;
    }
    if (!entry.aliases) {
      return false;
    }
    return entry.aliases.some(alias => alias === normalized);
  });

  return match ?? null;
};

const cleanWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

const truncateWithEllipsis = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const formatAssetsForPrompt = (assets?: Asset[] | null): string => {
  if (!assets || assets.length === 0) {
    return 'No assets captured yet.';
  }

  return assets
    .slice(0, 8)
    .map(asset => {
      const normalizedName = asset.name?.trim() || 'Untitled Asset';
      const typeLabel = asset.type?.toUpperCase() || 'ASSET';
      const tags = (asset.tags || []).filter(Boolean);
      const tagPreview = tags.length ? tags.slice(0, ASSET_PROMPT_TAG_LIMIT).join(', ') : 'no tags';
      const previewSource = cleanWhitespace(asset.summary || asset.content || '');
      const preview = previewSource
        ? truncateWithEllipsis(previewSource, ASSET_PROMPT_PREVIEW_LENGTH)
        : 'No narrative captured yet.';
      const lineage = Array.isArray(asset.lineage) && asset.lineage.length
        ? ` | lineage: ${asset.lineage.join(' → ')}`
        : '';

      return `${typeLabel}: ${normalizedName} | seed: ${asset.seedId} | tags: ${tagPreview} | preview: ${preview}${lineage}`;
    })
    .join('\n');
};

const formatAssetPromptSummary = (asset: ProjectAsset): string => {
  const normalizedTags = (asset.tags || []).filter(Boolean);
  const tagPreview = normalizedTags.length
    ? normalizedTags.slice(0, ASSET_PROMPT_TAG_LIMIT).join(', ')
    : 'no tags';

  const contentSource = asset.summary?.trim() ? 'Summary' : 'Content';
  const baseText = cleanWhitespace(asset.summary || asset.content || '');
  const previewText = baseText
    ? truncateWithEllipsis(baseText, ASSET_PROMPT_PREVIEW_LENGTH)
    : 'No narrative captured yet.';

  return `• ${asset.name} [${asset.type}] — tags: ${tagPreview} — ${contentSource}: ${previewText}`;
};

const isDevelopmentEnv = (): boolean => {
  if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
    return true;
  }

  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return Boolean(meta?.env?.DEV);
};

const createMockChatResponse = (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  tagWeights: Record<string, number>,
  styleRigidity: number
): string => {
  const lastAssistantBeat = [...conversationHistory].reverse().find(msg => msg.role === 'assistant');
  const tagSummary = prominentTags(tagWeights);
  const tone = styleRigidity > 50 ? 'precise and director-level exacting' : 'playful and exploratory';

  return [
    '🎬 **Loop Sandbox (Mock Mode)**',
    'The Gemini API key is missing, so you are exploring a simulated conversation trail.',
    lastAssistantBeat
      ? `Last note I dropped: _"${lastAssistantBeat.content.slice(0, 120)}${lastAssistantBeat.content.length > 120 ? '…' : ''}"_`
      : 'This is our first beat together in the sandbox.',
    `Your latest cue: “${userMessage}”`,
    tagSummary ? `Creative gravity is orbiting **${tagSummary}**.` : 'No weighted tags yet, so I am freestyling within Loop’s cinematic instincts.',
    `I will keep the vibe ${tone}.`,
    '',
    'Here’s a Loop-flavored sketch you can riff on:',
    '• Snapshot the emotional tone in one sentence.',
    '• Suggest a cinematography move that matches the beat.',
    '• Offer a micro-task the director could try next.',
    '',
    '_This answer is synthesized offline by Loop for quick iteration._'
  ].join('\n');
};

const summarizeAssets = (project: {
  assets: ProjectAsset[];
}) => {
  if (!project.assets?.length) return 'No assets pinned yet—this build starts from a clean slate.';
  return project.assets
    .slice(0, 4)
    .map(asset => `• **${asset.name}** (${asset.type}) — tags: ${asset.tags.join(', ') || 'none'}`)
    .join('\n');
};

const createMockWorkspaceResponse = (
  project: {
    assets: ProjectAsset[];
  },
  outputType: string,
  tagWeights: Record<string, number>,
  styleRigidity: number
): string => {
  const tagSummary = prominentTags(tagWeights);
  const controlNote = styleRigidity > 50 ? 'tight blocking and continuity-first pacing.' : 'improvised beats and texture-forward imagery.';

  return [
    `🎞️ **${LOOP_SIGNATURE} — ${outputType.toUpperCase()} Mock Output**`,
    'Gemini is offline, so Loop is sketching a placeholder deliverable.',
    '',
    'Project Snapshot:',
    summarizeAssets(project),
    tagSummary ? `Weighted focus: ${tagSummary}.` : 'No weighted tags supplied.',
    `Style dial suggests ${controlNote}`,
    '',
    'What you get in this mock:',
    '1. A logline-style framing of the current material.',
    '2. A visual or narrative flourish inspired by Loop’s knowledge base.',
    '3. A next-step action so you can move the story or design forward.',
    '',
    '_Swap in a Gemini API key to replace this with live generations._'
  ].join('\n');
};

const createMockBuildResponse = (
  buildType: string,
  answers: Record<string, string>,
  sandboxContext: Record<string, string>
): string => {
  const answeredKeys = Object.keys(answers || {});
  const contextKeys = Object.keys(sandboxContext || {});

  return [
    `🧪 **${LOOP_SIGNATURE} — ${buildType.toUpperCase()} Mock Build**`,
    'The build system is in rehearsal mode because Gemini credentials are offline.',
    answeredKeys.length
      ? `Captured answers: ${answeredKeys.slice(0, 5).join(', ')}${answeredKeys.length > 5 ? ', …' : ''}`
      : 'No structured answers recorded for this build yet.',
    contextKeys.length
      ? `Sandbox context cues: ${contextKeys.slice(0, 5).join(', ')}${contextKeys.length > 5 ? ', …' : ''}`
      : 'Sandbox context is empty—perfect for quick sketching.',
    '',
    'Mock deliverable outline:',
    '• Reiterate the core intent of this build.',
    '• Offer a cinematic or storytelling beat to explore.',
    '• Suggest how to translate the idea into the next tangible asset.',
    '',
    '_Enable Gemini to replace this with real-time builds._'
  ].join('\n');
};

const generateSuggestionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `suggestion-${Math.random().toString(36).slice(2, 10)}`;
};

const createMockDirectorAdvice = (project: Project): DirectorSuggestion[] => {
  const assetsById = new Map(project.assets.map(asset => [asset.id, asset] as const));
  const storyBlocks = project.primaryTimeline.folders?.story ?? [];
  const imageBlocks = project.primaryTimeline.folders?.image ?? [];

  const storyAsset = storyBlocks.length
    ? assetsById.get(storyBlocks[0].assetId)
    : undefined;
  const imageAsset = imageBlocks.length
    ? assetsById.get(imageBlocks[0].assetId)
    : undefined;
  const masterAsset = project.secondaryTimeline?.masterAssets?.[0];
  const styledShot = project.thirdTimeline?.styledShots?.[0];

  const focalAsset = storyAsset ?? masterAsset ?? imageAsset ?? styledShot;
  const focalName = focalAsset?.name ?? project.name ?? 'your project';
  const timestamp = new Date();

  const suggestions: DirectorSuggestion[] = [
    {
      id: generateSuggestionId(),
      type: 'addition',
      description: `Add an establishing beat to ground "${focalName}" before the conflict escalates.`,
      advice:
        'Open with a wide or overhead angle that telegraphs tone and geography, then cut into the inciting action.',
      targetAssetId: storyAsset?.id ?? masterAsset?.id ?? styledShot?.id,
      targetAssetName: storyAsset?.name ?? masterAsset?.name ?? styledShot?.name,
      accepted: false,
      createdAt: timestamp
    },
    {
      id: generateSuggestionId(),
      type: 'edit',
      description: 'Tighten the midpoint exchange to keep momentum high.',
      advice: 'Trim redundant dialogue and let a reaction shot breathe for two beats before the reversal lands.',
      targetAssetId: storyAsset?.id ?? imageAsset?.id,
      targetAssetName: storyAsset?.name ?? imageAsset?.name,
      accepted: false,
      createdAt: timestamp
    },
    {
      id: generateSuggestionId(),
      type: 'color_grading',
      description: 'Warm the climax beat to emphasize emotional release.',
      advice: 'Introduce a golden-hour lift on the hero shot and balance it with a cooler rim-light on supporting characters.',
      targetAssetId: styledShot?.id ?? imageAsset?.id,
      targetAssetName: styledShot?.name ?? imageAsset?.name,
      accepted: false,
      createdAt: timestamp
    },
    {
      id: generateSuggestionId(),
      type: 'transition',
      description: 'Bridge the final two scenes with a motivated match cut.',
      advice:
        'Match a gesture or prop between the closing shot of scene two and the opener of scene three to signal thematic continuity.',
      targetAssetId: styledShot?.id ?? storyAsset?.id,
      targetAssetName: styledShot?.name ?? storyAsset?.name,
      accepted: false,
      createdAt: timestamp
    }
  ];

  return suggestions;
};

type RawDirectorSuggestion = {
  id?: string;
  type?: string;
  summary?: string;
  description?: string;
  advice?: string;
  note?: string;
  targetAssetId?: string;
  target_asset_id?: string;
  targetAssetName?: string;
  target_asset_name?: string;
  accepted?: boolean;
};

const extractJsonPayload = (text: string): string | null => {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]?.trim()) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

function parseDirectorAdviceFallback(text: string): RawDirectorSuggestion[] {
  if (!text) {
    return [];
  }

  const sanitizedLines = text
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const suggestions: RawDirectorSuggestion[] = [];
  let current: RawDirectorSuggestion | null = null;

  const commitCurrent = () => {
    if (current && current.description) {
      const committed: RawDirectorSuggestion = {
        ...current,
        advice: current.advice?.trim(),
      };
      suggestions.push(committed);
    }
    current = null;
  };

  sanitizedLines.forEach(line => {
    const withoutBullet = line.replace(/^[-•*]+\s*/, '').replace(/^[0-9]+[.)]\s*/, '').trim();
    if (!withoutBullet) {
      return;
    }

    const typeMatch = withoutBullet.match(/^(addition|removal|edit|transition|color\s*grading|color\s*correction|note|tip)\s*[:\-]\s*(.+)$/i);
    if (typeMatch) {
      commitCurrent();
      const [, rawType, rest] = typeMatch;
      current = {
        description: rest.trim(),
        type: normalizeSuggestionType(rawType),
      };
      return;
    }

    if (!current) {
      current = { description: withoutBullet };
      return;
    }

    current.advice = current.advice ? `${current.advice} ${withoutBullet}` : withoutBullet;
  });

  commitCurrent();

  return suggestions;
}

const parseDirectorAdviceResponse = (text: string): RawDirectorSuggestion[] => {
  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return parseDirectorAdviceFallback(text);
  }

  const tryParse = (value: string): unknown => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const parsed = tryParse(candidate) ?? tryParse(candidate.replace(/```/g, ''));
  if (!parsed) {
    return parseDirectorAdviceFallback(candidate);
  }

  if (Array.isArray(parsed)) {
    const arrayResult = parsed as RawDirectorSuggestion[];
    return arrayResult.length ? arrayResult : parseDirectorAdviceFallback(candidate);
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const suggestions = (parsed as { suggestions?: unknown }).suggestions;
    if (Array.isArray(suggestions)) {
      const suggestionArray = suggestions as RawDirectorSuggestion[];
      return suggestionArray.length ? suggestionArray : parseDirectorAdviceFallback(candidate);
    }

    const dataArray = (parsed as { data?: unknown }).data;
    if (Array.isArray(dataArray)) {
      const extracted = dataArray as RawDirectorSuggestion[];
      return extracted.length ? extracted : parseDirectorAdviceFallback(candidate);
    }
  }

  return parseDirectorAdviceFallback(candidate);
};

const normalizeSuggestionType = (value: unknown): DirectorSuggestion['type'] => {
  if (typeof value !== 'string') {
    return 'other';
  }

  const normalized = value.toLowerCase().replace(/[^a-z_]+/g, ' ').trim();
  const directMatch = normalized.replace(/\s+/g, '_');

  const allowed: DirectorSuggestion['type'][] = [
    'addition',
    'removal',
    'edit',
    'color_grading',
    'transition',
    'other'
  ];

  if (allowed.includes(directMatch as DirectorSuggestion['type'])) {
    return directMatch as DirectorSuggestion['type'];
  }

  if (normalized.includes('add')) {
    return 'addition';
  }
  if (normalized.includes('remov') || normalized.includes('delete')) {
    return 'removal';
  }
  if (normalized.includes('color')) {
    return 'color_grading';
  }
  if (normalized.includes('transition')) {
    return 'transition';
  }
  if (normalized.includes('edit') || normalized.includes('revision') || normalized.includes('revise')) {
    return 'edit';
  }

  return 'other';
};


// Mock function for sandbox chat responses
export const listModels = async (): Promise<any> => {
  const endpoint = getGeminiEndpoint();
  if (!endpoint) {
    return { models: MOCK_MODEL_ENTRIES, isMock: true };
  }

  try {
    const models = await fetchModelCatalogForEndpoint(endpoint);
    return { models, isMock: false };
  } catch (error: unknown) {
    console.error('ListModels API Error:', error);
    return { models: MOCK_MODEL_ENTRIES, isMock: true };
  }
};

export const generateSandboxResponse = async (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  tagWeights: Record<string, number>,
  styleRigidity: number
): Promise<GeminiResult<string>> => {
  const optimizedKnowledgeContext = getOptimizedKnowledgeContext('chat', tagWeights);
  
  // Check for repetitive patterns in recent conversation
  const recentAssistantResponses = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .slice(-3) // Last 3 assistant responses
    .map(msg => msg.content.toLowerCase());
    
  const isRepetitive = recentAssistantResponses.length >= 2 && 
    recentAssistantResponses.some((response, index) => 
      index > 0 && response.includes(recentAssistantResponses[index - 1].slice(0, 50))
    );
    
  // Simplified system prompt for quota efficiency
  let systemPrompt = `You are Loop, an expert filmmaker and storyteller. ${optimizedKnowledgeContext}`;

  const weightedTags = Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .slice(0, 3) // Limit to top 3 tags only
    .map(([tag]) => tag)
    .join(', ');
  if (weightedTags) {
    systemPrompt += `\nKey focus: ${weightedTags}. `;
  }
  systemPrompt += styleRigidity > 50 ? 'Be precise.' : 'Be creative.';
  
  // Add anti-repetition instruction if needed
  if (isRepetitive) {
    systemPrompt += '\nIMPORTANT: Avoid repeating previous responses. Provide fresh, varied perspectives and avoid similar phrasing or concepts you\'ve used recently.';
  }

  // Aggressively limit conversation history for quota efficiency
  const optimizedHistoryBlocks = truncateConversationHistory(conversationHistory, MAX_CONVERSATION_CONTEXT);
  const optimizedHistoryText = optimizedHistoryBlocks.join('\n');

  const fullPrompt = validateAndOptimizePrompt(
    `${systemPrompt}\n\nConversation History:\n${optimizedHistoryText}\n\nUser: ${userMessage}\nAssistant:`
  );

  try {
    const { text, usage } = await requestTextWithFallback(fullPrompt);
    
    // Check if the response is too similar to recent responses
    const normalizedResponse = text.toLowerCase().slice(0, 100);
    if (isRepetitive && recentAssistantResponses.some(recent => 
      recent.slice(0, 50) === normalizedResponse.slice(0, 50)
    )) {
      // Force a more diverse response by adding variation prompt
      const variationPrompt = `${systemPrompt}\nPrevious responses were: ${recentAssistantResponses.join(' | ')}\nUser: ${userMessage}\nProvide a completely different perspective or approach. Be creative and avoid repeating earlier responses:\nAssistant:`;
      const { text: variationText, usage: variationUsage } = await requestTextWithFallback(variationPrompt);
      return createResult(variationText, null, false, variationUsage);
    }
    
    return createResult(text, null, false, usage);
  } catch (error: unknown) {
    console.warn('Gemini chat generation failed, falling back to mock mode:', error);
    return createResult(createMockChatResponse(userMessage, conversationHistory, tagWeights, styleRigidity), null, true);
  }
};

export const generateFromWorkspace = async (
  project: {
    assets: ProjectAsset[];
    canvas: {
      nodes: Array<{ id: string; assetId: string; position: { x: number; y: number }; size: number }>;
      connections: Array<{ from: string; to: string; type: 'harmony' | 'tension'; harmonyLevel: number }>;
    };
    targetModel?: string | null;
  },
  tagWeights: Record<string, number>,
  styleRigidity: number,
  outputType: string
): Promise<GeminiResult<string>> => {
  const optimizedKnowledgeContext = getOptimizedKnowledgeContext(outputType, tagWeights);
  let systemPrompt = `Create ${outputType} with filmmaking expertise. ${optimizedKnowledgeContext}`;

  if (outputType === 'Master Story') {
    systemPrompt += `\nInclude: Logline, Synopsis (3-5 sentences), Key Scene script.`;
  }

  const weightedTags = Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .slice(0, 2) // Limit to top 2 tags
    .map(([tag]) => tag)
    .join(', ');
  if (weightedTags) {
    systemPrompt += `\nFocus: ${weightedTags}.`;
  }

  const assetsText = project.assets.length
    ? project.assets.map(formatAssetPromptSummary).join('\n')
    : 'No project assets captured yet.';

  const canvasText = project.canvas.connections.length
    ? `Canvas connections: ${project.canvas.connections
        .map(conn => {
          const from = project.canvas.nodes.find(n => n.id === conn.from)?.assetId ?? 'unknown';
          const to = project.canvas.nodes.find(n => n.id === conn.to)?.assetId ?? 'unknown';
          return `${conn.type} connection from ${from} to ${to} (harmony: ${conn.harmonyLevel}%)`;
        })
        .join('; ')}`
    : 'Canvas connections: none recorded yet.';

  const fullPromptContent = `${systemPrompt}\n\nProject Assets:\n${assetsText}\n\nCanvas Structure:\n${canvasText}\n\nGenerate ${outputType} output:`;
  const fullPrompt = validateAndOptimizePrompt(fullPromptContent);

  if (isDevelopmentEnv()) {
    console.debug('[Gemini] Workspace prompt length:', fullPromptContent.length);
  }

  try {
    const { text, usage } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false, usage);
  } catch (error: unknown) {
    console.warn('Gemini workspace generation failed, falling back to mock mode:', error);
    return createResult(createMockWorkspaceResponse(project, outputType, tagWeights, styleRigidity), null, true);
  }
};

export const runBuild = async (
  buildType: string,
  answers: Record<string, string>,
  sandboxContext: Record<string, string>,
  tagWeights: Record<string, number>,
  styleRigidity: number,
  targetModel?: string | null
): Promise<GeminiResult<string>> => {
  const optimizedKnowledgeContext = getOptimizedKnowledgeContext(buildType, tagWeights);
  let systemPrompt = `Process ${buildType} build with film expertise. ${optimizedKnowledgeContext}`;

  const weightedTags = Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .slice(0, 2) // Limit to top 2 tags
    .map(([tag]) => tag)
    .join(', ');
  if (weightedTags) {
    systemPrompt += `\nFocus: ${weightedTags}.`;
  }

  const conversion = getPromptConversion(targetModel);
  if (conversion) {
    systemPrompt += `\nWhen providing visual prompts, follow this format: ${conversion.promptFormat}.`;
    if (conversion.notes) {
      systemPrompt += ` ${conversion.notes}`;
    }
  }

  const answersText = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const sandboxText = Object.entries(sandboxContext)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const fullPromptContent = `${systemPrompt}\n\nAnswers:\n${answersText}\n\nSandbox Context:\n${sandboxText}\n\nGenerate ${buildType} output:`;
  const fullPrompt = validateAndOptimizePrompt(fullPromptContent);

  try {
    const { text, usage } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false, usage);
  } catch (error: unknown) {
    console.warn('Gemini build generation failed, falling back to mock mode:', error);
    return createResult(createMockBuildResponse(buildType, answers, sandboxContext), null, true);
  }
};

type DirectorAdviceOptions = {
  tagWeights?: Record<string, number>;
  styleRigidity?: number;
};

const summarizeShotLists = (project: Project): string => {
  const shotLists = project.secondaryTimeline?.shotLists ?? [];
  if (!shotLists.length) {
    return 'No shot plans generated yet.';
  }

  return shotLists
    .slice(0, 3)
    .map(shotList => {
      const masterName = project.assets.find(asset => asset.id === shotList.masterAssetId)?.name ?? 'Unnamed Master';
      const shotNames = shotList.shots.slice(0, 3).map(shot => shot.name).join(', ');
      const extra = shotList.shots.length > 3 ? `… +${shotList.shots.length - 3} more` : '';
      return `${masterName}: ${shotList.shots.length} shots (${shotNames}${extra})`;
    })
    .join('\n');
};

const summarizeStyledShots = (project: Project): string => {
  const styledShots = project.thirdTimeline?.styledShots ?? [];
  if (!styledShots.length) {
    return 'No styled shots recorded.';
  }

  return styledShots
    .slice(0, 4)
    .map(shot => {
      const styleName = shot.metadata?.styleName || shot.metadata?.look || shot.metadata?.colorGrading;
      return `${shot.name}${styleName ? ` — style: ${styleName}` : ''}`;
    })
    .join('\n');
};

export const generateAssetFieldSuggestion = async (
  context: {
    assetId: string;
    fieldKey: string;
    fieldLabel: string;
    currentValue: string;
    assetType?: string;
    otherFields?: Record<string, string>;
  }
): Promise<GeminiResult<string>> => {
  const optimizedKnowledgeContext = getOptimizedKnowledgeContext(context.assetType || 'asset');
  
  // Focused prompt for specific field improvements
  let systemPrompt = `You are Loop, a film expert providing concise, actionable suggestions for asset fields. ${optimizedKnowledgeContext.substring(0, 500)}`;
  
  // Field-specific guidance
  if (context.fieldKey.includes('name') || context.fieldKey.includes('title')) {
    systemPrompt += '\nFor names/titles: Return ONLY the suggested name/title. No explanation or context. 2-6 words max.';
  } else if (context.fieldKey.includes('description') || context.fieldKey.includes('summary')) {
    systemPrompt += '\nFor descriptions: Return ONLY the improved description text. No quotes or explanations. 1-2 sentences max.';
  } else if (context.fieldKey.includes('style') || context.fieldKey.includes('look')) {
    systemPrompt += '\nFor style: Return ONLY the style/look text. Reference specific techniques. No explanations.';
  } else if (context.fieldKey.includes('dialogue') || context.fieldKey.includes('script')) {
    systemPrompt += '\nFor dialogue: Return ONLY the improved dialogue. No quotation marks or stage directions unless part of content.';
  } else {
    systemPrompt += '\nReturn ONLY the improved field content. No explanations, quotes, or meta-text.';
  }
  
  systemPrompt += '\nIMPORTANT: Return ONLY the content that should replace the field value. No "Consider this:", "Try:", or explanatory text.';
  
  const contextFields = context.otherFields ? 
    Object.entries(context.otherFields)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n') : '';
  
  const fullPrompt = validateAndOptimizePrompt([
    systemPrompt,
    `Asset Type: ${context.assetType || 'Unknown'}`,
    contextFields ? `Related Fields:\n${contextFields}` : '',
    `Current ${context.fieldLabel}: "${context.currentValue || '(empty)'}"`,
    `Suggest an improved ${context.fieldLabel.toLowerCase()}:`
  ].filter(Boolean).join('\n\n'));

  try {
    const { text, usage } = await requestTextWithFallback(fullPrompt);
    
    // Post-process to ensure we only get the field value, not explanations
    let processedText = text
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 2) // Max 2 lines
      .join(' ')
      .trim();
      
    // Remove common explanatory prefixes
    const explanatoryPrefixes = [
      'Consider this:',
      'Try:',
      'Suggestion:',
      'Here\'s a suggestion:',
      'You might try:',
      'Consider:',
      'How about:',
      'Perhaps:',
      'Maybe:',
      'I suggest:',
      'Recommendation:',
      'My suggestion:',
      'A better option:',
      'Instead, try:'
    ];
    
    for (const prefix of explanatoryPrefixes) {
      if (processedText.toLowerCase().startsWith(prefix.toLowerCase())) {
        processedText = processedText.substring(prefix.length).trim();
        break;
      }
    }
    
    // Remove quotes if they wrap the entire content
    if ((processedText.startsWith('"') && processedText.endsWith('"')) ||
        (processedText.startsWith("'") && processedText.endsWith("'"))) {
      processedText = processedText.slice(1, -1).trim();
    }
    
    // Truncate if still too long
    if (processedText.length > 200) {
      processedText = processedText.substring(0, 200).trim();
    }
    
    return createResult(processedText || text.substring(0, 200), null, false, usage);
  } catch (error: unknown) {
    console.warn('Asset field suggestion generation failed:', error);
    
    // Better fallback suggestions based on field type
    let fallback = '';
    if (context.fieldKey.includes('name')) {
      fallback = 'Consider a more evocative, specific name that hints at the character or theme.';
    } else if (context.fieldKey.includes('description')) {
      fallback = 'Add visual details, emotional tone, or cinematic qualities to strengthen the description.';
    } else {
      fallback = 'Enhance with more specific, filmmaking-focused details for stronger impact.';
    }
    
    return createResult(fallback, null, true);
  }
};

export const generateDirectorAdvice = async (
  project: Project,
  options: DirectorAdviceOptions = {}
): Promise<GeminiResult<DirectorSuggestion[]>> => {
  const { tagWeights = {}, styleRigidity = 50 } = options;
  const tagsSummary = prominentTags(tagWeights);
  const tone = styleRigidity > 60 ? 'precision-first' : 'exploratory';
  const conversion = getPromptConversion(project.targetModel);

  let systemPrompt = 'You are Loop, a veteran film director. Provide sharp, actionable notes that strengthen story momentum, cinematography, and pacing.';
  systemPrompt += ` Keep guidance ${tone}. Limit yourself to at most three suggestions.`;
  if (tagsSummary) {
    systemPrompt += ` Weighted creative focuses: ${tagsSummary}.`;
  }
  if (conversion) {
    systemPrompt += ` Reference the ${conversion.displayName} format (${conversion.promptFormat}) when suggesting new prompts or visual beats.`;
  }

  systemPrompt += '\nReturn valid JSON with the shape {"suggestions": [{"id": string?, "type": "addition"|"removal"|"edit"|"color_grading"|"transition"|"other", "description": string, "advice": string, "targetAssetName": string?, "targetAssetId": string?}]}. Every suggestion must have a description and advice field.';

  const assetsContext = formatAssetsForPrompt(project.assets);
  const masterAssetsContext = project.secondaryTimeline?.masterAssets?.length
    ? formatAssetsForPrompt(project.secondaryTimeline.masterAssets as Asset[])
    : 'No master assets locked yet.';
  const shotPlanSummary = summarizeShotLists(project);
  const styledShotSummary = summarizeStyledShots(project);
  const acceptedSuggestions = project.fourthTimeline?.acceptedSuggestions ?? [];
  const acceptedSummary = acceptedSuggestions.length
    ? acceptedSuggestions
        .slice(0, 3)
        .map(suggestion => `${suggestion.type}: ${suggestion.description}`)
        .join('\n')
    : 'None accepted yet.';

  const fullPrompt = validateAndOptimizePrompt(
    [
      systemPrompt,
      '---',
      `Project Assets:\n${assetsContext}`,
      `Master Assets:\n${masterAssetsContext}`,
      `Shot Plans:\n${shotPlanSummary}`,
      `Styled Shots:\n${styledShotSummary}`,
      `Accepted Suggestions:\n${acceptedSummary}`,
      'Return JSON only.'
    ].join('\n\n')
  );

  try {
    const { text, usage } = await requestTextWithFallback(fullPrompt);
    const rawSuggestions = parseDirectorAdviceResponse(text);
    const timestamp = new Date();

    const normalizedSuggestions = rawSuggestions
      .map(raw => {
        const description =
          typeof raw.description === 'string' && raw.description.trim()
            ? raw.description.trim()
            : typeof raw.summary === 'string' && raw.summary.trim()
              ? raw.summary.trim()
              : '';
        if (!description) {
          return null;
        }

        const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateSuggestionId();
        const advice =
          typeof raw.advice === 'string' && raw.advice.trim()
            ? raw.advice.trim()
            : typeof raw.note === 'string' && raw.note.trim()
              ? raw.note.trim()
              : undefined;

        const rawTargetId =
          (typeof raw.targetAssetId === 'string' && raw.targetAssetId.trim())
            || (typeof raw.target_asset_id === 'string' && raw.target_asset_id.trim())
            || '';

        let targetAssetId = rawTargetId || undefined;
        let targetAssetName =
          (typeof raw.targetAssetName === 'string' && raw.targetAssetName.trim())
            || (typeof raw.target_asset_name === 'string' && raw.target_asset_name.trim())
            || undefined;

        if (targetAssetId) {
          const matched = project.assets.find(asset => asset.id === targetAssetId);
          if (matched && !targetAssetName) {
            targetAssetName = matched.name;
          }
        } else if (targetAssetName) {
          const matched = project.assets.find(
            asset => asset.name.toLowerCase() === targetAssetName!.toLowerCase()
          );
          if (matched) {
            targetAssetId = matched.id;
            targetAssetName = matched.name;
          }
        }

        return {
          id,
          type: normalizeSuggestionType(raw.type),
          description,
          advice,
          targetAssetId,
          targetAssetName,
          accepted: false,
          createdAt: timestamp,
        } satisfies DirectorSuggestion;
      })
      .filter(Boolean) as DirectorSuggestion[];

    const limitedSuggestions = normalizedSuggestions.slice(0, 3);
    if (!limitedSuggestions.length) {
      throw new Error('No director suggestions parsed.');
    }

    return createResult(limitedSuggestions, null, false, usage);
  } catch (error) {
    console.warn('Director advice generation failed, using mock suggestions:', error);
    return createResult(createMockDirectorAdvice(project), null, true);
  }
};


export const __testables = {
  truncateConversationHistory,
  formatAssetsForPrompt,
  MAX_CONVERSATION_CONTEXT
};
