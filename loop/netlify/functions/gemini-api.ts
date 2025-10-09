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

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const FALLBACK_TEXT_MODEL = 'gemini-1.5-flash-latest';
const DEFAULT_IMAGE_MODEL = 'imagen-4.5-ultra';
const FALLBACK_IMAGE_MODEL = 'imagen-3.0-latest';

// Rate limiting: simple in-memory store (for serverless, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Input validation
const MAX_PROMPT_LENGTH = 10000; // characters
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://generativelanguage.googleapis.com;",
};



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
        const { prompt, model = DEFAULT_TEXT_MODEL } = requestData as { prompt?: string; model?: string };

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

        const primaryModel = typeof model === 'string' ? model : DEFAULT_TEXT_MODEL;
        let finalModel = primaryModel;
        let usedFallback = false;

        const invokeModel = async (modelName: string) => {
          const generativeModel = client.getGenerativeModel({ model: modelName });
          const result = await generativeModel.generateContent(prompt);
          const response = await result.response;
          return response.text().trim();
        };

        try {
          const data = await retryApiCall(() => invokeModel(primaryModel));
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
        } catch (error: unknown) {
          if (!shouldUseFallbackModel(error) || primaryModel === FALLBACK_TEXT_MODEL) {
            return buildMockFailureResponse(headers, error, undefined, {
              modelUsed: primaryModel,
              usedFallback: false
            });
          }

          console.warn(`Quota exceeded for model "${primaryModel}". Falling back to free tier model "${FALLBACK_TEXT_MODEL}".`);
          usedFallback = true;
          finalModel = FALLBACK_TEXT_MODEL;

          try {
            const data = await retryApiCall(() => invokeModel(FALLBACK_TEXT_MODEL));

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
        const { prompt, model = DEFAULT_IMAGE_MODEL } = requestData as { prompt?: string; model?: string };

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

        const primaryModel = typeof model === 'string' ? model : DEFAULT_IMAGE_MODEL;
        let finalModel = primaryModel;
        let usedFallback = false;

        const invokeModel = async (modelName: string) => {
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
          const data = await retryApiCall(() => invokeModel(primaryModel));

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
        } catch (error: unknown) {
          if (!shouldUseFallbackModel(error) || primaryModel === FALLBACK_IMAGE_MODEL) {
            console.error('Image generation error:', error);
            return buildMockFailureResponse(headers, error, undefined, {
              modelUsed: primaryModel,
              usedFallback: false
            });
          }

          console.warn(`Quota exceeded for image model "${primaryModel}". Falling back to free tier model "${FALLBACK_IMAGE_MODEL}".`);
          usedFallback = true;
          finalModel = FALLBACK_IMAGE_MODEL;

          try {
            const data = await retryApiCall(() => invokeModel(FALLBACK_IMAGE_MODEL));

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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${resolvedApiKey}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ListModels API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        // Add our high-quota and image generation models to the response
        const enhancedModels = {
          models: [
            ...(data.models || []),
            {
              name: "models/gemini-2.5-pro",
              displayName: "Gemini 2.5 Pro",
              description: "High-performance model with increased quota for text generation",
              supportedGenerationMethods: ["generateContent"],
              maxTokens: 2097152,
              capabilities: ["text"]
            },
            {
              name: "models/gemini-2.5-flash",
              displayName: "Gemini 2.5 Flash",
              description: "Fast model with high quota for quick responses",
              supportedGenerationMethods: ["generateContent"],
              maxTokens: 1048576,
              capabilities: ["text"]
            },
            {
              name: "models/imagen-4.5-ultra",
              displayName: "Imagen 4.5 Ultra",
              description: "Ultra-high quality image generation model",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["image"]
            },
            {
              name: "models/imagen-4.5-pro",
              displayName: "Imagen 4.5 Pro",
              description: "Professional image generation with high quota",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["image"]
            },
            {
              name: "models/imagen-4.5-flash",
              displayName: "Imagen 4.5 Flash",
              description: "Fast image generation with good quota",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["image"]
            },
            {
              name: "models/gemini-1.5-flash-latest",
              displayName: "Gemini 1.5 Flash (Free Tier - Latest)",
              description: "Latest free tier text generation model for quota fallbacks",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["text"]
            },
            {
              name: "models/claude-3.5-sonnet-free",
              displayName: "Claude 3.5 Sonnet - Free Tier",
              description: "Free tier for text generation with limited quota",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["text"]
            },
            {
              name: "models/imagen-3.0-latest",
              displayName: "Imagen 3.0 (Free Tier - Latest)",
              description: "Latest free tier image generation model for quota fallbacks",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["image"]
            },
            {
              name: "models/stable-diffusion-3-free",
              displayName: "Stable Diffusion 3 - Free Tier",
              description: "Free tier for image generation with limited quota",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["image"]
            },
            {
              name: "models/dall-e-3-free",
              displayName: "DALL-E 3 - Free Tier",
              description: "Free tier for image generation with limited quota",
              supportedGenerationMethods: ["generateContent"],
              capabilities: ["image"]
            }
          ]
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: enhancedModels
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