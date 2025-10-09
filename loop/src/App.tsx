import React from 'react';
import type { Project } from './types';
import Workspace from './components/Workspace';
import { WorkspaceProvider } from './state/WorkspaceContext';

const initialProject: Project = {
  id: 'project-1',
  name: 'Untitled Project',
  assets: [],
  primaryTimeline: {
    folders: {
      story: [],
      image: [],
      text_to_video: [],
    },
  },
  secondaryTimeline: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const App: React.FC = () => {
  const appLabel = 'Loop';

  return (
    <WorkspaceProvider initialProject={initialProject}>
      <div className="min-h-screen font-sans gradient-bg text-gray-100 overflow-y-auto">
        <div className="gradient-overlay min-h-full">
          <Workspace appLabel={appLabel} />
        </div>
      </div>
    </WorkspaceProvider>
  );
};

export default App;
