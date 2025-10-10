"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const generative_ai_1 = require("@google/generative-ai");
const GEMINI_KEY_ENV_CANDIDATES = [
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'GOOGLE_AI_API_KEY',
    'GOOGLE_GENAI_API_KEY',
    'VITE_GEMINI_API_KEY'
];
let cachedGeminiClient = null;
let cachedGeminiApiKey = null;
const resolveGeminiApiKey = () => {
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
const getGeminiClient = () => {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
        return { apiKey: null, client: null };
    }
    if (!cachedGeminiClient || cachedGeminiApiKey !== apiKey) {
        cachedGeminiClient = new generative_ai_1.GoogleGenerativeAI(apiKey);
        cachedGeminiApiKey = apiKey;
    }
    return { apiKey, client: cachedGeminiClient };
};
const MODEL_LIST_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_NAMESPACE_PREFIX = 'models/';
const normalizeModelName = (model) => model.startsWith(MODEL_NAMESPACE_PREFIX) ? model : `${MODEL_NAMESPACE_PREFIX}${model}`;
const trimModelNamespace = (model) => model.startsWith(MODEL_NAMESPACE_PREFIX) ? model.slice(MODEL_NAMESPACE_PREFIX.length) : model;
let cachedModelCatalog = null;
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
const isCacheFresh = () => Date.now() - cachedModelCatalogTimestamp < MODEL_CACHE_TTL_MS;
const fetchModelCatalog = async (apiKey) => {
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
    const data = (await response.json());
    cachedModelCatalog = Array.isArray(data.models) ? data.models : [];
    cachedModelCatalogTimestamp = Date.now();
    return cachedModelCatalog;
};
const supportsTextGeneration = (model) => {
    const methods = (model.supportedGenerationMethods ?? []).map(method => method.toLowerCase());
    return methods.some(method => method.includes('generatecontent') || method.includes('createcontent'));
};
const supportsImageGeneration = (model) => {
    const normalizedName = model.name.toLowerCase();
    if (normalizedName.includes('imagen')) {
        return true;
    }
    const methods = (model.supportedGenerationMethods ?? []).map(method => method.toLowerCase());
    return methods.some(method => method.includes('generateimage') || method.includes('createimage'));
};
const selectModel = (models, type, requested) => {
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
    const seen = new Set();
    const resolved = orderedCandidates.filter(name => {
        const normalized = normalizeModelName(name);
        if (seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        
        // Check if model is available and not in quota cooldown
        const modelExists = availableModels.some(model => model.name === normalized);
        if (!modelExists) return false;
        
        const trimmedName = trimModelNamespace(normalized);
        const inCooldown = isModelInQuotaCooldown(trimmedName);
        if (inCooldown) {
            console.warn(`Skipping model ${trimmedName} due to quota cooldown`);
            return false;
        }
        
        return true;
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
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Quota management: track model quota status
const quotaStatusStore = new Map();
const QUOTA_COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes cooldown for quota exceeded models
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
// Retry utility function
async function retryApiCall(fn, retries = 3, baseDelay = 1000, skipQuotaRetry = false) {
    let effectiveBaseDelay = baseDelay;
    if (typeof process !== 'undefined' && process.env) {
        const override = process.env.GEMINI_PROXY_RETRY_BASE_DELAY;
        if (override) {
            const parsed = Number.parseInt(override, 10);
            if (!Number.isNaN(parsed) && parsed >= 0) {
                effectiveBaseDelay = parsed;
            }
        }
        else if (process.env.VITEST) {
            effectiveBaseDelay = Math.min(baseDelay, 10);
        }
    }
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            
            // Check if this is a quota error and skipQuotaRetry is enabled
            if (skipQuotaRetry && isQuotaError(error)) {
                console.warn(`Quota exceeded detected, skipping retries to preserve quota`);
                throw error;
            }
            
            if (i < retries - 1) {
                const delay = effectiveBaseDelay * Math.pow(2, i);
                console.warn(`API call failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

// Quota management functions
const isQuotaError = (error) => {
    const message = extractErrorMessage(error).toLowerCase();
    const status = typeof error === 'object' && error ? error.status : undefined;
    
    // Check for quota-related messages
    if (message.includes('quota') && (message.includes('exceeded') || message.includes('exceed') || message.includes('exhausted'))) {
        return true;
    }
    
    // Check for HTTP 429 status
    if (status === 429) {
        return true;
    }
    
    // Check for specific Google API quota error patterns
    if (message.includes('too many requests') || message.includes('rate limit')) {
        return true;
    }
    
    return false;
};

const markModelAsQuotaExceeded = (modelName) => {
    const key = `quota_${modelName}`;
    quotaStatusStore.set(key, {
        exceededAt: Date.now(),
        cooldownUntil: Date.now() + QUOTA_COOLDOWN_TIME
    });
    console.warn(`Model ${modelName} marked as quota exceeded, cooling down for ${QUOTA_COOLDOWN_TIME / 1000}s`);
};

const isModelInQuotaCooldown = (modelName) => {
    const key = `quota_${modelName}`;
    const status = quotaStatusStore.get(key);
    if (!status) return false;
    
    const now = Date.now();
    if (now > status.cooldownUntil) {
        // Cooldown period has passed, remove the entry
        quotaStatusStore.delete(key);
        return false;
    }
    
    return true;
};

const extractRetryDelay = (error) => {
    // Extract retry delay from Google API error response
    if (typeof error === 'object' && error && error.errorDetails) {
        for (const detail of error.errorDetails) {
            if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && detail.retryDelay) {
                const delay = detail.retryDelay;
                if (typeof delay === 'string') {
                    // Parse duration string like "2.391964919s"
                    const seconds = parseFloat(delay.replace('s', ''));
                    return Math.ceil(seconds * 1000); // Convert to milliseconds
                }
            }
        }
    }
    return null;
};
const extractErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (typeof error === 'object' && error && 'message' in error) {
        return String(error.message);
    }
    return 'Unknown error occurred';
};
const shouldUseFallbackModel = (error) => {
    const message = extractErrorMessage(error).toLowerCase();
    if (message.includes('quota') && (message.includes('exceeded') || message.includes('exceed') || message.includes('exhausted'))) {
        return true;
    }
    if (message.includes('permission denied') || message.includes('not found')) {
        return true;
    }
    const status = typeof error === 'object' && error ? error.status : undefined;
    if (status === 429 || status === 403 || status === 404) {
        return true;
    }
    const errorPayload = typeof error === 'object' && error ? error.error : undefined;
    if (errorPayload) {
        if (typeof errorPayload.status === 'string') {
            const normalizedStatus = errorPayload.status.toLowerCase();
            if (normalizedStatus.includes('resource_exhausted') ||
                normalizedStatus.includes('permission_denied') ||
                normalizedStatus.includes('not_found')) {
                return true;
            }
        }
        if (typeof errorPayload.code === 'number' &&
            (errorPayload.code === 429 || errorPayload.code === 403 || errorPayload.code === 404)) {
            return true;
        }
    }
    return false;
};
const buildMockFailureResponse = (headers, error, overrideMessage, extra) => {
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
const handler = async (event, context) => {
    const { apiKey: resolvedApiKey, client } = getGeminiClient();
    // Validate API key on startup
    if (!resolvedApiKey || !client) {
        console.error('Gemini API key environment variable is not set. Provide one of: ' +
            GEMINI_KEY_ENV_CANDIDATES.join(', '));
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
    const rateLimitKey = clientIP;
    const currentLimit = rateLimitStore.get(rateLimitKey);
    if (currentLimit) {
        if (now > currentLimit.resetTime) {
            // Reset the limit
            rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        }
        else if (currentLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
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
        }
        else {
            currentLimit.count++;
        }
    }
    else {
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
                const { prompt, model } = requestData;
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
                    return buildMockFailureResponse(headers, new Error('No text generation models available for this API key.'), undefined, { usedFallback: false });
                }
                let finalModel = primary;
                let usedFallback = false;
                const invokeModel = async (modelName) => {
                    const generativeModel = client.getGenerativeModel({ model: modelName });
                    const result = await generativeModel.generateContent(prompt);
                    const response = await result.response;
                    return response.text().trim();
                };
                try {
                    const data = await retryApiCall(() => invokeModel(primary), 3, 1000, true);
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            data,
                            isMock: false,
                            modelUsed: finalModel,
                            usedFallback
                        })
                    };
                }
                catch (error) {
                    // Mark model as quota exceeded if it's a quota error
                    if (isQuotaError(error)) {
                        markModelAsQuotaExceeded(primary);
                        
                        // Extract retry delay if available
                        const apiRetryDelay = extractRetryDelay(error);
                        if (apiRetryDelay) {
                            console.warn(`API suggests retry in ${apiRetryDelay}ms`);
                        }
                    }
                    
                    if (!shouldUseFallbackModel(error) || !fallback || fallback === primary) {
                        return buildMockFailureResponse(headers, error, undefined, {
                            modelUsed: primary,
                            usedFallback: false,
                            quotaExceeded: isQuotaError(error),
                            apiRetryDelay: extractRetryDelay(error)
                        });
                    }
                    console.warn(`Quota exceeded for model "${primary}". Falling back to available model "${fallback}".`);
                    usedFallback = true;
                    finalModel = fallback;
                    try {
                        const data = await retryApiCall(() => invokeModel(fallback), 3, 1000, true);
                        return {
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({
                                success: true,
                                data,
                                isMock: false,
                                modelUsed: finalModel,
                                usedFallback
                            })
                        };
                    }
                    catch (fallbackError) {
                        // Mark fallback model as quota exceeded if it's a quota error
                        if (isQuotaError(fallbackError)) {
                            markModelAsQuotaExceeded(fallback);
                        }
                        
                        console.error('Fallback text generation error:', fallbackError);
                        return buildMockFailureResponse(headers, fallbackError, 'Gemini text generation failed after fallback. Using mock response.', {
                            modelUsed: finalModel,
                            usedFallback: true,
                            quotaExceeded: isQuotaError(fallbackError),
                            apiRetryDelay: extractRetryDelay(fallbackError)
                        });
                    }
                }
            }
            case 'generateImage': {
                const { prompt, model } = requestData;
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
                    return buildMockFailureResponse(headers, new Error('No image generation models available for this API key.'), undefined, { usedFallback: false });
                }
                let finalModel = primary;
                let usedFallback = false;
                const invokeModel = async (modelName) => {
                    const imageModel = client.getGenerativeModel({ model: modelName });
                    const result = await imageModel.generateContent([prompt]);
                    const response = await result.response;
                    const candidates = response.candidates;
                    if (candidates && candidates.length > 0) {
                        const candidate = candidates[0];
                        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                            const part = candidate.content.parts[0];
                            if (part.inlineData && part.inlineData.data) {
                                return part.inlineData.data;
                            }
                        }
                    }
                    throw new Error('No image data returned from model');
                };
                try {
                    const data = await retryApiCall(() => invokeModel(primary));
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            data: data,
                            isMock: false,
                            modelUsed: finalModel,
                            usedFallback
                        })
                    };
                }
                catch (error) {
                    // Mark model as quota exceeded if it's a quota error
                    if (isQuotaError(error)) {
                        markModelAsQuotaExceeded(primary);
                        
                        // Extract retry delay if available
                        const apiRetryDelay = extractRetryDelay(error);
                        if (apiRetryDelay) {
                            console.warn(`API suggests retry in ${apiRetryDelay}ms`);
                        }
                    }
                    
                    if (!shouldUseFallbackModel(error) || !fallback || fallback === primary) {
                        console.error('Image generation error:', error);
                        return buildMockFailureResponse(headers, error, undefined, {
                            modelUsed: primary,
                            usedFallback: false,
                            quotaExceeded: isQuotaError(error),
                            apiRetryDelay: extractRetryDelay(error)
                        });
                    }
                    console.warn(`Quota exceeded for image model "${primary}". Falling back to available model "${fallback}".`);
                    usedFallback = true;
                    finalModel = fallback;
                    try {
                        const data = await retryApiCall(() => invokeModel(fallback));
                        return {
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({
                                success: true,
                                data,
                                isMock: false,
                                modelUsed: finalModel,
                                usedFallback
                            })
                        };
                    }
                    catch (fallbackError) {
                        // Mark fallback model as quota exceeded if it's a quota error
                        if (isQuotaError(fallbackError)) {
                            markModelAsQuotaExceeded(fallback);
                        }
                        
                        console.error('Fallback image generation error:', fallbackError);
                        return buildMockFailureResponse(headers, fallbackError, 'Gemini image generation failed after fallback. Using mock response.', {
                            modelUsed: finalModel,
                            usedFallback: true,
                            quotaExceeded: isQuotaError(fallbackError),
                            apiRetryDelay: extractRetryDelay(fallbackError)
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
    }
    catch (error) {
        console.error('Function error:', error);
        return buildMockFailureResponse(headers, error);
    }
};
exports.handler = handler;
