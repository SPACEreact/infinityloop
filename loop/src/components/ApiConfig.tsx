import React, { useState, useEffect } from 'react';
import { apiConfig, type ApiServiceConfig } from '../services/config';
import { XMarkIcon, Cog6ToothIcon, PlusIcon, PencilIcon, TrashIcon } from './IconComponents';

interface ApiConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditingConfig extends ApiServiceConfig {
  isNew?: boolean;
  originalName?: string;
}

export const ApiConfig: React.FC<ApiConfigProps> = ({ isOpen, onClose }) => {
  const [configs, setConfigs] = useState<ApiServiceConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<EditingConfig | null>(null);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    if (isOpen) {
      setConfigs(apiConfig.getConfigs());
      setTestResults({});
      setEditingConfig(null);
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    if (!editingConfig) return;

    const normalizedName = editingConfig.name.trim().toLowerCase();
    const baseUrl = editingConfig.baseUrl.trim();
    const apiKey = editingConfig.apiKey?.trim() || undefined;
    const description = editingConfig.description?.trim();

    if (editingConfig.isNew) {
      try {
        apiConfig.addConfig({
          name: normalizedName,
          baseUrl,
          apiKey,
          description,
          enabled: editingConfig.enabled,
        });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to add config');
        return;
      }
    } else {
      const lookupName = editingConfig.originalName ?? editingConfig.name;
      apiConfig.updateConfigByName(lookupName, {
        name: normalizedName,
        baseUrl,
        apiKey,
        description,
        enabled: editingConfig.enabled,
      });
    }

    setConfigs(apiConfig.getConfigs());
    setEditingConfig(null);
  };

  const handleDeleteConfig = (name: string) => {
    if (confirm(`Delete API configuration for '${name}'?`)) {
      apiConfig.removeConfigByName(name);
      setConfigs(apiConfig.getConfigs());
    }
  };

  const handleTestConnection = async (config: ApiServiceConfig) => {
    setTestingService(config.name);
    setTestResults(prev => ({ ...prev, [config.name]: { success: false, message: 'Testing...' } }));

    try {
      const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
      const GEMINI_TEST_MODEL = 'gemini-2.5-flash';

      const normalizeBaseUrl = (raw: string, fallback = ''): string => {
        const trimmed = raw.trim();
        if (!trimmed) {
          return fallback;
        }
        return trimmed.replace(/\/+$/, '');
      };

      const providedBase = config.baseUrl ?? '';
      const normalizedBase = normalizeBaseUrl(providedBase);

      const isGeminiService =
        config.name.toLowerCase() === 'gemini' || normalizedBase.includes('generativelanguage');

      const effectiveBase = isGeminiService
        ? normalizeBaseUrl(normalizedBase || DEFAULT_GEMINI_BASE_URL, DEFAULT_GEMINI_BASE_URL)
        : normalizedBase;

      if (!effectiveBase) {
        throw new Error('Base URL is required for testing');
      }

      const requestInit: RequestInit = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      };

      let requestUrl = `${effectiveBase}/`;

      if (isGeminiService) {
        const apiKey = config.apiKey?.trim();
        if (!apiKey) {
          throw new Error('An API key is required to test Gemini connectivity');
        }

        requestUrl = `${effectiveBase}/models/${GEMINI_TEST_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
        requestInit.method = 'POST';
        requestInit.body = JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'ping' }],
            },
          ],
        });
      } else if (!requestInit.headers) {
        requestInit.headers = { 'Content-Type': 'application/json' };
      }

      const response = await fetch(requestUrl, requestInit);

      if (response.ok) {
        setTestResults(prev => ({ ...prev, [config.name]: { success: true, message: 'Connection successful!' } }));
      } else {
        const statusText = `${response.status} ${response.statusText}`.trim() || `${response.status}`;
        const rawBody = await response.text();
        let errorMessage = statusText;

        if (rawBody) {
          try {
            const parsed = JSON.parse(rawBody);
            const jsonMessage =
              parsed?.error?.message ||
              parsed?.error?.status ||
              parsed?.message ||
              parsed?.detail ||
              parsed?.details?.[0]?.message;

            if (jsonMessage && typeof jsonMessage === 'string') {
              errorMessage = `${statusText} - ${jsonMessage}`;
            } else {
              errorMessage = `${statusText} - ${JSON.stringify(parsed)}`;
            }
          } catch {
            errorMessage = `${statusText} - ${rawBody}`;
          }
        }

        setTestResults(prev => ({ ...prev, [config.name]: { success: false, message: `Connection failed: ${errorMessage}` } }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [config.name]: { success: false, message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` } }));
    } finally {
      setTestingService(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <Cog6ToothIcon className="w-8 h-8" title="API configuration" />
            <h2 className="text-2xl font-bold ink-strong">API Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--ink))] transition-colors"
            aria-label="Close API configuration"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {editingConfig ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold ink-strong">
                {editingConfig.isNew ? 'Add New API Service' : `Edit ${editingConfig.name}`}
              </h3>

              <div>
                <label className="block text-sm font-medium ink-strong mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  value={editingConfig.name}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      name: editingConfig.isNew ? e.target.value.toLowerCase() : e.target.value,
                    })
                  }
                  onBlur={() =>
                    setEditingConfig(current =>
                      current && current.isNew
                        ? {
                            ...current,
                            name: current.name.trim().toLowerCase(),
                          }
                        : current,
                    )
                  }
                  placeholder="e.g., chromadb, gemini, openai"
                  className="panel-input w-full px-3 py-2"
                  disabled={!editingConfig.isNew}
                />
                <p className="mt-1 text-xs ink-subtle">
                  Use the canonical identifier for the service (for example, <code>gemini</code>, <code>chromadb</code>, or
                  <code>openai</code>). This name must match the integration ID used elsewhere in the app.
                </p>
                {!editingConfig.isNew && (
                  <p className="mt-1 text-xs ink-subtle italic">
                    Existing service identifiers are locked to keep stored configurations aligned with integrations such as
                    <code>apiConfig.getConfigByName('gemini')</code>.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-1">
                  Base URL
                </label>
                <input
                  type="url"
                  value={editingConfig.baseUrl}
                  onChange={(e) => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                  placeholder="https://your-api-endpoint.com"
                  className="panel-input w-full px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-1">
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  value={editingConfig.apiKey || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="panel-input w-full px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={editingConfig.description || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                  placeholder="Brief description of the service"
                  className="panel-input w-full px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-1">
                  Service Status
                </label>
                <label className="inline-flex items-center gap-2 text-sm ink-strong">
                  <span>{editingConfig.enabled ? 'Enabled' : 'Disabled'}</span>
                  <input
                    type="checkbox"
                    checked={editingConfig.enabled}
                    onChange={(event) => setEditingConfig({ ...editingConfig, enabled: event.target.checked })}
                    className="h-4 w-4 accent-blue-500"
                  />
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingConfig(null)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={!editingConfig.name.trim() || !editingConfig.baseUrl.trim()}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold ink-strong">Configured API Services</h3>
                <button
                  onClick={() =>
                    setEditingConfig({
                      name: '',
                      baseUrl: '',
                      apiKey: '',
                      description: '',
                      enabled: true,
                      isNew: true,
                    })
                  }
                  className="flex items-center gap-2 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Service
                </button>
              </div>

              {configs.length === 0 ? (
                <p className="text-center ink-subtle py-8">No API services configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {configs.map((config) => (
                    <div key={config.name} className="border border-[hsl(var(--border))] rounded-lg p-4">
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium ink-strong">{config.name}</h4>
                            {config.description && <p className="text-sm ink-subtle">{config.description}</p>}
                          </div>
                          <div className="flex gap-2 items-center">
                            <label className="flex items-center gap-2 text-sm ink-strong">
                              <span>{config.enabled ? 'Enabled' : 'Disabled'}</span>
                              <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(event) => {
                                  try {
                                    apiConfig.setEnabled(config.name, event.target.checked);
                                    setConfigs(apiConfig.getConfigs());
                                  } catch (error) {
                                    console.error('Failed to update service status:', error);
                                    alert('Failed to update service status. Please try again.');
                                  }
                                }}
                                className="h-4 w-4 accent-blue-500"
                                aria-label={`Toggle ${config.name} service`}
                              />
                            </label>
                            <button
                              onClick={() => setEditingConfig({ ...config, originalName: config.name, isNew: false })}
                              className="text-blue-500 hover:text-blue-700"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteConfig(config.name)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm ink-subtle mb-2">
                        <p>URL: {config.baseUrl}</p>
                        <p>Key: {config.apiKey ? '••••••••' : 'None'}</p>
                      </div>

                      {testResults[config.name] && (
                        <div className={`p-2 rounded-md text-sm mb-2 ${testResults[config.name].success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {testResults[config.name].message}
                        </div>
                      )}

                      <button
                        onClick={() => handleTestConnection(config)}
                        disabled={testingService === config.name}
                        className="bg-gray-500 text-white py-1 px-3 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {testingService === config.name ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-sm ink-subtle space-y-2">
            <p><strong>Note:</strong> Configure multiple AI API services for different features. Each service requires its own endpoint and API key.</p>
            <p>
              Common services include ChromaDB for vector storage, Gemini for AI generation, and OpenAI for chat completions.
              API keys are service-specific and not interchangeable.
            </p>
            <p>
              For ChromaDB, set up your own server to keep data private. For Gemini, get a free API key from{' '}
              <a href="https://console.cloud.google.com/ai-platform" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Google AI Studio
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
