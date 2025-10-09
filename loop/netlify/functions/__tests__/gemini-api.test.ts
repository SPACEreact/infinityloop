import { describe, expect, it, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';

const mockModelImplementations = vi.hoisted(() =>
  new Map<string, (input: unknown) => Promise<{ response: Promise<any> }>>()
);

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

beforeAll(async () => {
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
    mockModelImplementations.clear();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('falls back to the free tier text model when quota is exceeded', async () => {
    mockModelImplementations.set('gemini-2.5-flash', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('gemini-1.5-flash-latest', async () => ({
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
    expect(payload.modelUsed).toBe('gemini-1.5-flash-latest');
    expect(payload.usedFallback).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'Quota exceeded for model "gemini-2.5-flash". Falling back to free tier model "gemini-1.5-flash-latest".'
    );
  });

  it('falls back to the free tier image model when quota is exceeded', async () => {
    mockModelImplementations.set('imagen-4.5-ultra', async () => {
      throw createQuotaError();
    });

    mockModelImplementations.set('imagen-3.0-latest', async () => ({
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
    expect(payload.modelUsed).toBe('imagen-3.0-latest');
    expect(payload.usedFallback).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'Quota exceeded for image model "imagen-4.5-ultra". Falling back to free tier model "imagen-3.0-latest".'
    );
  });

  it('falls back to the free tier text model when access is denied', async () => {
    mockModelImplementations.set('gemini-2.5-flash', async () => {
      throw createAccessDeniedError(403, 'Permission denied for project');
    });

    mockModelImplementations.set('gemini-1.5-flash-latest', async () => ({
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
    expect(payload.modelUsed).toBe('gemini-1.5-flash-latest');
    expect(payload.usedFallback).toBe(true);
  });

  it('falls back to the free tier image model when the primary is not found', async () => {
    mockModelImplementations.set('imagen-4.5-ultra', async () => {
      throw createAccessDeniedError(404, 'Model not found');
    });

    mockModelImplementations.set('imagen-3.0-latest', async () => ({
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
    expect(payload.modelUsed).toBe('imagen-3.0-latest');
    expect(payload.usedFallback).toBe(true);
  });
});
