import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

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
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`API call failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Validate API key on startup
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS
      },
      body: JSON.stringify({ error: 'The GEMINI_API_KEY environment variable is not set. Please configure it in your Netlify settings.' })
    };
  } else {
    console.log('GEMINI_API_KEY environment variable is set.');
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
        const { prompt, model = 'gemini-2.5-flash' } = requestData;

        const data = await retryApiCall(async () => {
          const generativeModel = genAI.getGenerativeModel({ model: model });
          const result = await generativeModel.generateContent(prompt);
          const response = await result.response;
          return response.text().trim();
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: data,
            isMock: false
          })
        };
      }

      case 'generateImage': {
        const { prompt, model = 'imagen-4.5-ultra' } = requestData;

        try {
          const data = await retryApiCall(async () => {
            // For Imagen models, we use a different generation approach
            const imageModel = genAI.getGenerativeModel({ model: model });
            const result = await imageModel.generateContent([prompt]);
            const response = await result.response;
            
            // The response should contain image data
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
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: data,
              isMock: false
            })
          };
        } catch (error: unknown) {
          console.error('Image generation error:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Image generation failed',
              isMock: false
            })
          };
        }
      }

      case 'listModels': {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`, {
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
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: message,
        isMock: false 
      })
    };
  }
};

export { handler };