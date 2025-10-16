# Infinity Loop Stabilization and Feature Alignment Plan

## 1. Snapshot of the Current Experience
- **Chat-driven workflow is overloaded.** `Workspace.handleSendMessage` routes every message through script import detection, AI generation, and toast management, making the chat assistant simultaneously a script ingestor, generic helper, and system notifier.【F:loop/src/components/Workspace.tsx†L98-L169】
- **Script imports always become timeline scenes.** `handleImportScript` converts detected screenplay text into new `scene` assets and immediately drops them into the primary story timeline, regardless of whether the user intended to edit existing assets in the inspector.【F:loop/src/hooks/useProject.ts†L420-L487】
- **Inspector fields are inferred from free-form content.** The asset detail panel parses text into `Field: Value` lines on the fly, which makes it hard to guarantee consistent schemas or to sync AI suggestions back into an asset.【F:loop/src/components/AssetDetailsPanel.tsx†L48-L177】
- **Chat UI mixes multiple feature flows.** `ChatAssistant` maintains state for guided builds, master iterations, multi-shot planning, propagation wizards, and suggestion menus all in one monolithic component, obscuring the primary “ask a question, update asset” flow.【F:loop/src/components/ChatAssistant.tsx†L1-L200】

## 2. Target Product Behaviors
1. **Chat defaults to enriching the selected asset.**
   - Treat the inspector selection as the primary context; plain chat replies should populate structured fields on that asset instead of generating new timeline items.
   - Reserve script imports for explicit commands (e.g., `/import` or the dedicated modal) so casual prose stays in the inspector.
2. **Script ingestion feeds both timeline and inspector.**
   - When a user confirms an import, create structured scene assets and automatically open the first one in the detail panel with parsed fields ready for editing.
3. **Guided build and automation flows become opt-in apps.**
   - Break advanced features (multi-shot planner, propagation wizards) into discrete launchers or modals so the base chat input remains focused.
4. **Consistent schemas back assets.**
   - Replace free-form `content` parsing with explicit metadata objects per asset type so AI suggestions can target real keys.

## 3. Stabilization Roadmap
### Phase A – Foundation
- Introduce a dedicated `chatEngine` module that accepts `{message, context}` and returns `action` objects (`updateAsset`, `importScript`, `assistantReply`) to decouple UI from orchestration.【F:loop/src/components/Workspace.tsx†L98-L169】
- Normalize asset shapes inside `useProject` (e.g., `SceneAsset`, `CharacterAsset`) and migrate the inspector to render from typed metadata rather than parsing strings.【F:loop/src/hooks/useProject.ts†L420-L487】【F:loop/src/components/AssetDetailsPanel.tsx†L48-L177】
- Add unit tests that snapshot the command/action contract so regressions are caught before UI breaks.

### Phase B – Chat-to-Inspector Flow
- Wire the `chatEngine`’s `updateAsset` actions to `handleUpdateAsset`, targeting the currently selected asset when available.【F:loop/src/hooks/useProject.ts†L420-L487】
- Move script import triggering behind explicit slash commands or the existing import modal, while still allowing the chat to preview detected sluglines before the user opts in.【F:loop/src/components/Workspace.tsx†L98-L169】
- Provide assistant-generated field suggestions by calling the existing `onRequestSuggestion` mechanism instead of emitting free-text replies.【F:loop/src/components/AssetDetailsPanel.tsx†L80-L118】

### Phase C – Timeline & Automation Isolation
- Extract multi-shot, propagation, and guided build logic out of `ChatAssistant` into feature-specific controllers so their state machines do not live inside the base chat component.【F:loop/src/components/ChatAssistant.tsx†L122-L200】
- Represent timeline mutations as Redux-style events (e.g., `TIMELINE/ADD_SCENE_FROM_IMPORT`) consumed by `useProject`, enabling undo/redo and analytics hooks.
- Audit toasts and modal triggers so system notifications originate from a single dispatcher instead of ad-hoc `setToastState` calls.

### Phase D – AI Reliability & Observability
- Centralize Gemini prompts and knowledge-base lookups inside `services/geminiService` with versioned templates so experiments are trackable.
- Log usage tokens per interaction and surface them in a lightweight diagnostics view for debugging quota issues.
- Introduce feature flags for Chroma, MCP sync, and future providers to avoid tight coupling to `apiConfig` checks scattered through the workspace.【F:loop/src/components/Workspace.tsx†L90-L109】

## 4. Immediate Next Steps
1. Stand up the `chatEngine` skeleton returning mock actions and cover it with tests.
2. Refactor `AssetDetailsPanel` to read/write structured metadata for one asset type (e.g., `scene`) as the pilot.
3. Swap the implicit script import in `handleSendMessage` for an explicit `/import` command while keeping the modal available from the toolbar.
4. Carve `ChatAssistant` into a base chat component plus plug-in launchers for guided build, multi-shot, and propagation features.
5. Schedule a UX review to validate the revised flows before expanding to other asset types.

Delivering Phase A and B first will restore the expected “chat updates asset details” experience while preventing accidental timeline clutter, setting the stage for the more advanced automation work.
