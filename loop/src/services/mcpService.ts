import { apiConfig } from './config';
import { simpleVectorStore, syncProjectAssetsToVectorStore, queryProjectAssets, getVectorStoreStats } from './vectorStorage';

function assertServiceAvailable(serviceName: string): void {
  if (!apiConfig.isConfigured(serviceName)) {
    const friendlyName = serviceName === 'chromadb' ? 'ChromaDB' : serviceName;
    throw new Error(`${friendlyName} service is disabled. Enable it in API Configuration to continue.`);
  }
}

function getHeaders(serviceName: string = 'chromadb'): Record<string, string> {
  assertServiceAvailable(serviceName);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config = apiConfig.getConfigByName(serviceName);
  if (config?.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

// Check if we should use remote ChromaDB or local vector storage
function shouldUseRemoteChromaDB(serviceName: string = 'chromadb'): boolean {
  const config = apiConfig.getConfigByName(serviceName);
  if (!config || !config.enabled) return false;
  
  // Check if it's pointing to a remote ChromaDB server (not localhost)
  const baseUrl = config.baseUrl?.toLowerCase() || '';
  return baseUrl.includes('http') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');
}

export async function createCollection(collectionName: string, serviceName: string = 'chromadb'): Promise<void> {
  if (!apiConfig.isEnabled(serviceName)) {
    // Use local vector storage
    simpleVectorStore.createCollection(collectionName);
    return;
  }

  if (!shouldUseRemoteChromaDB(serviceName)) {
    // Use local vector storage
    simpleVectorStore.createCollection(collectionName);
    return;
  }

  // Use remote ChromaDB
  assertServiceAvailable(serviceName);
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
  if (!apiConfig.isEnabled(serviceName)) {
    // Use local vector storage
    simpleVectorStore.addDocuments(collectionName, documents, metadatas, ids);
    return;
  }

  if (!shouldUseRemoteChromaDB(serviceName)) {
    // Use local vector storage
    simpleVectorStore.addDocuments(collectionName, documents, metadatas, ids);
    return;
  }

  // Use remote ChromaDB
  assertServiceAvailable(serviceName);
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
  if (!apiConfig.isEnabled(serviceName)) {
    // Use local vector storage - return ChromaDB-compatible format
    const results = simpleVectorStore.queryDocuments(collectionName, queryTexts, nResults);
    return {
      ids: results.map(queryResults => queryResults.map(r => r.document.id)),
      distances: results.map(queryResults => queryResults.map(r => 1 - r.similarity)), // Convert similarity to distance
      metadatas: results.map(queryResults => queryResults.map(r => r.document.metadata)),
      documents: results.map(queryResults => queryResults.map(r => r.document.content))
    };
  }

  if (!shouldUseRemoteChromaDB(serviceName)) {
    // Use local vector storage - return ChromaDB-compatible format
    const results = simpleVectorStore.queryDocuments(collectionName, queryTexts, nResults);
    return {
      ids: results.map(queryResults => queryResults.map(r => r.document.id)),
      distances: results.map(queryResults => queryResults.map(r => 1 - r.similarity)), // Convert similarity to distance
      metadatas: results.map(queryResults => queryResults.map(r => r.document.metadata)),
      documents: results.map(queryResults => queryResults.map(r => r.document.content))
    };
  }

  // Use remote ChromaDB
  assertServiceAvailable(serviceName);
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

// Export the high-level functions for project asset management
export { syncProjectAssetsToVectorStore, queryProjectAssets, getVectorStoreStats };

// Add a function to sync assets to vector storage (for the toggle functionality)
export async function syncAssetsToMcp(
  project: { assets: Array<{ id: string; name: string; content: string; type: string; tags: string[] }> },
  serviceName: string = 'chromadb'
): Promise<void> {
  await createCollection('project_assets', serviceName);
  
  const documents = project.assets.map(asset => 
    `${asset.name}\n${asset.content}\nType: ${asset.type}\nTags: ${asset.tags.join(', ')}`
  );
  
  const metadatas = project.assets.map(asset => ({
    assetId: asset.id,
    name: asset.name,
    type: asset.type,
    tags: asset.tags
  }));

  const ids = project.assets.map(asset => asset.id);

  await addDocuments('project_assets', documents, metadatas, ids, serviceName);
}
