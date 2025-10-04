import chromadb
import time

def main():
    # Use local ChromaDB client (no server needed)
    client = chromadb.Client()

    # Create a collection
    collection = client.create_collection("all-my-documents")

    # Add documents to the collection
    collection.add(
        documents=["This is document1", "This is document2"],
        metadatas=[{"source": "notion"}, {"source": "google-docs"}],
        ids=["doc1", "doc2"],
    )

    # Query 2 most similar results
    results = collection.query(
        query_texts=["This is a query document"],
        n_results=2,
    )

    print("Query results:")
    print(results)

if __name__ == "__main__":
    main()
