# Loop - AI Assistant Director

## Overview

Loop is an AI-powered filmmaking assistant that provides a unified workspace for visual storytelling and film production. The application integrates professional cinematography knowledge into every aspect of the creative process, from story development to shot planning and visual styling.

The system uses a timeline-based architecture where users can create, organize, and refine filmmaking assets through guided workflows and AI-assisted generation. All AI interactions are enhanced with a comprehensive knowledge base covering cinematography, screenwriting, and story structure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 19 with TypeScript for UI components
- Vite 7.1.7 for build tooling and development server
- TailwindCSS 4.1.13 for styling with custom pastel color palette
- Google Generative AI (Gemini 2.5 Flash) for AI features

**Core Components:**
- `App.tsx`: Root component that renders the unified workspace
- `Workspace.tsx`: Main workspace containing timeline, asset library, chat assistant, and control panels
- `ChatAssistant.tsx`: AI chat interface for interactive guidance
- `Timeline.tsx`: Visual timeline for organizing and sequencing assets
- `KnowledgeBasePanel.tsx` and `ReferenceViewer.tsx`: Knowledge base browser and reference system

**Design Patterns:**
- Single-page application with no separate modes or landing pages
- Component-based architecture with functional React components and hooks
- Knowledge-driven UI where dropdown options and AI context come from markdown files
- State management through React useState and prop drilling

### Backend Architecture

**Python Services:**
- Flask API (`app.py`, `src/main.py`): Basic REST API service running on port 3001
- ChromaDB MCP Server (`chroma_server.py`): FastAPI server for vector database operations on port 8000
- Separate Python and Node.js dependency management

**Service Layer:**
- `geminiService.ts`: AI generation with knowledge base integration, retry logic, and error handling
- `knowledgeService.ts`: Markdown file parser that loads cinematography knowledge
- `mcpService.ts`: ChromaDB client for vector storage operations
- `config.ts`: API configuration manager with localStorage persistence

**Knowledge Base System:**
- Markdown files in `/knowledge` folder provide domain expertise
- Parsed at runtime to populate dropdown options and AI context
- Categories: camera movements, film techniques, story structures, scene writing, screenplay archetypes
- Full context injected into all AI prompts

### Data Architecture

**Core Data Models (types.ts):**
- `Asset`: Filmmaking elements with seed ID lineage tracking (e.g., "A" → "A.1-MASTER" → "A.1.3")
- `Project`: Container for assets, timelines, and metadata
- `TimelineBlock`: Positioned assets in timeline sequence
- `PrimaryTimeline`: User input blocks organized into story/image folders
- `SecondaryTimeline`: Master assets and shot lists
- `Message`: Chat conversation history

**Seed ID Lineage:**
- Every asset has a unique seed ID that traces its creation lineage
- Master assets preserve lineage from source assets
- Enables context propagation through build workflows

**State Management:**
- Project state managed at App level
- Tag weights and style rigidity for AI generation control
- Chat history per asset for context preservation

### Build System

**Guided Workflows:**
- `storybuild`: Story development with Want vs. Need framework, character arcs, plot structure
- `imgbuild`: Image prompt generation with cinematography options

**Workflow Architecture:**
- Questions stored in `constants.ts` and `constants.tsx`
- Dropdown options sourced from knowledge base
- AI generates structured JSON outputs with prompts and explanations
- Build completion creates new assets in project

### UI/UX Architecture

**Pastel Glass Theme:**
- Custom CSS variables in `index.css` for color palette
- Timeline color coding: warm yellow for story, cool blue for visual assets
- Glass morphism effects with transparency and blur

**Responsive Layout:**
- Fixed sidebar for navigation
- Flexible workspace with resizable panels
- Modal overlays for guides, configuration, and reference viewing

**Accessibility:**
- ARIA labels on interactive elements
- Keyboard navigation support
- Icon components with optional titles

## External Dependencies

### Third-Party APIs

**Google Generative AI:**
- Gemini 2.5 Flash model for text generation
- Requires `VITE_GEMINI_API_KEY` environment variable
- Base URL: `https://generativelanguage.googleapis.com/v1beta`
- Used for chat responses, workspace generation, and guided builds
- Mock mode fallback when API key is not configured

### External Services

**ChromaDB:**
- Vector database for semantic search and document storage
- Runs as separate FastAPI service on port 8000
- REST API endpoints for collection management, document addition, and querying
- CORS enabled for React app origins (localhost:3000, localhost:5173)
- Persistent storage in `./chroma_db` directory

### Package Dependencies

**Runtime Dependencies:**
- `@google/genai` and `@google/generative-ai`: Gemini API clients
- `react` and `react-dom`: UI framework
- `tailwindcss` and `@tailwindcss/postcss`: Styling
- `vite`: Build tool and dev server

**Development Dependencies:**
- `typescript`: Type checking
- `@vitejs/plugin-react`: React support in Vite
- `@types/react` and `@types/react-dom`: TypeScript definitions

**Python Dependencies:**
- `chromadb`: Vector database client
- `fastapi` and `uvicorn`: Web framework for ChromaDB server
- `pydantic`: Data validation
- `flask`: Basic REST API service

### Configuration Files

- `vite.config.ts`: Dev server on port 5000, Replit proxy compatibility, markdown asset loading
- `tailwind.config.js`: Content paths and theme customization
- `tsconfig.json`: TypeScript compiler options with strict mode
- `postcss.config.js`: TailwindCSS and autoprefixer integration
- `.gitignore`: Python and Node.js exclusions

### Deployment Architecture

**Replit Autoscale:**
- Frontend preview server on port 5000
- Backend services on ports 3001 (Flask) and 8000 (ChromaDB)
- Environment variable for Gemini API key
- HMR over WebSocket for live development