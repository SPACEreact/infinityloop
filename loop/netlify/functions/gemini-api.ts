import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY_ENV_CANDIDATES = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_AI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'VITE_GEMINI_API_KEY'
] as const;

let cachedGeminiClient: GoogleGenerativeAI | null = null;
let cachedGeminiApiKey: string | null = null;

const resolveGeminiApiKey = (): string | null => {
  for (const envName of GEMINI_KEY_ENV_CANDIDATES) {
    const rawValue = process.env[envName];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed) {
        if (envName !== 'GEMINI_API_KEY') {
          console.info(`Resolved Gemini API key from ${envName} environment variable.`);
        }
        return trimmed;
      }
    }
  }

  return null;
};

const getGeminiClient = (): { apiKey: string | null; client: GoogleGenerativeAI | null } => {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { apiKey: null, client: null };
  }

  if (!cachedGeminiClient || cachedGeminiApiKey !== apiKey) {
    cachedGeminiClient = new GoogleGenerativeAI(apiKey);
    cachedGeminiApiKey = apiKey;
  }

  return { apiKey, client: cachedGeminiClient };
};

const MODEL_LIST_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODEL_NAMESPACE_PREFIX = 'models/';

const normalizeModelName = (model: string): string =>
  model.startsWith(MODEL_NAMESPACE_PREFIX) ? model : `${MODEL_NAMESPACE_PREFIX}${model}`;

const trimModelNamespace = (model: string): string =>
  model.startsWith(MODEL_NAMESPACE_PREFIX) ? model.slice(MODEL_NAMESPACE_PREFIX.length) : model;

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

let cachedModelCatalog: GeminiModel[] | null = null;
let cachedModelCatalogTimestamp = 0;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

const TEXT_MODEL_PRIORITY = [
  'models/gemini-pro',
  'models/gemini-pro-vision',
  'models/gemini-1.5-pro-latest',
  'models/gemini-1.5-flash-latest',
  'models/gemini-1.0-pro',
  'models/gemini-1.0-pro-001'
];

const IMAGE_MODEL_PRIORITY = [
  'models/imagen-3.0-generate-001',
  'models/imagen-2.0-generate-001',
  'models/imagegeneration'
];

const isCacheFresh = (): boolean => Date.now() - cachedModelCatalogTimestamp < MODEL_CACHE_TTL_MS;

const fetchModelCatalog = async (apiKey: string): Promise<GeminiModel[]> => {
  if (cachedModelCatalog && isCacheFresh()) {
    return cachedModelCatalog;
  }

  const response = await fetch(`${MODEL_LIST_ENDPOINT}?key=${apiKey}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ListModels API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as { models?: GeminiModel[] };
  cachedModelCatalog = Array.isArray(data.models) ? data.models : [];
  cachedModelCatalogTimestamp = Date.now();
  return cachedModelCatalog;
};

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

const selectModel = (models: GeminiModel[], type: 'text' | 'image', requested?: string | null): ModelSelection => {
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

// Rate limiting: simple in-memory store (for serverless, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Input validation - Updated to support larger prompts for comprehensive filmmaking knowledge
const MAX_PROMPT_LENGTH = 100000; // characters (~25,000 tokens, well under Gemini Pro's limit)
const MAX_REQUEST_SIZE = 2 * 1024 * 1024; // 2MB

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://generativelanguage.googleapis.com;",
};


type UsageTotals = {
  promptTokens: number;
  completionTokens: number;
};

const ZERO_USAGE: UsageTotals = { promptTokens: 0, completionTokens: 0 };

const sanitizeUsageTotals = (usage?: UsageTotals | null): UsageTotals => {
  if (!usage) {
    return ZERO_USAGE;
  }

  const prompt = Number.isFinite(usage.promptTokens)
    ? Math.max(0, Math.round(usage.promptTokens))
    : 0;
  const completion = Number.isFinite(usage.completionTokens)
    ? Math.max(0, Math.round(usage.completionTokens))
    : 0;

  if (!prompt && !completion) {
    return ZERO_USAGE;
  }

  return { promptTokens: prompt, completionTokens: completion };
};

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
    const candidate =
      (value as { tokens?: unknown }).tokens ??
      (value as { tokenCount?: unknown }).tokenCount ??
      (value as { value?: unknown }).value ??
      (value as { amount?: unknown }).amount;

    if (candidate !== undefined) {
      return coerceNumeric(candidate);
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
): UsageTotals | null => {
  const normalizedPrompt = prompt ?? (total !== undefined ? total : undefined);
  let normalizedCompletion = completion;

  if (normalizedPrompt !== undefined && total !== undefined) {
    const derived = total - normalizedPrompt;
    if (Number.isFinite(derived)) {
      normalizedCompletion = Math.max(0, Math.round(derived));
    }
  }

  if (normalizedCompletion === undefined && total !== undefined && normalizedPrompt === undefined) {
    normalizedCompletion = Math.max(0, Math.round(total));
  }

  if (normalizedPrompt === undefined && normalizedCompletion === undefined) {
    return null;
  }

  return sanitizeUsageTotals({
    promptTokens: normalizedPrompt ?? 0,
    completionTokens: normalizedCompletion ?? 0
  });
};

const parseUsageObject = (candidate: unknown): UsageTotals | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const promptKeys = [
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

  const completionKeys = [
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

  const totalKeys = [
    'totalTokenCount',
    'totalTokens',
    'total_tokens',
    'totalTokenUsage',
    'total_token_count',
    'tokenCount',
    'total'
  ];

  const resolveKeys = (keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = (candidate as Record<string, unknown>)[key];
      const numeric = coerceNumeric(value);
      if (numeric !== undefined) {
        return numeric;
      }
      if (value && typeof value === 'object') {
        const nested = coerceNumeric((value as { count?: unknown }).count);
        if (nested !== undefined) {
          return nested;
        }
      }
    }
    return undefined;
  };

  const prompt = resolveKeys(promptKeys);
  const completion = resolveKeys(completionKeys);
  const total = resolveKeys(totalKeys);

  const promptFromObject = coerceNumeric((candidate as { prompt?: unknown }).prompt);
  const completionFromObject = coerceNumeric((candidate as { completion?: unknown }).completion);

  return (
    buildUsageFromNumbers(
      prompt ?? promptFromObject,
      completion ?? completionFromObject,
      total
    ) ?? null
  );
};

const parseUsageTree = (value: unknown, seen: Set<object>): UsageTotals | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const ref = value as object;
  if (seen.has(ref)) {
    return null;
  }
  seen.add(ref);

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
    return null;
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

  return null;
};

const resolveUsageFromPayload = (payload: unknown): UsageTotals | null =>
  parseUsageTree(payload, new Set<object>());

const estimatePromptTokens = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return Math.max(1, Math.round(trimmed.length / 4));
};

const estimateCompletionTokens = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return Math.max(1, Math.round(trimmed.length / 4));
};

const safeCountTokens = async (
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  request: unknown
): Promise<number | undefined> => {
  try {
    const countResult = await model.countTokens(request as Record<string, unknown>);
    const usage = resolveUsageFromPayload(countResult);
    if (usage && usage.promptTokens > 0) {
      return usage.promptTokens;
    }

    const numeric = coerceNumeric(
      (countResult as { totalTokens?: unknown }).totalTokens ??
        (countResult as { totalTokenCount?: unknown }).totalTokenCount ??
        (countResult as { tokenCount?: unknown }).tokenCount
    );
    if (numeric !== undefined) {
      return Math.max(0, Math.round(numeric));
    }
  } catch (error) {
    console.warn('Token counting failed:', error);
  }

  return undefined;
};

const normalizeUsageCandidate = (usage?: UsageTotals | null): UsageTotals | null => {
  if (!usage) {
    return null;
  }
  return sanitizeUsageTotals(usage);
};

const ensureTextUsage = async (
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  request: Record<string, unknown>,
  prompt: string,
  responseText: string,
  existingUsage?: UsageTotals | null
): Promise<UsageTotals> => {
  let usage = normalizeUsageCandidate(existingUsage);

  if (usage && usage.promptTokens === 0) {
    usage = null;
  }

  let promptTokens = usage?.promptTokens ?? 0;
  let completionTokens = usage?.completionTokens ?? 0;

  if (promptTokens === 0) {
    const counted = await safeCountTokens(model, request);
    if (counted !== undefined) {
      promptTokens = counted;
    }
  }

  if (promptTokens === 0) {
    promptTokens = estimatePromptTokens(prompt);
  }

  if (completionTokens === 0 && responseText.trim()) {
    completionTokens = estimateCompletionTokens(responseText);
  }

  return sanitizeUsageTotals({ promptTokens, completionTokens });
};

const ensureImageUsage = async (
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  request: Record<string, unknown>,
  prompt: string,
  existingUsage?: UsageTotals | null
): Promise<UsageTotals> => {
  let usage = normalizeUsageCandidate(existingUsage);
  let promptTokens = usage?.promptTokens ?? 0;

  if (promptTokens === 0) {
    const counted = await safeCountTokens(model, request);
    if (counted !== undefined) {
      promptTokens = counted;
    }
  }

  if (promptTokens === 0) {
    promptTokens = estimatePromptTokens(prompt);
  }

  return sanitizeUsageTotals({ promptTokens, completionTokens: 0 });
};

const buildTextRequest = (text: string): { contents: Array<{ role: 'user'; parts: Array<{ text: string }> }> } => ({
  contents: [
    {
      role: 'user',
      parts: [{ text }]
    }
  ]
});



// Retry utility function
async function retryApiCall<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
  let effectiveBaseDelay = baseDelay;
  if (typeof process !== 'undefined' && process.env) {
    const override = process.env.GEMINI_PROXY_RETRY_BASE_DELAY;
    if (override) {
      const parsed = Number.parseInt(override, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        effectiveBaseDelay = parsed;
      }
    } else if (process.env.VITEST) {
      effectiveBaseDelay = Math.min(baseDelay, 10);
    }
  }
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (i < retries - 1) {
        const delay = effectiveBaseDelay * Math.pow(2, i);
        console.warn(`API call failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'Unknown error occurred';
};

const shouldUseFallbackModel = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  if (message.includes('quota') && (message.includes('exceeded') || message.includes('exceed') || message.includes('exhausted'))) {
    return true;
  }

  if (message.includes('permission denied') || message.includes('not found')) {
    return true;
  }

  const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
  if (status === 429 || status === 403 || status === 404) {
    return true;
  }

  const errorPayload = typeof error === 'object' && error ? (error as { error?: { status?: string; code?: number } }).error : undefined;
  if (errorPayload) {
    if (typeof errorPayload.status === 'string') {
      const normalizedStatus = errorPayload.status.toLowerCase();
      if (
        normalizedStatus.includes('resource_exhausted') ||
        normalizedStatus.includes('permission_denied') ||
        normalizedStatus.includes('not_found')
      ) {
        return true;
      }
    }

    if (
      typeof errorPayload.code === 'number' &&
      (errorPayload.code === 429 || errorPayload.code === 403 || errorPayload.code === 404)
    ) {
      return true;
    }
  }

  return false;
};

const buildMockFailureResponse = (
  headers: Record<string, string>,
  error: unknown,
  overrideMessage?: string,
  extra?: Record<string, unknown>
) => {
  const detailMessage = extractErrorMessage(error);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: false,
      error: overrideMessage ?? 'Gemini request failed. Using mock response.',
      detail: detailMessage,
      isMock: true,
      ...extra
    })
  };
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { apiKey: resolvedApiKey, client } = getGeminiClient();

  // Validate API key on startup
  if (!resolvedApiKey || !client) {
    console.error(
      'Gemini API key environment variable is not set. Provide one of: ' +
        GEMINI_KEY_ENV_CANDIDATES.join(', ')
    );
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS
      },
      body: JSON.stringify({
        success: false,
        error: 'Service configuration error',
        detail: 'Gemini API key is not configured.',
        isMock: true
      })
    };
  }

  // Get client IP for rate limiting
  const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

  // Rate limiting check
  const now = Date.now();
  const rateLimitKey = clientIP as string;
  const currentLimit = rateLimitStore.get(rateLimitKey);

  if (currentLimit) {
    if (now > currentLimit.resetTime) {
      // Reset the limit
      rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else if (currentLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      const retryAfter = Math.ceil((currentLimit.resetTime - now) / 1000);
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          ...SECURITY_HEADERS
        },
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' })
      };
    } else {
      currentLimit.count++;
    }
  } else {
    rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    // Check request size
    if (event.body.length > MAX_REQUEST_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: 'Request too large' })
      };
    }

    const { action, ...requestData } = JSON.parse(event.body);

    // Log request for monitoring (without sensitive data)
    console.log(`[${new Date().toISOString()}] ${event.httpMethod} ${event.path} - Action: ${action} - IP: ${clientIP}`);

    switch (action) {
      case 'generateContent': {
        const { prompt, model } = requestData as { prompt?: string; model?: string };

        if (!prompt || typeof prompt !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Prompt is required for text generation.' })
          };
        }

        if (prompt.length > MAX_PROMPT_LENGTH) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Prompt exceeds maximum length.' })
          };
        }

        const catalog = await fetchModelCatalog(resolvedApiKey);
        const { primary, fallback } = selectModel(catalog, 'text', typeof model === 'string' ? model : null);

        if (!primary) {
          return buildMockFailureResponse(
            headers,
            new Error('No text generation models available for this API key.'),
            undefined,
            { usedFallback: false }
          );
        }

        let finalModel = primary;
        let usedFallback = false;

        const invokeModel = async (modelName: string) => {
          const generativeModel = client.getGenerativeModel({ model: modelName });
          const requestPayload = buildTextRequest(prompt);
          const result = await generativeModel.generateContent(requestPayload);
          const response = await result.response;
          const text = response.text().trim();
          const usageCandidate =
            normalizeUsageCandidate(resolveUsageFromPayload(result)) ??
            normalizeUsageCandidate(resolveUsageFromPayload(response));
          const usage = await ensureTextUsage(
            generativeModel,
            requestPayload,
            prompt,
            text,
            usageCandidate
          );

          return { text, usage };
        };

        try {
          const { text: data, usage } = await retryApiCall(() => invokeModel(primary));
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data,
              isMock: false,
              modelUsed: finalModel,
              usedFallback,
              usage
            })
          };
        } catch (error: unknown) {
          if (!shouldUseFallbackModel(error) || !fallback || fallback === primary) {
            return buildMockFailureResponse(headers, error, undefined, {
              modelUsed: primary,
              usedFallback: false
            });
          }

          console.warn(
            `Quota exceeded for model "${primary}". Falling back to available model "${fallback}".`
          );
          usedFallback = true;
          finalModel = fallback;

          try {
            const { text: data, usage } = await retryApiCall(() => invokeModel(fallback));

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data,
                isMock: false,
                modelUsed: finalModel,
                usedFallback,
                usage
              })
            };
          } catch (fallbackError: unknown) {
            console.error('Fallback text generation error:', fallbackError);
            return buildMockFailureResponse(headers, fallbackError, 'Gemini text generation failed after fallback. Using mock response.', {
              modelUsed: finalModel,
              usedFallback: true
            });
          }
        }
      }

      case 'generateImage': {
        const { prompt, model } = requestData as { prompt?: string; model?: string };

        if (!prompt || typeof prompt !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Prompt is required for image generation.' })
          };
        }

        if (prompt.length > MAX_PROMPT_LENGTH) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Prompt exceeds maximum length.' })
          };
        }

        const catalog = await fetchModelCatalog(resolvedApiKey);
        const { primary, fallback } = selectModel(catalog, 'image', typeof model === 'string' ? model : null);

        if (!primary) {
          return buildMockFailureResponse(
            headers,
            new Error('No image generation models available for this API key.'),
            undefined,
            { usedFallback: false }
          );
        }

        let finalModel = primary;
        let usedFallback = false;

        const invokeModel = async (modelName: string) => {
          const imageModel = client.getGenerativeModel({ model: modelName });
          const requestPayload = buildTextRequest(prompt);
          const result = await imageModel.generateContent([prompt]);
          const response = await result.response;

          const candidates = response.candidates;
          if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              const part = candidate.content.parts[0];
              if (part.inlineData && part.inlineData.data) {
                const usageCandidate =
                  normalizeUsageCandidate(resolveUsageFromPayload(result)) ??
                  normalizeUsageCandidate(resolveUsageFromPayload(response));
                const usage = await ensureImageUsage(
                  imageModel,
                  requestPayload,
                  prompt,
                  usageCandidate
                );

                return { image: part.inlineData.data, usage };
              }
            }
          }

          throw new Error('No image data returned from model');
        };

        try {
          const { image: data, usage } = await retryApiCall(() => invokeModel(primary));

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: data,
              isMock: false,
              modelUsed: finalModel,
              usedFallback,
              usage
            })
          };
        } catch (error: unknown) {
          if (!shouldUseFallbackModel(error) || !fallback || fallback === primary) {
            console.error('Image generation error:', error);
            return buildMockFailureResponse(headers, error, undefined, {
              modelUsed: primary,
              usedFallback: false
            });
          }

          console.warn(
            `Quota exceeded for image model "${primary}". Falling back to available model "${fallback}".`
          );
          usedFallback = true;
          finalModel = fallback;

          try {
            const { image: data, usage } = await retryApiCall(() => invokeModel(fallback));

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data,
                isMock: false,
                modelUsed: finalModel,
                usedFallback,
                usage
              })
            };
          } catch (fallbackError: unknown) {
            console.error('Fallback image generation error:', fallbackError);
            return buildMockFailureResponse(headers, fallbackError, 'Gemini image generation failed after fallback. Using mock response.', {
              modelUsed: finalModel,
              usedFallback: true
            });
          }
        }
      }

      case 'listModels': {
        const models = await fetchModelCatalog(resolvedApiKey);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: { models }
          })
        };
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error: unknown) {
    console.error('Function error:', error);
    return buildMockFailureResponse(headers, error);
  }
};

export { handler };