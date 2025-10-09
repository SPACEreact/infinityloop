/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string | undefined
  readonly VITE_GEMINI_API_BASE_URL?: string
  readonly VITE_GEMINI_PROXY_URL?: string
  readonly VITE_CHROMA_API_BASE_URL?: string
  readonly VITE_CHROMADB_API_BASE_URL?: string
  readonly VITE_CHROMA_API_KEY?: string
  readonly VITE_CHROMADB_API_KEY?: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}