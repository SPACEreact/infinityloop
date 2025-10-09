// netlify/functions/gemini-api.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, Modality } from "@google/genai";
var GEMINI_KEY_ENV_CANDIDATES = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_GENAI_API_KEY",
  "VITE_GEMINI_API_KEY"
];
var cachedGeminiClient = null;
var cachedGenAIClient = null;
var cachedGeminiApiKey = null;
var resolveGeminiApiKey = () => {
  for (const envName of GEMINI_KEY_ENV_CANDIDATES) {
    const rawValue = process.env[envName];
    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed) {
        if (envName !== "GEMINI_API_KEY") {
          console.info(`Resolved Gemini API key from ${envName} environment variable.`);
        }
        return trimmed;
      }
    }
  }
  return null;
};
var getGeminiClient = () => {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { apiKey: null, client: null, genAI: null };
  }
  if (!cachedGeminiClient || !cachedGenAIClient || cachedGeminiApiKey !== apiKey) {
    cachedGeminiClient = new GoogleGenerativeAI(apiKey);
    cachedGenAIClient = new GoogleGenAI({ apiKey });
    cachedGeminiApiKey = apiKey;
  }
  return { apiKey, client: cachedGeminiClient, genAI: cachedGenAIClient };
};
var MODEL_LIST_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
var MODEL_NAMESPACE_PREFIX = "models/";
var normalizeModelName = (model) => model.startsWith(MODEL_NAMESPACE_PREFIX) ? model : `${MODEL_NAMESPACE_PREFIX}${model}`;
var trimModelNamespace = (model) => model.startsWith(MODEL_NAMESPACE_PREFIX) ? model.slice(MODEL_NAMESPACE_PREFIX.length) : model;
var cachedModelCatalog = null;
var cachedModelCatalogTimestamp = 0;
var MODEL_CACHE_TTL_MS = 5 * 60 * 1e3;
var TEXT_MODEL_PRIORITY = [
  "models/gemini-1.5-pro-latest",
  "models/gemini-1.5-flash-latest",
  "models/gemini-1.0-pro",
  "models/gemini-1.0-pro-001"
];
var IMAGE_MODEL_PRIORITY = [
  "models/gemini-2.5-flash-image",
  "models/gemini-2.0-flash-exp-image-generation",
  "models/gemini-2.0-flash-preview-image-generation",
  "models/gemini-2.5-flash-image-preview"
];
var isCacheFresh = () => Date.now() - cachedModelCatalogTimestamp < MODEL_CACHE_TTL_MS;
var fetchModelCatalog = async (apiKey) => {
  if (cachedModelCatalog && isCacheFresh()) {
    return cachedModelCatalog;
  }
  const response = await fetch(`${MODEL_LIST_ENDPOINT}?key=${apiKey}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ListModels API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  const data = await response.json();
  cachedModelCatalog = Array.isArray(data.models) ? data.models : [];
  cachedModelCatalogTimestamp = Date.now();
  return cachedModelCatalog;
};
var supportsTextGeneration = (model) => {
  const methods = (model.supportedGenerationMethods ?? []).map((method) => method.toLowerCase());
  return methods.some((method) => method.includes("generatecontent") || method.includes("createcontent"));
};
var supportsImageGeneration = (model) => {
  const normalizedName = model.name.toLowerCase();
  if (normalizedName.includes("imagen")) {
    return true;
  }
  if (normalizedName.includes("image-generation") || normalizedName.includes("flash-image")) {
    return true;
  }
  const methods = (model.supportedGenerationMethods ?? []).map((method) => method.toLowerCase());
  return methods.some((method) => 
    method.includes("generateimage") || 
    method.includes("createimage") || 
    method.includes("predict") ||
    method.includes("generatecontent")
  );
};
var selectModel = (models, type, requested) => {
  const predicate = type === "text" ? supportsTextGeneration : supportsImageGeneration;
  const availableModels = models.filter((model) => predicate(model));
  if (!availableModels.length) {
    return { primary: null, fallback: null };
  }
  const requestedName = requested ? normalizeModelName(requested) : null;
  const priorityList = type === "text" ? TEXT_MODEL_PRIORITY : IMAGE_MODEL_PRIORITY;
  const orderedCandidates = [
    ...requestedName ? [requestedName] : [],
    ...priorityList,
    ...availableModels.map((model) => model.name)
  ];
  const seen = /* @__PURE__ */ new Set();
  const resolved = orderedCandidates.filter((name) => {
    const normalized = normalizeModelName(name);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return availableModels.some((model) => model.name === normalized);
  });
  const [primary = null, fallback = null] = resolved;
  const trimmedPrimary = primary ? trimModelNamespace(primary) : null;
  const trimmedFallback = fallback ? trimModelNamespace(fallback) : null;
  return {
    primary: trimmedPrimary,
    fallback: trimmedFallback && trimmedFallback === trimmedPrimary ? null : trimmedFallback
  };
};
var rateLimitStore = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW = 60 * 1e3;
var RATE_LIMIT_MAX_REQUESTS = 10;
var MAX_PROMPT_LENGTH = 100000;
var MAX_REQUEST_SIZE = 2 * 1024 * 1024;
var SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://generativelanguage.googleapis.com;"
};
async function retryApiCall(fn, retries = 3, baseDelay = 1e3) {
  let effectiveBaseDelay = baseDelay;
  if (typeof process !== "undefined" && process.env) {
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
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        const delay = effectiveBaseDelay * Math.pow(2, i);
        console.warn(`API call failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
var extractErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "Unknown error occurred";
};
var shouldUseFallbackModel = (error) => {
  const message = extractErrorMessage(error).toLowerCase();
  if (message.includes("quota") && (message.includes("exceeded") || message.includes("exceed") || message.includes("exhausted"))) {
    return true;
  }
  if (message.includes("permission denied") || message.includes("not found")) {
    return true;
  }
  const status = typeof error === "object" && error ? error.status : void 0;
  if (status === 429 || status === 403 || status === 404) {
    return true;
  }
  const errorPayload = typeof error === "object" && error ? error.error : void 0;
  if (errorPayload) {
    if (typeof errorPayload.status === "string") {
      const normalizedStatus = errorPayload.status.toLowerCase();
      if (normalizedStatus.includes("resource_exhausted") || normalizedStatus.includes("permission_denied") || normalizedStatus.includes("not_found")) {
        return true;
      }
    }
    if (typeof errorPayload.code === "number" && (errorPayload.code === 429 || errorPayload.code === 403 || errorPayload.code === 404)) {
      return true;
    }
  }
  return false;
};
var buildMockFailureResponse = (headers, error, overrideMessage, extra) => {
  const detailMessage = extractErrorMessage(error);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: false,
      error: overrideMessage ?? "Gemini request failed. Using mock response.",
      detail: detailMessage,
      isMock: true,
      ...extra
    })
  };
};
var handler = async (event, context) => {
  const { apiKey: resolvedApiKey, client, genAI } = getGeminiClient();
  if (!resolvedApiKey || !client || !genAI) {
    console.error(
      "Gemini API key environment variable is not set. Provide one of: " + GEMINI_KEY_ENV_CANDIDATES.join(", ")
    );
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...SECURITY_HEADERS
      },
      body: JSON.stringify({
        success: false,
        error: "Service configuration error",
        detail: "Gemini API key is not configured.",
        isMock: true
      })
    };
  }
  const clientIP = event.headers["x-forwarded-for"] || event.headers["x-real-ip"] || "unknown";
  const now = Date.now();
  const rateLimitKey = clientIP;
  const currentLimit = rateLimitStore.get(rateLimitKey);
  if (currentLimit) {
    if (now > currentLimit.resetTime) {
      rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else if (currentLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      const retryAfter = Math.ceil((currentLimit.resetTime - now) / 1e3);
      return {
        statusCode: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          ...SECURITY_HEADERS
        },
        body: JSON.stringify({ error: "Rate limit exceeded. Please try again later." })
      };
    } else {
      currentLimit.count++;
    }
  } else {
    rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    ...SECURITY_HEADERS
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" })
      };
    }
    if (event.body.length > MAX_REQUEST_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: "Request too large" })
      };
    }
    const { action, ...requestData } = JSON.parse(event.body);
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${event.httpMethod} ${event.path} - Action: ${action} - IP: ${clientIP}`);
    switch (action) {
      case "generateContent": {
        const { prompt, model } = requestData;
        if (!prompt || typeof prompt !== "string") {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Prompt is required for text generation." })
          };
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Prompt exceeds maximum length." })
          };
        }
        const catalog = await fetchModelCatalog(resolvedApiKey);
        const { primary, fallback } = selectModel(catalog, "text", typeof model === "string" ? model : null);
        if (!primary) {
          return buildMockFailureResponse(
            headers,
            new Error("No text generation models available for this API key."),
            void 0,
            { usedFallback: false }
          );
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
          const data = await retryApiCall(() => invokeModel(primary));
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
        } catch (error) {
          if (!shouldUseFallbackModel(error) || !fallback || fallback === primary) {
            return buildMockFailureResponse(headers, error, void 0, {
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
          } catch (fallbackError) {
            console.error("Fallback text generation error:", fallbackError);
            return buildMockFailureResponse(headers, fallbackError, "Gemini text generation failed after fallback. Using mock response.", {
              modelUsed: finalModel,
              usedFallback: true
            });
          }
        }
      }
      case "generateImage": {
        const { prompt, model } = requestData;
        if (!prompt || typeof prompt !== "string") {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Prompt is required for image generation." })
          };
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Prompt exceeds maximum length." })
          };
        }
        const catalog = await fetchModelCatalog(resolvedApiKey);
        const { primary, fallback } = selectModel(catalog, "image", typeof model === "string" ? model : null);
        if (!primary) {
          return buildMockFailureResponse(
            headers,
            new Error("No image generation models available for this API key."),
            void 0,
            { usedFallback: false }
          );
        }
        let finalModel = primary;
        let usedFallback = false;
        const invokeModel = async (modelName) => {
          // Use the newer @google/genai SDK for image generation
          const trimmedModelName = trimModelNamespace(modelName);
          
          const response = await genAI.models.generateContent({
            model: trimmedModelName,
            contents: prompt,
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE]
            }
          });
          
          // Look for image data in the response
          const candidates = response.candidates;
          if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  return part.inlineData.data;
                }
              }
            }
          }
          
          throw new Error("No image data returned from model");
        };
        try {
          const data = await retryApiCall(() => invokeModel(primary));
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
        } catch (error) {
          if (!shouldUseFallbackModel(error) || !fallback || fallback === primary) {
            console.error("Image generation error:", error);
            return buildMockFailureResponse(headers, error, void 0, {
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
          } catch (fallbackError) {
            console.error("Fallback image generation error:", fallbackError);
            return buildMockFailureResponse(headers, fallbackError, "Gemini image generation failed after fallback. Using mock response.", {
              modelUsed: finalModel,
              usedFallback: true
            });
          }
        }
      }
      case "listModels": {
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
          body: JSON.stringify({ error: "Invalid action" })
        };
    }
  } catch (error) {
    console.error("Function error:", error);
    return buildMockFailureResponse(headers, error);
  }
};
export {
  handler
};
