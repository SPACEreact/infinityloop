import React, { useState } from 'react';
import { listModels, generateSandboxResponse } from '../services/geminiService';

const GeminiTest: React.FC = () => {
  const [models, setModels] = useState<any>(null);
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

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
