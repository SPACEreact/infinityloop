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

const DEFAULT_TEXT_MODEL = 'gemini-1.5-pro-latest';
const FALLBACK_TEXT_MODEL = 'gemini-1.5-flash-latest';
const DEFAULT_IMAGE_MODEL = 'imagen-3.0-generate-001';
const FALLBACK_IMAGE_MODEL = 'imagen-2.0-generate-001';

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
  'gemini-1.0-pro',
  'gemini-1.0-pro-001'
];

const IMAGE_MODEL_PRIORITY = [
  DEFAULT_IMAGE_MODEL,
  FALLBACK_IMAGE_MODEL,
  'imagegeneration'
];

const MOCK_MODEL_ENTRIES: GeminiModel[] = [
  {
    name: `${MODEL_NAMESPACE_PREFIX}${DEFAULT_TEXT_MODEL}`,
    displayName: 'Gemini 1.5 Pro',
    description: 'Primary text generation model optimized for high quality story outputs.',
    supportedGenerationMethods: ['generateContent']
  },
  {
    name: `${MODEL_NAMESPACE_PREFIX}${FALLBACK_TEXT_MODEL}`,
    displayName: 'Gemini 1.5 Flash',
    description: 'Fast text generation model suitable for quota-limited environments.',
    supportedGenerationMethods: ['generateContent']
  },
  {
    name: `${MODEL_NAMESPACE_PREFIX}${DEFAULT_IMAGE_MODEL}`,
    displayName: 'Imagen 3.0',
    description: 'High fidelity image generation tuned for cinematic concept frames.',
    supportedGenerationMethods: ['generateImage']
  },
  {
    name: `${MODEL_NAMESPACE_PREFIX}${FALLBACK_IMAGE_MODEL}`,
    displayName: 'Imagen 2.0',
    description: 'Fallback image generator with broad availability and lower quota requirements.',
    supportedGenerationMethods: ['generateImage']
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

const supportsImageGeneration = (model: GeminiModel): boolean => {
  const normalizedName = model.name.toLowerCase();
  if (normalizedName.includes('imagen')) {
    return true;
  }

  const methods = (model.supportedGenerationMethods ?? []).map(method => method.toLowerCase());
  return methods.some(method => method.includes('generateimage') || method.includes('createimage'));
};

const selectModel = (
  models: GeminiModel[],
  type: 'text' | 'image',
  requested?: string | null
): ModelSelection => {
  const predicate = type === 'text' ? supportsTextGeneration : supportsImageGeneration;
  const availableModels = models.filter(model => predicate(model));

  if (!availableModels.length) {
    return { primary: null, fallback: null };
  }

  const requestedName = requested ? normalizeModelName(requested) : null;
  const priorityList = type === 'text' ? TEXT_MODEL_PRIORITY : IMAGE_MODEL_PRIORITY;

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
  const proxyResponse = await requestGeminiProxy(
    endpoint,
    'listModels',
    {},
    'Gemini proxy models request'
  );

  if (Array.isArray(proxyResponse?.data?.models)) {
    return proxyResponse.data.models as GeminiModel[];
  }

  if (Array.isArray(proxyResponse?.data)) {
    return proxyResponse.data as GeminiModel[];
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
  type: 'text' | 'image',
  requested?: string | null
): Promise<ModelSelection> => {
  const catalog = await fetchModelCatalogForEndpoint(endpoint);
  return selectModel(catalog, type, requested);
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
}

const createResult = <T>(data: T | null, error: string | null, isMock: boolean): GeminiResult<T> => ({
  data,
  error,
  isMock
});

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

const extractImageDataFromResponse = (data: any): string => {
  const candidates = data?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          const inline = part?.inlineData || part?.inline_data;
          const base64 = inline?.data || inline?.base64Data || inline?.imageBytes;
          if (typeof base64 === 'string' && base64.trim()) {
            return base64;
          }
        }
      }
    }
  }

  const images = data?.images;
  if (Array.isArray(images)) {
    for (const image of images) {
      const base64 = image?.imageBytes || image?.imageData || image?.base64Data;
      if (typeof base64 === 'string' && base64.trim()) {
        return base64;
      }
    }
  }

  const image = data?.image;
  if (image) {
    const base64 = image?.imageBytes || image?.imageData || image?.base64Data;
    if (typeof base64 === 'string' && base64.trim()) {
      return base64;
    }
  }

  const dataArray = data?.data;
  if (Array.isArray(dataArray)) {
    for (const item of dataArray) {
      const base64 = item?.b64_json || item?.imageBytes || item?.base64Data;
      if (typeof base64 === 'string' && base64.trim()) {
        return base64;
      }
    }
  }

  throw new Error('No image data returned from model');
};

type GeminiProxyAction = 'generateContent' | 'generateImage' | 'listModels';

const requestGeminiProxy = async (
  endpoint: ProxyGeminiEndpoint,
  action: GeminiProxyAction,
  payload: Record<string, unknown>,
  description: string
): Promise<any> => {
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

  return data;
};

const requestGeminiContentDirect = async (
  endpoint: DirectGeminiEndpoint,
  prompt: string,
  model: string
): Promise<string> => {
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
  return extractTextFromResponse(data);
};

const requestGeminiImageDirect = async (
  endpoint: DirectGeminiEndpoint,
  prompt: string,
  model: string
): Promise<string> => {
  const normalizedBase = endpoint.baseUrl.replace(/\/$/, '');
  const normalizedModel = normalizeModelName(model);
  const url = `${normalizedBase}/${normalizedModel}:generateImage?key=${encodeURIComponent(endpoint.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: {
        text: prompt
      },
      imageGenerationConfig: {
        numberOfImages: 1
      }
    })
  });

  const data = await parseResponseJson(response, 'Gemini image request');
  return extractImageDataFromResponse(data);
};

const requestTextWithFallback = async (
  prompt: string,
  preferredModel: string = DEFAULT_TEXT_MODEL
): Promise<{ text: string; modelUsed: string; usedFallback: boolean }> => {
  const endpoint = getGeminiEndpoint();
  if (!endpoint) {
    throw new Error('Gemini API key is not configured');
  }

  const selection = await resolveModelSelectionForEndpoint(endpoint, 'text', preferredModel);
  if (!selection.primary) {
    throw new Error('No text generation models available for this API key.');
  }

  if (endpoint.type === 'proxy') {
    const proxyResponse = await requestGeminiProxy(
      endpoint,
      'generateContent',
      { prompt, model: selection.primary },
      'Gemini proxy text request'
    );

    const text = typeof proxyResponse?.data === 'string' ? proxyResponse.data.trim() : '';
    if (!text) {
      throw new Error('Gemini proxy text request returned no data');
    }

    const modelUsed = typeof proxyResponse?.modelUsed === 'string' ? proxyResponse.modelUsed : selection.primary;
    const usedFallback = typeof proxyResponse?.usedFallback === 'boolean'
      ? proxyResponse.usedFallback
      : false;

    return { text, modelUsed, usedFallback };
  }

  try {
    const text = await requestGeminiContentDirect(endpoint, prompt, selection.primary);
    return { text, modelUsed: selection.primary, usedFallback: false };
  } catch (error) {
    if (!shouldUseFallbackModel(error) || !selection.fallback || selection.fallback === selection.primary) {
      throw error;
    }

    const fallbackText = await requestGeminiContentDirect(endpoint, prompt, selection.fallback);
    return { text: fallbackText, modelUsed: selection.fallback, usedFallback: true };
  }
};

const requestImageWithFallback = async (
  prompt: string,
  preferredModel: string = DEFAULT_IMAGE_MODEL
): Promise<{ image: string; modelUsed: string; usedFallback: boolean }> => {
  const endpoint = getGeminiEndpoint();
  if (!endpoint) {
    throw new Error('Gemini API key is not configured');
  }

  const selection = await resolveModelSelectionForEndpoint(endpoint, 'image', preferredModel);
  if (!selection.primary) {
    throw new Error('No image generation models available for this API key.');
  }

  if (endpoint.type === 'proxy') {
    const proxyResponse = await requestGeminiProxy(
      endpoint,
      'generateImage',
      { prompt, model: selection.primary },
      'Gemini proxy image request'
    );

    const image = typeof proxyResponse?.data === 'string' ? proxyResponse.data.trim() : '';
    if (!image) {
      throw new Error('Gemini proxy image request returned no data');
    }

    const modelUsed = typeof proxyResponse?.modelUsed === 'string' ? proxyResponse.modelUsed : selection.primary;
    const usedFallback = typeof proxyResponse?.usedFallback === 'boolean'
      ? proxyResponse.usedFallback
      : false;

    return { image, modelUsed, usedFallback };
  }

  try {
    const image = await requestGeminiImageDirect(endpoint, prompt, selection.primary);
    return { image, modelUsed: selection.primary, usedFallback: false };
  } catch (error) {
    if (!shouldUseFallbackModel(error) || !selection.fallback || selection.fallback === selection.primary) {
      throw error;
    }

    const fallbackImage = await requestGeminiImageDirect(endpoint, prompt, selection.fallback);
    return { image: fallbackImage, modelUsed: selection.fallback, usedFallback: true };
  }
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

const truncateConversationHistory = (historyText: string, maxLength: number): string => {
  if (historyText.length <= maxLength) return historyText;
  
  const messages = historyText.split('\n');
  let truncated = '';
  let totalLength = 0;
  
  // Keep only the 2-3 most recent exchanges for context efficiency
  const recentMessages = messages.slice(-6); // Last 6 lines = ~3 exchanges
  
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const messageLength = recentMessages[i].length + 1;
    if (totalLength + messageLength > maxLength) break;
    truncated = recentMessages[i] + '\n' + truncated;
    totalLength += messageLength;
  }
  
  return truncated || messages[messages.length - 1] || '';
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
const MOCK_IMAGE_PLACEHOLDER = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAHElEQVR42mNgGAWjYBSMglEwCkbBqNgUjIJRMAAAUwABnVh6hAAAAABJRU5ErkJggg==';

const TAG_WEIGHT_THRESHOLD = 0;

const prominentTags = (tagWeights: Record<string, number>) =>
  Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, weight]) => `${tag} (${Math.round(weight * 100)}%)`)
    .join(', ');

const ASSET_PROMPT_TAG_LIMIT = 3;
const ASSET_PROMPT_PREVIEW_LENGTH = 220;

const cleanWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

const truncateWithEllipsis = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
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
  const historyText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const optimizedKnowledgeContext = getOptimizedKnowledgeContext('chat', tagWeights);
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

  // Aggressively limit conversation history for quota efficiency
  const optimizedHistoryText = truncateConversationHistory(historyText, MAX_CONVERSATION_CONTEXT);

  const fullPrompt = validateAndOptimizePrompt(
    `${systemPrompt}\n\nConversation History:\n${optimizedHistoryText}\n\nUser: ${userMessage}\nAssistant:`
  );

  try {
    const { text } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false);
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
    const { text } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false);
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
  styleRigidity: number
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

  const answersText = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const sandboxText = Object.entries(sandboxContext)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const fullPromptContent = `${systemPrompt}\n\nAnswers:\n${answersText}\n\nSandbox Context:\n${sandboxText}\n\nGenerate ${buildType} output:`;
  const fullPrompt = validateAndOptimizePrompt(fullPromptContent);

  try {
    const { text } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false);
  } catch (error: unknown) {
    console.warn('Gemini build generation failed, falling back to mock mode:', error);
    return createResult(createMockBuildResponse(buildType, answers, sandboxContext), null, true);
  }
};

export const generateImageFromPrompt = async (
  prompt: string,
  model: string = DEFAULT_IMAGE_MODEL
): Promise<GeminiResult<string>> => {
  const enhancedPrompt = `${prompt}\n\nDraw from cinematography and visual storytelling expertise when generating this image.`;

  try {
    const { image } = await requestImageWithFallback(enhancedPrompt, model);
    return createResult(image, null, false);
  } catch (error: unknown) {
    console.warn('Gemini image generation failed, falling back to mock mode:', error);
    const mockCaption = [
      `🖼️ **${LOOP_SIGNATURE} — Mock Image Placeholder**`,
      'Gemini image generation is offline, so here is a placeholder tile for quick comps.',
      `Prompt captured: ${prompt}`,
      `Model: ${model}`,
      '',
      'Swap in a valid API key to stream real renders.'
    ].join('\n');
    return createResult(
      JSON.stringify({ prompt, model, notes: mockCaption, placeholder: true, image: MOCK_IMAGE_PLACEHOLDER }),
      null,
      true
    );
  }
};
