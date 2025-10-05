import { useState, useCallback } from 'react';
import type { Project, Asset, TimelineBlock } from '../types';
import { ToastState } from '../components/ToastNotification';
import { ASSET_TEMPLATES } from '../constants';

type FolderKey = string;

interface UndoState {
  asset: Asset;
  blocks: TimelineBlock[];
  folderAssignments: { folder: FolderKey; block: TimelineBlock }[];
}

const reindexBlocks = (blocks: TimelineBlock[]) =>
  blocks.map((block, index) => ({ ...block, position: index }));

const restoreBlocksWithPositions = (
  existingBlocks: TimelineBlock[],
  restoredBlocks: TimelineBlock[]
) => {
  const sortedRestored = [...restoredBlocks].sort((a, b) => a.position - b.position);
  const mergedBlocks = [...existingBlocks];

  sortedRestored.forEach(block => {
    const insertIndex = Math.min(block.position, mergedBlocks.length);
    mergedBlocks.splice(insertIndex, 0, { ...block });
  });

  return reindexBlocks(mergedBlocks);
};

export const useProject = (initialProject: Project) => {
  const [project, setProject] = useState<Project>(initialProject);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<Asset | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [selectedStoryAssets, setSelectedStoryAssets] = useState<string[]>([]);
  const [selectedMultiShots, setSelectedMultiShots] = useState<string[]>([]);
  const [selectedMasterImage, setSelectedMasterImage] = useState<string | null>(null);

  const handleAddAsset = useCallback((templateType: string) => {
    const template = ASSET_TEMPLATES[templateType];
    if (!template) return;

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      seedId: crypto.randomUUID(),
      type: template.type,
      name: `New ${template.name}`,
      content: template.defaultContent || '',
      tags: template.tags || [],
      createdAt: new Date(),
      summary: '',
      isMaster: false,
      lineage: [],
      metadata: {}
    };

    const newBlock: TimelineBlock = {
      id: crypto.randomUUID(),
      assetId: newAsset.id,
      position: 0 // This will be re-indexed
    };

    setProject(prev => {
      const folderKey = template.category === 'visual' ? 'image' : 'story';
      const targetFolder = prev.primaryTimeline.folders[folderKey] || [];
      
      return {
        ...prev,
        assets: [...prev.assets, newAsset],
        primaryTimeline: {
          ...prev.primaryTimeline,
          folders: {
            ...prev.primaryTimeline.folders,
            [folderKey]: reindexBlocks([...targetFolder, newBlock])
          }
        },
        updatedAt: new Date()
      };
    });

    setSelectedAssetId(newAsset.id);
  }, [setProject, setSelectedAssetId]);

  const handleAssetDrop = useCallback((templateType: string, folder: string = 'story') => {
    handleAddAsset(templateType);
  }, [handleAddAsset]);

  const performAssetRemoval = useCallback((asset: Asset) => {
    let assetRemoved = false;

    setProject(prev => {
      const existingAsset = prev.assets.find(existing => existing.id === asset.id);
      if (!existingAsset) {
        return prev;
      }

      assetRemoved = true;

      const removedBlocks = prev.primaryTimeline.blocks
        .filter(block => block.assetId === asset.id)
        .map(block => ({ ...block }));

      const remainingBlocks = reindexBlocks(
        prev.primaryTimeline.blocks
          .filter(block => block.assetId !== asset.id)
          .map(block => ({ ...block }))
      );

      const removedFolderAssignments: UndoState['folderAssignments'] = [];
      const updatedFoldersEntries = Object.entries(prev.primaryTimeline.folders).map(([folderKey, blocks]) => {
        const keptBlocks: TimelineBlock[] = [];

        blocks.forEach(block => {
          if (block.assetId === asset.id) {
            removedFolderAssignments.push({ folder: folderKey, block: { ...block } });
          } else {
            keptBlocks.push({ ...block });
          }
        });

        return [folderKey, reindexBlocks(keptBlocks)] as [string, TimelineBlock[]];
      });

      const updatedFolders = Object.fromEntries(updatedFoldersEntries) as typeof prev.primaryTimeline.folders;

      setUndoState({
        asset,
        blocks: removedBlocks,
        folderAssignments: removedFolderAssignments
      });

      return {
        ...prev,
        assets: prev.assets.filter(existing => existing.id !== asset.id),
        primaryTimeline: {
          ...prev.primaryTimeline,
          blocks: remainingBlocks,
          folders: updatedFolders
        },
        updatedAt: new Date()
      };
    });

    if (assetRemoved) {
      setSelectedAssetId(prevSelected => (prevSelected === asset.id ? null : prevSelected));
      setToastState({
        id: crypto.randomUUID(),
        message: `Removed "${asset.name}"`,
        allowUndo: true,
        kind: 'warning'
      });
    }
  }, [setProject, setSelectedAssetId, setToastState, setUndoState]);

  const handleRequestDeleteAsset = useCallback((asset: Asset) => {
    setPendingDeleteAsset(asset);
  }, [setPendingDeleteAsset]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteAsset) return;
    performAssetRemoval(pendingDeleteAsset);
    setPendingDeleteAsset(null);
  }, [pendingDeleteAsset, performAssetRemoval]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteAsset(null);
  }, [setPendingDeleteAsset]);

  const handleUndoDelete = useCallback(() => {
    if (!undoState) return;

    const stateToRestore = undoState;

    setProject(prev => {
      if (prev.assets.some(existing => existing.id === stateToRestore.asset.id)) {
        return prev;
      }

      const restoredBlocks = restoreBlocksWithPositions(
        prev.primaryTimeline.blocks.map(block => ({ ...block })),
        stateToRestore.blocks
      );

      const assignmentsByFolder = stateToRestore.folderAssignments.reduce((acc, assignment) => {
        if (!acc[assignment.folder]) {
          acc[assignment.folder] = [];
        }
        acc[assignment.folder].push({ ...assignment.block });
        return acc;
      }, {} as Record<string, TimelineBlock[]>);

      const restoredFoldersEntries = Object.entries(prev.primaryTimeline.folders).map(([folderKey, blocks]) => {
        const restoredForFolder = assignmentsByFolder[folderKey] || [];
        delete assignmentsByFolder[folderKey];
        return [
          folderKey,
          restoreBlocksWithPositions(blocks.map(block => ({ ...block })), restoredForFolder)
        ] as [string, TimelineBlock[]];
      });

      Object.entries(assignmentsByFolder).forEach(([folderKey, blocks]) => {
        restoredFoldersEntries.push([
          folderKey,
          restoreBlocksWithPositions([], blocks)
        ]);
      });

      const restoredFolders = Object.fromEntries(restoredFoldersEntries) as typeof prev.primaryTimeline.folders;

      return {
        ...prev,
        assets: [...prev.assets, stateToRestore.asset],
        primaryTimeline: {
          ...prev.primaryTimeline,
          blocks: restoredBlocks,
          folders: restoredFolders
        },
        updatedAt: new Date()
      };
    });

    setUndoState(null);
    setSelectedAssetId(stateToRestore.asset.id);
    setToastState({
      id: crypto.randomUUID(),
      message: `Restored "${stateToRestore.asset.name}"`,
      kind: 'success'
    });
  }, [undoState, setProject, setSelectedAssetId, setToastState]);

  const handleUpdateAsset = (assetId: string, updates: Partial<Asset>) => {
    setProject(prev => ({
        ...prev,
        assets: prev.assets.map(asset => asset.id === assetId ? { ...asset, ...updates, updatedAt: new Date() } : asset)
    }));
  };

  // Add other handlers here...

  return {
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
    setSelectedMasterImage
  };
};
