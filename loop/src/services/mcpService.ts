import { apiConfig } from './config';

function getHeaders(serviceName: string = 'chromadb'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config = apiConfig.getConfigByName(serviceName);
  if (config?.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

export async function createCollection(collectionName: string, serviceName: string = 'chromadb'): Promise<void> {
  const config = apiConfig.getConfigByName(serviceName);
  if (!config) {
    throw new Error(`API service '${serviceName}' not configured`);
  }

  const response = await fetch(`${config.baseUrl}/collections/${collectionName}`, {
    method: 'POST',
    headers: getHeaders(serviceName),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create collection');
  }
}

export async function addDocuments(
  collectionName: string,
  documents: string[],
  metadatas?: any[],
  ids?: string[],
  serviceName: string = 'chromadb'
): Promise<void> {
  const config = apiConfig.getConfigByName(serviceName);
  if (!config) {
    throw new Error(`API service '${serviceName}' not configured`);
  }

  const response = await fetch(`${config.baseUrl}/collections/${collectionName}/documents`, {
    method: 'POST',
    headers: getHeaders(serviceName),
    body: JSON.stringify({
      documents,
      metadatas,
      ids,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add documents');
  }
}

export async function queryDocuments(
  collectionName: string,
  queryTexts: string[],
  nResults: number = 10,
  serviceName: string = 'chromadb'
): Promise<any> {
  const config = apiConfig.getConfigByName(serviceName);
  if (!config) {
    throw new Error(`API service '${serviceName}' not configured`);
  }

  const response = await fetch(`${config.baseUrl}/collections/${collectionName}/query`, {
    method: 'POST',
    headers: getHeaders(serviceName),
    body: JSON.stringify({
      query_texts: queryTexts,
      n_results: nResults,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to query documents');
  }

  return await response.json();
}
