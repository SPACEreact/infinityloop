import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'api-services-config';

describe('ApiConfigManager environment defaults', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('uses the VITE_GEMINI_API_KEY env var for the Gemini config', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'env-gemini-key');
    vi.stubEnv('VITE_GEMINI_API_BASE_URL', 'https://env.example.com');

    const { apiConfig } = await import('./config');

    expect(apiConfig.getConfigByName('gemini')?.apiKey).toBe(
      import.meta.env.VITE_GEMINI_API_KEY,
    );
  });

  it('fills missing Gemini API key for an existing config from the env var', async () => {
    const existingConfigs = [
      {
        name: 'gemini',
        baseUrl: 'https://stored.example.com',
        enabled: true,
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingConfigs));

    vi.stubEnv('VITE_GEMINI_API_KEY', 'merged-gemini-key');

    const { apiConfig } = await import('./config');

    const geminiConfig = apiConfig.getConfigByName('gemini');

    expect(geminiConfig?.apiKey).toBe('merged-gemini-key');
    expect(geminiConfig?.baseUrl).toBe('https://stored.example.com');
  });

  it('fills a blank Gemini API key from the env var', async () => {
    const existingConfigs = [
      {
        name: 'gemini',
        baseUrl: 'https://stored.example.com',
        apiKey: '   ',
        enabled: true,
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingConfigs));

    vi.stubEnv('VITE_GEMINI_API_KEY', 'non-empty-gemini-key');

    const { apiConfig } = await import('./config');

    const geminiConfig = apiConfig.getConfigByName('gemini');

    expect(geminiConfig?.apiKey).toBe('non-empty-gemini-key');
    expect(geminiConfig?.baseUrl).toBe('https://stored.example.com');
  });
});
