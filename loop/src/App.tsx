import React, { useState, useCallback } from 'react';
import type { Project } from './types';
import Workspace from './components/Workspace';
import { useProject } from './hooks/useProject';

const App: React.FC = () => {
  const appLabel = 'Loop';

  const initialProject: Project = {
    id: 'project-1',
    name: 'Untitled Project',
    assets: [],
    primaryTimeline: {
      blocks: [],
      folders: {
        story: [],
        image: [],
        text_to_video: []
      }
    },
    secondaryTimeline: undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const {
    project,
    setProject,
    selectedAssetId,
    setSelectedAssetId,
    pendingDeleteAsset,
    toastState,
    setToastState,
    handleAddAsset,
    handleAssetDrop,
    handleRequestDeleteAsset,
    handleConfirmDelete,
    handleCancelDelete,
    handleUndoDelete,
    handleUpdateAsset,
    selectedStoryAssets,
    setSelectedStoryAssets,
    selectedMultiShots,
    setSelectedMultiShots,
    selectedMasterImage,
    setSelectedMasterImage,
    activeTimeline,
    setActiveTimeline,
    isGenerating,
    handleGenerate,
    handleGenerateOutput
  } = useProject(initialProject);

  // Global state for Tag Weighting System
  const [tagWeights, setTagWeights] = useState<Record<string, number>>({});
  const [styleRigidity, setStyleRigidity] = useState<number>(50);
  const [isWeightingEnabled, setIsWeightingEnabled] = useState<boolean>(false);

  const handleTagWeightChange = useCallback((tagId: string, newWeight: number) => {
    setTagWeights(prevWeights => {
      if (!isWeightingEnabled) {
        return { ...prevWeights, [tagId]: newWeight };
      }
      return { ...prevWeights, [tagId]: newWeight };
    });
  }, [isWeightingEnabled]);

  return (
    <div className="min-h-screen font-sans gradient-bg text-gray-100 overflow-y-auto">
      <div className="gradient-overlay min-h-full">
        <Workspace
          appLabel={appLabel}
          project={project}
          setProject={setProject}
          selectedAssetId={selectedAssetId}
          setSelectedAssetId={setSelectedAssetId}
          pendingDeleteAsset={pendingDeleteAsset}
          toastState={toastState}
          setToastState={setToastState}
          handleAddAsset={handleAddAsset}
          handleAssetDrop={handleAssetDrop}
          handleRequestDeleteAsset={handleRequestDeleteAsset}
          handleConfirmDelete={handleConfirmDelete}
          handleCancelDelete={handleCancelDelete}
          handleUndoDelete={handleUndoDelete}
          handleUpdateAsset={handleUpdateAsset}
          selectedStoryAssets={selectedStoryAssets}
          setSelectedStoryAssets={setSelectedStoryAssets}
          selectedMultiShots={selectedMultiShots}
          setSelectedMultiShots={setSelectedMultiShots}
          selectedMasterImage={selectedMasterImage}
          setSelectedMasterImage={setSelectedMasterImage}
          tagWeights={tagWeights}
          styleRigidity={styleRigidity}
          isWeightingEnabled={isWeightingEnabled}
          onTagWeightChange={handleTagWeightChange}
          onStyleRigidityChange={setStyleRigidity}
          onWeightingToggle={setIsWeightingEnabled}
          activeTimeline={activeTimeline}
          setActiveTimeline={setActiveTimeline}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onGenerateOutput={handleGenerateOutput}
        />
      </div>
    </div>
  );
};

export default App;