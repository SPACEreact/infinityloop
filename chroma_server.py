import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
import chromadb
from chromadb.errors import InternalError, NotFoundError
import uvicorn

app = FastAPI(title="ChromaDB MCP Server", description="REST API for ChromaDB operations")

logger = logging.getLogger(__name__)

# Add CORS middleware to allow requests from the React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB client
client = chromadb.PersistentClient(path="./chroma_db")

logger = logging.getLogger(__name__)

# Pydantic models for request/response
class DocumentData(BaseModel):
    documents: List[str]
    metadatas: Optional[List[Dict[str, Any]]] = None
    ids: List[str]
    embeddings: Optional[List[List[float]]] = None


class QueryData(BaseModel):
    query_texts: Optional[List[str]] = None
    query_embeddings: Optional[List[List[float]]] = None
    n_results: int = 10
    where: Optional[Dict[str, Any]] = None
    where_document: Optional[Dict[str, Any]] = None

@app.get("/")
async def root():
    return {"message": "ChromaDB MCP Server is running"}

@app.post("/collections/{collection_name}")
async def create_collection(collection_name: str):
    """Create a new collection"""
    try:
        collection = client.create_collection(name=collection_name)
        return {"message": f"Collection '{collection_name}' created successfully"}
    except InternalError as exc:
        message = str(exc)
        if "already exists" in message.lower():
            raise HTTPException(status_code=409, detail=message)
        logger.exception("Failed to create collection '%s'", collection_name)
        raise
    except Exception:
        logger.exception("Unexpected error creating collection '%s'", collection_name)
        raise

def _get_collection_or_404(collection_name: str):
    try:
        return client.get_collection(name=collection_name)
    except (NotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception(
            "Unexpected error retrieving collection '%s'", collection_name,
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.post("/collections/{collection_name}/documents")
async def add_documents(collection_name: str, data: DocumentData):
    """Add documents to a collection"""
    collection = _get_collection_or_404(collection_name)

    add_params: Dict[str, Any] = {
        "documents": data.documents,
        "metadatas": data.metadatas,
        "ids": data.ids,
    }
    if data.embeddings is not None:
        add_params["embeddings"] = data.embeddings

    try:
        collection.add(**add_params)
        return {"message": f"Added {len(data.documents)} documents to collection '{collection_name}'"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Unexpected error adding documents to collection '%s'", collection_name,
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc

@app.post("/collections/{collection_name}/query")
async def query_documents(collection_name: str, query: QueryData):
    """Query documents in a collection"""
    collection = _get_collection_or_404(collection_name)

    query_params: Dict[str, Any] = {
        "n_results": query.n_results,
        "where": query.where,
        "where_document": query.where_document,
    }
    if query.query_texts is not None:
        query_params["query_texts"] = query.query_texts
    if query.query_embeddings is not None:
        query_params["query_embeddings"] = query.query_embeddings

    try:
        results = collection.query(**query_params)
        return results
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Unexpected error querying collection '%s'", collection_name,
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc

@app.get("/collections/{collection_name}")
async def get_collection_info(collection_name: str):
    """Get information about a collection"""
    collection = _get_collection_or_404(collection_name)

    try:
        count = collection.count()
        return {
            "name": collection_name,
            "count": count,
            "metadata": collection.metadata
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Unexpected error retrieving info for collection '%s'", collection_name,
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc

@app.get("/collections")
async def list_collections():
    """List all collections"""
    try:
        collections = client.list_collections()
        return [{"name": c.name, "id": c.id} for c in collections]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
