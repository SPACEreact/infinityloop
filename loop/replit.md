# Fractured Loop Infinity - AI Assistant Director

## Overview
An AI-powered filmmaking assistant that integrates professional cinematography knowledge into every aspect of film production. The application provides a unified workspace experience with:
- **Workspace Mode**: Integrated timeline, asset library, and AI chat assistant
- **Knowledge-Based AI**: All AI prompts enhanced with cinematography expertise from markdown knowledge base
- **Guided Builds**: StorybBuild and ImgBuild workflows with dropdown options sourced from knowledge base

## Recent Changes
- **2025-10-02 (Latest)**: Major refactoring - integrated knowledge base system
  - Created knowledgeService.ts to load and parse markdown files from /knowledge folder
  - Integrated knowledge base into ALL AI generation flows (chat, workspace, builds, images)
  - Removed Quantum Box mode, Landing Page, and separate Guided Workflows per user request
  - Simplified App.tsx to show unified Workspace directly
  - Removed unused components (QuantumBox, LandingPage, BuildScreen, Sandbox, WelcomeScreen, BatchSelection)
  - Updated all dropdown options to use knowledge base data (camera movements, story structures, techniques)
  - Removed vidbuild and shotbuild, keeping only storybuild and imgbuild per user request
  - Fixed all 80 LSP errors down to 0
  
- **2025-10-02 (Initial)**: Successfully migrated GitHub import to Replit environment
  - Reorganized project structure from nested directories to root level
  - Removed hardcoded API key and configured environment variable usage (VITE_GEMINI_API_KEY)
  - Updated Vite configuration for Replit proxy compatibility (0.0.0.0:5000 with HMR over WSS)
  - Fixed file permissions and installed all dependencies
  - Configured workflow for development server
  - Set up autoscale deployment configuration

## User Preferences
- Workspace-centric design: No separate modes or landing pages - everything in unified workspace
- Knowledge base driven: Use /knowledge markdown files for all dropdowns and AI context
- Streamlined builds: Only storybuild and imgbuild (removed shotbuild and vidbuild)
- Seed ID lineage must be preserved (A → A.1-MASTER → A.1.3)

## Project Architecture
- **Frontend**: React 19 with TypeScript
- **Build System**: Vite 7.1.7 for development and building
- **Styling**: TailwindCSS 4.1.13
- **AI Integration**: Google Generative AI (Gemini) - requires VITE_GEMINI_API_KEY environment variable
- **Knowledge Base**: Markdown files in /knowledge folder provide cinematography expertise
- **Deployment**: Autoscale deployment with Vite preview server

### Key Files
- `index.html`: Main HTML entry point with inline styles
- `App.tsx`: Simplified main component that renders Workspace directly
- `services/geminiService.ts`: AI integration service with knowledge base context in all prompts
- `services/knowledgeService.ts`: Loads and parses markdown knowledge files, provides dropdown options
- `types.ts`: TypeScript type definitions
- `constants.ts`: Application constants, build configurations, field options from knowledge base
- `components/Workspace.tsx`: Unified workspace with timeline, asset library, and chat
- `components/ChatAssistant.tsx`: AI chat assistant integrated into workspace
- `components/Timeline.tsx`: Primary/Secondary timeline system
- `knowledge/`: Markdown files containing cinematography and storytelling expertise
- `vite.config.ts`: Vite configuration optimized for Replit

### Knowledge Base System
The knowledge base in `/knowledge` folder contains markdown files with:
- Camera movements and techniques
- Story structures and narrative frameworks
- Shot types and compositions
- Lighting styles and setups
- Color grading techniques
- Video pacing and durations

These are loaded by `knowledgeService.ts` and:
1. Populate dropdown options in build workflows
2. Enhance all AI prompts with cinematography context
3. Provide expert guidance for filmmaking decisions

### Setup Requirements
1. Add Google AI API key as `VITE_GEMINI_API_KEY` environment variable
2. Dependencies are already installed
3. Development server runs on port 5000 via workflow
4. Run `npm run build` for production build

## Current State
- ✅ Application successfully running in Replit development mode with unified workspace
- ✅ All TypeScript compilation issues resolved (0 LSP errors)
- ✅ Knowledge base integrated into all AI generation flows
- ✅ Vite development server configured on port 5000 with proper host settings
- ✅ Deployment configuration set up for autoscale
- ✅ Project structure cleaned and streamlined (removed unused components)
- ✅ Dropdown options powered by knowledge base markdown files
- ⏳ Google AI integration requires VITE_GEMINI_API_KEY environment variable to be set by user