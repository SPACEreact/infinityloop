import React, { createContext, useContext, useMemo } from 'react';
import type { Project } from '../types';
import { useProject } from '../hooks/useProject';

type WorkspaceValue = ReturnType<typeof useProject>;

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

interface WorkspaceProviderProps {
  readonly initialProject: Project;
  readonly children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  initialProject,
  children,
}) => {
  const workspace = useProject(initialProject);

  const value = useMemo(() => workspace, [workspace]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }

  return context;
};
