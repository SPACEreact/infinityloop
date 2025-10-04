# Fractured Loop Major Update - Detailed Implementation Plan

## 1. Information Gathered
- The project is an AI-powered visual workspace for filmmakers.
- Major update involves:
  - Foundational upgrade with expert guided builds and AI knowledge base.
  - Complete UI and interaction overhaul to a timeline-based model.
  - Reintegration and polishing with rich inspector, guided builds, AI workflows, and onboarding clarity.
- Current codebase includes:
  - Workspace.tsx: Main canvas, asset library, node and connection management, chat integration.
  - ChatAssistant.tsx: Chat UI and message handling.
  - LandingPage.tsx: Onboarding and workflow start UI.
- Existing TODOs cover chat, drag-drop, node details, and connection editing.

## 2. Detailed File-Level Update Plan

### Phase 1: Foundational Upgrade
- Enhance guided build questionnaires in ChatAssistant.tsx and related AI service files (geminiService.ts).
- Upgrade AI core prompt and knowledge base in geminiService.ts.
- Implement prompt engineering logic in geminiService.ts and Workspace.tsx generate functions.

### Phase 2: Visual & Interaction Overhaul
- Refactor Workspace.tsx to replace node-graph with horizontal multi-track timeline.
- Implement Tracks and Layers UI and data structures in Workspace.tsx and new components if needed.
- Update drag-and-drop to support timeline and layers.
- Redesign UI with cinematic theme in CSS and component styling (index.css, components).

### Phase 3: Reintegration & Polishing
- Enhance Inspector Panel UI and logic in Workspace.tsx or new Inspector components.
- Reimplement guided builds UI trigger ("magic wand") in ChatAssistant.tsx or Workspace.tsx.
- Ensure AI workflows (iterative generation, style seeding, project pulse) are integrated and functional.
- Add essential UI elements: Exit Project button, tooltips, User Guide tabs.
- Improve onboarding clarity in LandingPage.tsx.

## 3. Dependent Files to Edit
- components/Workspace.tsx
- components/ChatAssistant.tsx
- components/LandingPage.tsx
- services/geminiService.ts
- index.css
- constants.ts (for new asset categories, prompt tables)
- Possibly new components for Timeline, Inspector, User Guide

## 4. Follow-up Steps
- Implement changes phase-wise with testing after each phase.
- Update TODO.md to reflect progress.
- Conduct UI/UX review and AI functionality testing.
- Prepare documentation for new workflows and UI.

---

Please review this plan and confirm if I should proceed with implementation or if you have any modifications or priorities to add.
