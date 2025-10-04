# Implementation TODO List

## 1. Timeline Drag-Drop Enhancement
- [ ] Modify Timeline.tsx to accept drag-drop from AssetLibraryPanel
- [ ] Add drop handlers to timeline tracks and layers
- [ ] Create timeline items when assets are dropped on tracks
- [ ] Handle different asset types for appropriate tracks/layers

## 2. Right Sidebar Inspector Panel
- [ ] Verify NodeDetailsPanel functionality for asset editing
- [ ] Ensure asset options display correctly based on FIELD_OPTIONS
- [ ] Test asset content updates and field parsing

## 3. User Guide System
- [ ] Create new UserGuide.tsx component with tabbed interface
- [ ] Add tabs for different guide sections (Getting Started, Builds, Timeline, etc.)
- [ ] Integrate UserGuide into Workspace header or as modal
- [ ] Populate guide content with helpful information

## 4. Magic Wand Button for Guided Builds
- [ ] Add magic wand button to ChatAssistant component
- [ ] Create guided build workflow UI (questionnaire modal)
- [ ] Integrate with BUILDS from constants.ts
- [ ] Handle build completion and asset creation

## 5. Workspace Suggestion Button
- [ ] Add suggestion button to Workspace header
- [ ] Implement AI-powered recommendations logic
- [ ] Display suggestions in a panel or modal
- [ ] Allow users to apply suggestions

## 6. Component Integration and Testing
- [ ] Ensure all components are properly connected
- [ ] Test drag-drop workflow from asset creation to timeline
- [ ] Test AI assistant interactions and guided builds
- [ ] Verify UI responsiveness and styling
