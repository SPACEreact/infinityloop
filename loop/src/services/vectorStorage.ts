// Simple in-memory vector storage for assets when ChromaDB is not available
// This provides basic vector similarity functionality for the app

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface VectorQueryResult {
  document: VectorDocument;
  similarity: number;
}

class SimpleVectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private collections: Map<string, Set<string>> = new Map();

  // Simple text-to-vector conversion (basic TF-IDF-like approach)
  private textToVector(text: string): number[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Create a simple 100-dimensional vector based on word hashes
    const vector = new Array(100).fill(0);
    Object.entries(wordFreq).forEach(([word, freq]) => {
      const hash = this.simpleHash(word) % 100;
      vector[hash] += freq;
    });

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  createCollection(name: string): void {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Set());
    }
  }

  addDocuments(
    collectionName: string, 
    documents: string[], 
    metadatas?: any[], 
    ids?: string[]
  ): void {
    this.createCollection(collectionName);
    const collection = this.collections.get(collectionName)!;

    documents.forEach((content, index) => {
      const id = ids?.[index] || `doc_${Date.now()}_${index}`;
      const metadata = metadatas?.[index] || {};
      const embedding = this.textToVector(content);

      const doc: VectorDocument = {
        id,
        content,
        metadata,
        embedding
      };

      this.documents.set(id, doc);
      collection.add(id);
    });
  }

  queryDocuments(
    collectionName: string,
    queryTexts: string[],
    nResults: number = 10
  ): VectorQueryResult[][] {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      return [];
    }

    return queryTexts.map(queryText => {
      const queryVector = this.textToVector(queryText);
      const results: VectorQueryResult[] = [];

      for (const docId of collection) {
        const doc = this.documents.get(docId);
        if (!doc?.embedding) continue;

        const similarity = this.cosineSimilarity(queryVector, doc.embedding);
        results.push({ document: doc, similarity });
      }

      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, nResults);
    });
  }

  getCollectionCount(collectionName: string): number {
    const collection = this.collections.get(collectionName);
    return collection ? collection.size : 0;
  }

  clearCollection(collectionName: string): void {
    const collection = this.collections.get(collectionName);
    if (collection) {
      for (const docId of collection) {
        this.documents.delete(docId);
      }
      collection.clear();
    }
  }

  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }
}

// Singleton instance
export const simpleVectorStore = new SimpleVectorStore();

// Asset-specific functions that integrate with the existing project
export async function syncProjectAssetsToVectorStore(
  project: { assets: Array<{ id: string; name: string; content: string; type: string; tags: string[] }> }
): Promise<void> {
  const collectionName = 'project_assets';
  
  // Clear existing data and recreate collection
  simpleVectorStore.clearCollection(collectionName);
  simpleVectorStore.createCollection(collectionName);

  if (project.assets.length === 0) {
    return;
  }

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

  simpleVectorStore.addDocuments(collectionName, documents, metadatas, ids);
}

export async function queryProjectAssets(
  query: string,
  limit: number = 5
): Promise<Array<{ 
  assetId: string; 
  name: string; 
  content: string; 
  similarity: number;
  type: string;
  tags: string[];
}>> {
  const results = simpleVectorStore.queryDocuments('project_assets', [query], limit);
  
  if (results.length === 0) {
    return [];
  }

  return results[0].map(result => ({
    assetId: result.document.metadata.assetId,
    name: result.document.metadata.name,
    content: result.document.content,
    similarity: result.similarity,
    type: result.document.metadata.type,
    tags: result.document.metadata.tags || []
  }));
}

export function getVectorStoreStats(): { collections: number; totalDocuments: number; collectionNames: string[] } {
  const collectionNames = simpleVectorStore.listCollections();
  const totalDocuments = collectionNames.reduce((sum, name) => 
    sum + simpleVectorStore.getCollectionCount(name), 0
  );

  return {
    collections: collectionNames.length,
    totalDocuments,
    collectionNames
  };
}