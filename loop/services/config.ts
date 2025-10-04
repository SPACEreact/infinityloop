interface ApiServiceConfig {
  name: string; // unique service name identifier
  baseUrl: string;
  apiKey?: string;
  description?: string;
}

class ApiConfigManager {
  private static instance: ApiConfigManager;
  private configs: ApiServiceConfig[] = [];

  private constructor() {
    // Load configs from storage or initialize with default chromadb config
    this.loadFromStorage();
    if (this.configs.length === 0) {
      this.configs = [
        {
          name: 'chromadb',
          baseUrl: 'http://localhost:8000',
          apiKey: undefined,
          description: 'ChromaDB or compatible backend',
        },
      ];
      this.saveToStorage();
    }
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
          this.configs = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Backward compatibility: single config object stored previously as 'chroma-api-config'
          this.configs = [
            {
              name: 'chromadb',
              baseUrl: parsed.baseUrl || 'http://localhost:8000',
              apiKey: parsed.apiKey,
              description: 'ChromaDB or compatible backend',
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
      this.configs[index] = { ...this.configs[index], ...newConfig };
    } else {
      // Add new config if not found
      this.configs.push({ name, baseUrl: newConfig.baseUrl || '', apiKey: newConfig.apiKey, description: newConfig.description });
    }
    this.saveToStorage();
  }

  addConfig(config: ApiServiceConfig): void {
    if (!this.configs.find(c => c.name === config.name)) {
      this.configs.push(config);
      this.saveToStorage();
    } else {
      throw new Error(`Config with name '${config.name}' already exists.`);
    }
  }

  removeConfigByName(name: string): void {
    this.configs = this.configs.filter(c => c.name !== name);
    this.saveToStorage();
  }

  isConfigured(name: string): boolean {
    const config = this.getConfigByName(name);
    if (!config) return false;
    return config.baseUrl !== 'http://localhost:8000' || !!config.apiKey;
  }
}

export const apiConfig = ApiConfigManager.getInstance();
