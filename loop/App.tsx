import React, { useState, useCallback } from 'react';
import type { Project } from './types';
import Workspace from './components/Workspace';

const App: React.FC = () => {
  const appLabel = 'Loop';

  // Initialize with empty project
  const [project, setProject] = useState<Project>({
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
  });

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
          tagWeights={tagWeights}
          styleRigidity={styleRigidity}
          isWeightingEnabled={isWeightingEnabled}
          onTagWeightChange={handleTagWeightChange}
          onStyleRigidityChange={setStyleRigidity}
          onWeightingToggle={setIsWeightingEnabled}
        />
      </div>
    </div>
  );
};

export default App;
