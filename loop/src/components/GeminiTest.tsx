import React, { useState, useEffect } from 'react';
import { listModels, generateSandboxResponse } from '../services/geminiService';
import { TEXT_GENERATION_MODELS, IMAGE_GENERATION_MODELS } from '../models';

const GeminiTest: React.FC = () => {
  const [models, setModels] = useState<any>(null);
  const [textModels, setTextModels] = useState<any[]>([]);
  const [imageModels, setImageModels] = useState<any[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState<string>('');
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setTextModels(TEXT_GENERATION_MODELS);
    setImageModels(IMAGE_GENERATION_MODELS);
    setSelectedTextModel(TEXT_GENERATION_MODELS[0]?.id || '');
    setSelectedImageModel(IMAGE_GENERATION_MODELS[0]?.id || '');
  }, []);

  const handleListModels = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listModels();
      setModels(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateSandboxResponse(
        'Hello, can you help me with a film idea?',
        [],
        {},
        50
      );
      setResponse(result.data || 'No response');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Gemini API Test</h2>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleListModels} disabled={loading}>
          List Available Models
        </button>
        <button onClick={handleGenerateContent} disabled={loading} style={{ marginLeft: '10px' }}>
          Generate Content
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="text-model-select">Text Generation Model:</label>
        <select
          id="text-model-select"
          value={selectedTextModel}
          onChange={(e) => setSelectedTextModel(e.target.value)}
          style={{ marginLeft: '10px' }}
        >
          {textModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {model.quota ? `(${model.quota})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="image-model-select">Image Generation Model:</label>
        <select
          id="image-model-select"
          value={selectedImageModel}
          onChange={(e) => setSelectedImageModel(e.target.value)}
          style={{ marginLeft: '10px' }}
        >
          {imageModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {model.quota ? `(${model.quota})` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading...</p>}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {models && (
        <div>
          <h3>Available Models:</h3>
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
            {models.models ? (
              <ul>
                {models.models.map((model: any, index: number) => (
                  <li key={index} style={{ marginBottom: '10px' }}>
                    <strong>{model.name}</strong>
                    <br />
                    <small>Description: {model.description}</small>
                    <br />
                    <small>Supported Methods: {model.supportedGenerationMethods?.join(', ') || 'N/A'}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <pre>{JSON.stringify(models, null, 2)}</pre>
            )}
          </div>
        </div>
      )}

      {response && (
        <div>
          <h3>Generated Response:</h3>
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {response}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiTest;
