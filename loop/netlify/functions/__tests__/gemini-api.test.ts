import { describe, expect, it, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';

const mockModelImplementations = vi.hoisted(() =>
  new Map<string, (input: unknown) => Promise<{ response: Promise<any> }>>()
);

const defaultModelCatalog = [
  {
    name: 'models/gemini-pro',
    supportedGenerationMethods: ['generateContent']
  },
  {
    name: 'models/gemini-pro-vision',
    supportedGenerationMethods: ['generateContent']
  },
  {
    name: 'models/imagen-3.0-generate-001',
    supportedGenerationMethods: ['generateImage']
  },
  {
    name: 'models/imagen-2.0-generate-001',
    supportedGenerationMethods: ['generateImage']
  }
] as const;

const createModelListResponse = (models = defaultModelCatalog) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ models }),
  text: async () => JSON.stringify({ models })
});

const setFetchModels = (models = defaultModelCatalog) => {
  (global.fetch as unknown as vi.Mock).mockResolvedValue(
    createModelListResponse(models) as unknown as Response
  );
};

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_apiKey: string) {}

      getGenerativeModel({ model }: { model: string }) {
        return {
          generateContent: async (input: unknown) => {
            const implementation = mockModelImplementations.get(model);
            if (!implementation) {
              throw new Error(`No mock registered for model ${model}`);
            }
            return implementation(input);
          }
        };
      }
    }
  };
});

let handler: typeof import('../gemini-api').handler;

const resetEnv = () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.GOOGLE_GENAI_API_KEY;
  delete process.env.VITE_GEMINI_API_KEY;
  delete process.env.GEMINI_PROXY_RETRY_BASE_DELAY;
};

beforeAll(async () => {
  resetEnv();
  process.env.GEMINI_PROXY_RETRY_BASE_DELAY = '0';
  process.env.GEMINI_API_KEY = 'test-key';
  ({ handler } = await import('../gemini-api'));
});

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch;
}

const createHandlerEvent = (body: Record<string, unknown>): HandlerEvent => ({
  httpMethod: 'POST',
  path: '/.netlify/functions/gemini-api',
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  body: JSON.stringify(body),
  isBase64Encoded: false
});

const createQuotaError = () => {
  const error = new Error('Quota exceeded for this project');
  (error as any).status = 429;
  return error;
};

const createAccessDeniedError = (status: number, message: string) => {
  const error = new Error(message);
  (error as any).status = status;
  return error;
};

describe('gemini-api quota fallback', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetEnv();
    process.env.GEMINI_PROXY_RETRY_BASE_DELAY = '0';
    process.env.GEMINI_API_KEY = 'test-key';
    mockModelImplementations.clear();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn();
    setFetchModels();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.restoreAllMocks();
    resetEnv();
  });

  it('falls back to the free tier text model when quota is exceeded', async () => {
    mockModelImplementations.set('gemini-pro', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('gemini-pro-vision', async () => ({
      response: Promise.resolve({
        text: () => 'fallback text response'
      })
    }));

    const response = await handler(
      createHandlerEvent({ action: 'generateContent', prompt: 'Test prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(true);
    expect(payload.data).toBe('fallback text response');
    expect(payload.modelUsed).toBe('gemini-pro-vision');
    expect(payload.usedFallback).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'Quota exceeded for model "gemini-pro". Falling back to available model "gemini-pro-vision".'
    );
  });

  it('returns a mock response when the fallback text model also fails', async () => {
    mockModelImplementations.set('gemini-pro', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('gemini-pro-vision', async () => {
      throw createAccessDeniedError(404, 'Model not found');
    });

    const response = await handler(
      createHandlerEvent({ action: 'generateContent', prompt: 'Test prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(false);
    expect(payload.isMock).toBe(true);
    expect(payload.modelUsed).toBe('gemini-pro-vision');
    expect(payload.usedFallback).toBe(true);
    expect(payload.error).toBe('Gemini text generation failed after fallback. Using mock response.');
    expect(payload.detail).toContain('Model not found');
  });

  it('falls back to Gemini Pro when the requested vision model exceeds quota', async () => {
    mockModelImplementations.set('gemini-pro-vision', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('gemini-pro', async () => ({
      response: Promise.resolve({
        text: () => 'fallback text response'
      })
    }));

    const response = await handler(
      createHandlerEvent({ action: 'generateContent', prompt: 'Test prompt', model: 'gemini-pro-vision' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(true);
    expect(payload.data).toBe('fallback text response');
    expect(payload.modelUsed).toBe('gemini-pro');
    expect(payload.usedFallback).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'Quota exceeded for model "gemini-pro-vision". Falling back to available model "gemini-pro".'
    );
  });

  it('falls back to the free tier image model when quota is exceeded', async () => {
    mockModelImplementations.set('imagen-3.0-generate-001', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('imagen-2.0-generate-001', async () => ({
      response: Promise.resolve({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'image-data'
                  }
                }
              ]
            }
          }
        ]
      })
    }));

    const response = await handler(
      createHandlerEvent({ action: 'generateImage', prompt: 'Image prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(true);
    expect(payload.data).toBe('image-data');
    expect(payload.modelUsed).toBe('imagen-2.0-generate-001');
    expect(payload.usedFallback).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'Quota exceeded for image model "imagen-3.0-generate-001". Falling back to available model "imagen-2.0-generate-001".'
    );
  });

  it('returns a mock response when the fallback image model also fails', async () => {
    mockModelImplementations.set('imagen-3.0-generate-001', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('imagen-2.0-generate-001', async () => {
      throw createAccessDeniedError(403, 'Permission denied');
    });

    const response = await handler(
      createHandlerEvent({ action: 'generateImage', prompt: 'Image prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(false);
    expect(payload.isMock).toBe(true);
    expect(payload.modelUsed).toBe('imagen-2.0-generate-001');
    expect(payload.usedFallback).toBe(true);
    expect(payload.error).toBe('Gemini image generation failed after fallback. Using mock response.');
    expect(payload.detail).toContain('Permission denied');
  });

  it('falls back to the free tier text model when access is denied', async () => {
    mockModelImplementations.set('gemini-pro', async () => {
      throw createAccessDeniedError(403, 'Permission denied for project');
    });

    mockModelImplementations.set('gemini-pro-vision', async () => ({
      response: Promise.resolve({
        text: () => 'fallback text response'
      })
    }));

    const response = await handler(
      createHandlerEvent({ action: 'generateContent', prompt: 'Test prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(true);
    expect(payload.data).toBe('fallback text response');
    expect(payload.modelUsed).toBe('gemini-pro-vision');
    expect(payload.usedFallback).toBe(true);
  });

  it('falls back to the free tier image model when the primary is not found', async () => {
    mockModelImplementations.set('imagen-3.0-generate-001', async () => {
      throw createAccessDeniedError(404, 'Model not found');
    });

    mockModelImplementations.set('imagen-2.0-generate-001', async () => ({
      response: Promise.resolve({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'image-data'
                  }
                }
              ]
            }
          }
        ]
      })
    }));

    const response = await handler(
      createHandlerEvent({ action: 'generateImage', prompt: 'Image prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(true);
    expect(payload.data).toBe('image-data');
    expect(payload.modelUsed).toBe('imagen-2.0-generate-001');
    expect(payload.usedFallback).toBe(true);
  });
});

describe('gemini-api configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetEnv();
  });

  it('allows using GOOGLE_API_KEY as a fallback secret name', async () => {
    resetEnv();
    process.env.GOOGLE_API_KEY = 'secondary-key';
    mockModelImplementations.clear();
    global.fetch = vi.fn();
    setFetchModels();
    mockModelImplementations.set('gemini-pro', async () => ({
      response: Promise.resolve({
        text: () => 'ok'
      })
    }));

    const response = await handler(
      createHandlerEvent({ action: 'generateContent', prompt: 'Test prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(true);
  });

  it('returns a configuration error when no compatible environment variable is present', async () => {
    resetEnv();
    mockModelImplementations.clear();
    global.fetch = vi.fn();
    setFetchModels();
    const response = await handler(
      createHandlerEvent({ action: 'generateContent', prompt: 'Test prompt' }),
      {} as HandlerContext
    );

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Service configuration error');
    expect(payload.detail).toBe('Gemini API key is not configured.');
    expect(payload.isMock).toBe(true);
  });
});
