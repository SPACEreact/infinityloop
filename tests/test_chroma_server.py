import sys
from pathlib import Path

import chromadb
import pytest
from fastapi.testclient import TestClient

# Ensure the project root is importable when running tests directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import chroma_server


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    test_client = chromadb.PersistentClient(path=str(tmp_path))
    monkeypatch.setattr(chroma_server, "client", test_client)
    client = TestClient(chroma_server.app)
    try:
        yield client, tmp_path
    finally:
        client.close()


def test_root_endpoint(api_client):
    client, _ = api_client

    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "ChromaDB MCP Server is running"}


def test_collection_workflow_persists_data(api_client):
    client, db_path = api_client
    collection_name = "test-collection"

    create_response = client.post(f"/collections/{collection_name}")
    assert create_response.status_code == 200
    assert "created successfully" in create_response.json()["message"]

    documents_payload = {
        "documents": ["Hello world"],
        "metadatas": [{"topic": "greeting"}],
        "ids": ["doc-1"],
        "embeddings": [[1.0, 0.0, 0.0]],
    }
    add_response = client.post(
        f"/collections/{collection_name}/documents", json=documents_payload
    )
    assert add_response.status_code == 200
    assert "Added 1 documents" in add_response.json()["message"]

    query_payload = {
        "query_embeddings": [[1.0, 0.0, 0.0]],
        "n_results": 1,
    }
    query_response = client.post(
        f"/collections/{collection_name}/query", json=query_payload
    )
    assert query_response.status_code == 200
    query_data = query_response.json()
    assert query_data["ids"][0][0] == "doc-1"
    assert query_data["documents"][0][0] == "Hello world"

    info_response = client.get(f"/collections/{collection_name}")
    assert info_response.status_code == 200
    assert info_response.json()["count"] == 1

    list_response = client.get("/collections")
    assert list_response.status_code == 200
    assert any(col["name"] == collection_name for col in list_response.json())

    stored_files = list(Path(db_path).iterdir())
    assert stored_files, "expected persisted database files to be created"


def _expected_missing_collection_detail(collection_name: str) -> str:
    with pytest.raises((chromadb.errors.NotFoundError, ValueError)) as exc_info:
        chroma_server.client.get_collection(name=collection_name)
    return str(exc_info.value)


def test_add_documents_missing_collection_returns_404(api_client):
    client, _ = api_client
    collection_name = "missing-collection"

    expected_detail = _expected_missing_collection_detail(collection_name)

    documents_payload = {
        "documents": ["Hello world"],
        "ids": ["doc-1"],
    }

    response = client.post(
        f"/collections/{collection_name}/documents", json=documents_payload
    )

    assert response.status_code == 404
    assert response.json() == {"detail": expected_detail}


def test_query_documents_missing_collection_returns_404(api_client):
    client, _ = api_client
    collection_name = "missing-query-collection"

    expected_detail = _expected_missing_collection_detail(collection_name)

    query_payload = {
        "query_texts": ["hello"],
        "n_results": 1,
    }

    response = client.post(
        f"/collections/{collection_name}/query", json=query_payload
    )

    assert response.status_code == 404
    assert response.json() == {"detail": expected_detail}


def test_get_collection_info_missing_collection_returns_404(api_client):
    client, _ = api_client
    collection_name = "missing-info-collection"

    expected_detail = _expected_missing_collection_detail(collection_name)

    response = client.get(f"/collections/{collection_name}")

    assert response.status_code == 404
    assert response.json() == {"detail": expected_detail}
