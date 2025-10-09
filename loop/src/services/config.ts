export interface ApiServiceConfig {
  name: string; // unique service name identifier
  baseUrl: string;
  apiKey?: string;
  description?: string;
  enabled: boolean;
}

class ApiConfigManager {
  private static instance: ApiConfigManager;
  private configs: ApiServiceConfig[] = [];

  private constructor() {
    // Load configs from storage and enrich them with any build-time defaults
    this.loadFromStorage();
    const didApplyEnvDefaults = this.applyEnvDefaults();

    if (this.configs.length === 0) {
      // No stored configs and no environment defaults – fall back to a local ChromaDB server
      this.configs = [this.createLocalChromaConfig()];
      this.saveToStorage();
    } else if (didApplyEnvDefaults) {
      // Persist any environment-derived defaults for future sessions
      this.saveToStorage();
    }
  }

  private createLocalChromaConfig(): ApiServiceConfig {
    const replitDomain = window.location.hostname;
    const baseUrl = replitDomain.includes('replit.dev')
      ? `https://${replitDomain}:8000`
      : 'http://localhost:8000';

    return {
      name: 'chromadb',
      baseUrl,
      apiKey: undefined,
      description: 'ChromaDB or compatible backend',
      enabled: true,
    };
  }

  private applyEnvDefaults(): boolean {
    let didMutate = false;

    const envChromaBaseUrl = (import.meta.env.VITE_CHROMA_API_BASE_URL
      || import.meta.env.VITE_CHROMADB_API_BASE_URL
      || '').trim();
    const envChromaApiKey = (import.meta.env.VITE_CHROMA_API_KEY
      || import.meta.env.VITE_CHROMADB_API_KEY
      || '').trim();
    const envGeminiBaseUrl = (import.meta.env.VITE_GEMINI_API_BASE_URL || '').trim();
    const envGeminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

    const envDefaults: ApiServiceConfig[] = [];

    if (envChromaBaseUrl) {
      envDefaults.push({
        name: 'chromadb',
        baseUrl: envChromaBaseUrl,
        apiKey: envChromaApiKey || undefined,
        description: 'ChromaDB or compatible backend',
        enabled: true,
      });
    }

    if (envGeminiApiKey) {
      envDefaults.push({
        name: 'gemini',
        baseUrl: envGeminiBaseUrl,
        apiKey: undefined,
        description: 'Gemini proxy endpoint',
        enabled: true,
      });
    }

    for (const defaultConfig of envDefaults) {
      const existingIndex = this.configs.findIndex(config => config.name === defaultConfig.name);

      if (existingIndex === -1) {
        this.configs.push(defaultConfig);
        didMutate = true;
        continue;
      }

      const existing = this.configs[existingIndex];
      const localChromaBase = this.createLocalChromaConfig().baseUrl;

      const shouldUpdateBaseUrl =
        !!defaultConfig.baseUrl &&
        (!existing.baseUrl || existing.baseUrl === localChromaBase);
      const shouldUpdateApiKey = !!defaultConfig.apiKey && !existing.apiKey;
      const shouldUpdateDescription =
        !!defaultConfig.description && !existing.description;

      if (shouldUpdateBaseUrl || shouldUpdateApiKey || shouldUpdateDescription) {
        this.configs[existingIndex] = {
          ...existing,
          baseUrl: shouldUpdateBaseUrl ? defaultConfig.baseUrl : existing.baseUrl,
          apiKey: shouldUpdateApiKey ? defaultConfig.apiKey : existing.apiKey,
          description: shouldUpdateDescription ? defaultConfig.description : existing.description,
        };
        didMutate = true;
      }
    }

    return didMutate;
  }

  static getInstance(): ApiConfigManager {
    if (!ApiConfigManager.instance) {
      ApiConfigManager.instance = new ApiConfigManager();
    }
    return ApiConfigManager.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('api-services-config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.configs = parsed.map((config: ApiServiceConfig) => ({
            ...config,
            enabled: config.enabled ?? true,
          }));
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Backward compatibility: single config object stored previously as 'chroma-api-config'
          this.configs = [
            {
              name: 'chromadb',
              baseUrl: parsed.baseUrl || 'http://localhost:8000',
              apiKey: parsed.apiKey,
              description: 'ChromaDB or compatible backend',
              enabled: parsed.enabled ?? true,
            },
          ];
          this.saveToStorage();
        }
      } else {
        // Try loading old single config key for backward compatibility
        const oldStored = localStorage.getItem('chroma-api-config');
        if (oldStored) {
          const oldParsed = JSON.parse(oldStored);
          this.configs = [
            {
              name: 'chromadb',
              baseUrl: oldParsed.baseUrl || 'http://localhost:8000',
              apiKey: oldParsed.apiKey,
              description: 'ChromaDB or compatible backend',
              enabled: oldParsed.enabled ?? true,
            },
          ];
          this.saveToStorage();
          localStorage.removeItem('chroma-api-config');
        }
      }
    } catch (error) {
      console.warn('Failed to load API configs from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('api-services-config', JSON.stringify(this.configs));
    } catch (error) {
      console.warn('Failed to save API configs to storage:', error);
    }
  }

  getConfigs(): ApiServiceConfig[] {
    return [...this.configs];
  }

  getConfigByName(name: string): ApiServiceConfig | undefined {
    return this.configs.find(c => c.name === name);
  }

  updateConfigByName(name: string, newConfig: Partial<ApiServiceConfig>): void {
    const index = this.configs.findIndex(c => c.name === name);
    if (index !== -1) {
      this.configs[index] = {
        ...this.configs[index],
        ...newConfig,
        enabled: newConfig.enabled ?? this.configs[index].enabled ?? true,
      };
    } else {
      // Add new config if not found
      this.configs.push({
        name,
        baseUrl: newConfig.baseUrl || '',
        apiKey: newConfig.apiKey,
        description: newConfig.description,
        enabled: newConfig.enabled ?? true,
      });
    }
    this.saveToStorage();
  }

  addConfig(config: ApiServiceConfig): void {
    if (!this.configs.find(c => c.name === config.name)) {
      this.configs.push({ ...config, enabled: config.enabled ?? true });
      this.saveToStorage();
    } else {
      throw new Error(`Config with name '${config.name}' already exists.`);
    }
  }

  removeConfigByName(name: string): void {
    this.configs = this.configs.filter(c => c.name !== name);
    this.saveToStorage();
  }

  setEnabled(name: string, enabled: boolean): void {
    const index = this.configs.findIndex(c => c.name === name);
    if (index === -1) {
      throw new Error(`Config with name '${name}' not found.`);
    }

    this.configs[index] = {
      ...this.configs[index],
      enabled,
    };

    this.saveToStorage();
  }

  isEnabled(name: string): boolean {
    const config = this.getConfigByName(name);
    return config?.enabled ?? false;
  }

  isConfigured(name: string): boolean {
    const config = this.getConfigByName(name);
    if (!config || !config.enabled) return false;

    if (name === 'chromadb') {
      const localBase = this.createLocalChromaConfig().baseUrl;
      return !!config.baseUrl && config.baseUrl !== localBase;
    }

    if (name === 'gemini') {
      return !!config.apiKey;
    }

    return !!config.baseUrl || !!config.apiKey;
  }
}

export const apiConfig = ApiConfigManager.getInstance();
