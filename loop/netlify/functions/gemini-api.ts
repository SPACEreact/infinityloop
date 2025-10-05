import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_URL = `${GEMINI_API_BASE_URL}/models/gemini-1.5-flash:generateContent`;

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

export interface GenerationRequest {
  contents: Array<{
    parts: Array<{ text: string }>;
  }>;
}

export interface GenerationResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

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
    console.error('GEMINI_API_KEY environment variable is not set');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS
      },
      body: JSON.stringify({ error: 'Service configuration error' })
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
          'Retry-After': retryAfter.toString()
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
        const { prompt } = requestData;
        
        const data = await retryApiCall(async () => {
          const request: GenerationRequest = {
            contents: [{
              parts: [{ text: prompt }]
            }]
          };

          const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const json: GenerationResponse = await response.json();
          return json.candidates[0]?.content.parts[0]?.text?.trim() ?? '';
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

      /*
      case 'generateImage': {
        //- FIXME: This endpoint is incorrect for Imagen 3 on Vertex AI.
        //- The correct endpoint is likely on the us-central1-aiplatform.googleapis.com domain.
        //- This needs to be updated to a valid Vertex AI endpoint for Imagen 3.
        //- Commenting out this section to prevent runtime errors.
        const { prompt } = requestData;
        // Use Imagen 3 through the correct Vertex AI endpoint
        const IMAGEN_API_URL = `${GEMINI_API_URL}/models/imagen-3.0-generate-001:generateImages`;

        const enhancedPrompt = `${prompt}\n\nDraw from cinematography and visual storytelling expertise when generating this image.`;

        const base64Image = await retryApiCall(async () => {
          const request = {
            instances: [{
              prompt: enhancedPrompt,
              sampleCount: 1
            }],
            parameters: {
              aspectRatio: "1:1",
              safetyFilterLevel: "block_some",
              personGeneration: "allow_adult"
            }
          };

          const response = await fetch(`${IMAGEN_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image API request failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          if (data.predictions && data.predictions.length > 0) {
            return data.predictions[0].bytesBase64Encoded as string;
          }
          throw new Error('No image returned from model');
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: base64Image,
            isMock: false
          })
        };
      }
      */

      case 'listModels': {
        const response = await fetch(`${GEMINI_API_BASE_URL}/models?key=${GEMINI_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ListModels API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            data: data 
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