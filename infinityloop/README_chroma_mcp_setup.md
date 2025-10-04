# ChromaDB MCP Server Setup and Demo Instructions

## Architecture Overview

This setup uses a **server-side architecture** where:

- **Server Side (Python/FastAPI)**: Handles all ChromaDB operations via REST API
- **Client Side (React)**: Only contains UI, makes HTTP requests to server

## Step 1: Install Dependencies

```bash
pip install chromadb fastapi uvicorn pydantic
```

## Step 2: Start the ChromaDB Server

Run the FastAPI server that exposes ChromaDB operations:

```bash
python chroma_server.py
```

The server will start on `http://localhost:8000` with the following endpoints:
- `POST /collections/{name}` - Create collection
- `POST /collections/{name}/documents` - Add documents
- `POST /collections/{name}/query` - Query documents
- `GET /collections/{name}` - Get collection info
- `GET /collections` - List all collections

## Step 3: Test the Server (Optional)

Test the API endpoints:

```bash
# Create collection
curl -X POST http://localhost:8000/collections/test_collection

# Add documents
curl -X POST -H "Content-Type: application/json" \
  -d '{"documents":["test doc"], "metadatas":[{"source":"test"}], "ids":["id1"]}' \
  http://localhost:8000/collections/test_collection/documents

# Query documents
curl -X POST -H "Content-Type: application/json" \
  -d '{"query_texts":["test"], "n_results":5}' \
  http://localhost:8000/collections/test_collection/query
```

## Step 4: Run the React App

Start the React development server:

```bash
cd loop
npm run dev
```

The React app will connect to the ChromaDB server via the MCP service.

## Step 5: Test Integration

In the React app, use the "Save" button in the control panel to sync project assets to the ChromaDB server.

## Files Overview

- `chroma_server.py` - FastAPI server exposing ChromaDB operations
- `loop/services/mcpService.ts` - React service making HTTP requests to server
- `loop/components/Workspace.tsx` - React component using MCP service
- `bkacbox_mcp_settings.json` - MCP configuration

## Notes

- Data is persisted in the `./chroma_db` directory
- Server runs on port 8000, React dev server on 5173
- CORS is configured to allow requests from React app
- The server name is set to "github.com/chroma-core/chroma" in `bkacbox_mcp_settings.json`
