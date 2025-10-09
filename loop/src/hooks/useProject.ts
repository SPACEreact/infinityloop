import { useState, useCallback, useMemo } from 'react';
import type { SetStateAction } from 'react';
import type { Project, Asset, TimelineBlock } from '../types';
import { ToastState } from '../components/ToastNotification';
import { ASSET_TEMPLATES } from '../constants';
import { generateFromWorkspace } from '../services/geminiService';

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
  restoredBlocks: TimelineBlock[],
) => {
  const sortedRestored = [...restoredBlocks].sort(
    (a, b) => a.position - b.position,
  );
  const mergedBlocks = [...existingBlocks];

  sortedRestored.forEach((block) => {
    const insertIndex = Math.min(block.position, mergedBlocks.length);
    mergedBlocks.splice(insertIndex, 0, { ...block });
  });

  return reindexBlocks(mergedBlocks);
};

const resolveCanonicalSeed = (asset: Asset, canonicalSeeds: Map<string, string>): string => {
  const existingSeed = canonicalSeeds.get(asset.id);
  if (existingSeed) {
    return existingSeed;
  }

  const sanitizedSeed = asset.seedId?.trim() ? asset.seedId.trim() : undefined;
  const canonicalSeed = sanitizedSeed ?? crypto.randomUUID();

  canonicalSeeds.set(asset.id, canonicalSeed);
  return canonicalSeed;
};

const normalizeAssetSeed = <T extends Asset>(asset: T, canonicalSeeds: Map<string, string>): T => {
  const canonicalSeed = resolveCanonicalSeed(asset, canonicalSeeds);
  if (asset.seedId === canonicalSeed) {
    return asset;
  }

  return { ...asset, seedId: canonicalSeed } as T;
};

const ensureAssetSeeds = <T extends Asset>(
  assets?: T[] | null,
  canonicalSeeds?: Map<string, string>
): T[] | undefined => {
  if (!assets) {
    return assets ?? undefined;
  }

  let updatedAssets: T[] | undefined;

  assets.forEach((asset, index) => {
    const normalizedAsset = normalizeAssetSeed(asset, canonicalSeeds);
    let desiredSeedId = asset.seedId || undefined;

    if (canonicalSeeds) {
      const canonicalSeedId = canonicalSeeds.get(asset.id);

      if (canonicalSeedId) {
        if (desiredSeedId !== canonicalSeedId) {
          desiredSeedId = canonicalSeedId;
        }
      } else {
        desiredSeedId = desiredSeedId ?? crypto.randomUUID();
        canonicalSeeds.set(asset.id, desiredSeedId);
      }
    } else if (!desiredSeedId) {
      desiredSeedId = crypto.randomUUID();
    }

    if (normalizedAsset !== asset || (desiredSeedId && desiredSeedId !== asset.seedId)) {
      if (!updatedAssets) {
        updatedAssets = [...assets];
      }

      updatedAssets[index] = { ...normalizedAsset, seedId: desiredSeedId } as T;
    }
  });

  return updatedAssets ?? assets;
};

const normalizeSeeds = (project: Project): Project => {
  let normalizedProject = project;
  const canonicalSeeds = new Map<string, string>();

  const normalizedAssets = ensureAssetSeeds(project.assets, canonicalSeeds)!;
  if (normalizedAssets !== project.assets) {
    normalizedProject = {
      ...normalizedProject,
      assets: normalizedAssets,
    };
  }

  if (project.secondaryTimeline) {
    const secondary = project.secondaryTimeline;
    let normalizedSecondary: typeof secondary | undefined;

    const normalizedMasterAssets = ensureAssetSeeds(secondary.masterAssets, canonicalSeeds)!;
    if (normalizedMasterAssets !== secondary.masterAssets) {
      normalizedSecondary = {
        ...(normalizedSecondary ?? { ...secondary }),
        masterAssets: normalizedMasterAssets,
      };
    }

    let shotListsUpdated: typeof secondary.shotLists | undefined;
    secondary.shotLists.forEach((shotList, index) => {
      const normalizedShots = ensureAssetSeeds(shotList.shots, canonicalSeeds)!;
      if (normalizedShots !== shotList.shots) {
        if (!shotListsUpdated) {
          shotListsUpdated = [...secondary.shotLists];
        }
        shotListsUpdated[index] = { ...shotList, shots: normalizedShots };
      }
    });

    if (shotListsUpdated) {
      normalizedSecondary = {
        ...(normalizedSecondary ?? { ...secondary }),
        shotLists: shotListsUpdated,
      };
    }

    if (normalizedSecondary) {
      normalizedProject = {
        ...normalizedProject,
        secondaryTimeline: normalizedSecondary,
      };
    }
  }

  if (project.thirdTimeline) {
    const third = project.thirdTimeline;
    let normalizedThird: typeof third | undefined;

    const normalizedStyledShots = ensureAssetSeeds(third.styledShots, canonicalSeeds)!;
    if (normalizedStyledShots !== third.styledShots) {
      normalizedThird = {
        ...(normalizedThird ?? { ...third }),
        styledShots: normalizedStyledShots,
      };
    }

    const normalizedBatchAssets = ensureAssetSeeds(third.batchStyleAssets, canonicalSeeds);
    if (normalizedBatchAssets && normalizedBatchAssets !== third.batchStyleAssets) {
      normalizedThird = {
        ...(normalizedThird ?? { ...third }),
        batchStyleAssets: normalizedBatchAssets,
      };
    }

    if (normalizedThird) {
      normalizedProject = {
        ...normalizedProject,
        thirdTimeline: normalizedThird,
      };
    }
  }

  return normalizedProject;
};

export const useProject = (initialProject: Project) => {
  const [project, setProjectState] = useState<Project>(() =>
    normalizeSeeds(initialProject),
  );
  const setProject = useCallback(
    (update: SetStateAction<Project>) => {
      setProjectState((prev) => {
        const next =
          typeof update === 'function'
            ? (update as (value: Project) => Project)(prev)
            : update;
        return normalizeSeeds(next);
      });
    },
    [setProjectState],
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<Asset | null>(
    null,
  );
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [selectedStoryAssets, setSelectedStoryAssets] = useState<string[]>([]);
  const [selectedMultiShots, setSelectedMultiShots] = useState<string[]>([]);
  const [selectedMasterImage, setSelectedMasterImage] = useState<string | null>(
    null,
  );
  const [activeTimeline, setActiveTimeline] = useState<
    'primary' | 'secondary' | 'third' | 'fourth'
  >('primary');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddAsset = useCallback(
    (templateType: string) => {
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
        metadata: {},
      };

      const newBlock: TimelineBlock = {
        id: crypto.randomUUID(),
        assetId: newAsset.id,
        position: 0, // This will be re-indexed
      };

      setProject((prev) => {
        const folderKey = template.category === 'visual' ? 'image' : 'story';
        const targetFolder = prev.primaryTimeline.folders[folderKey] || [];

        return {
          ...prev,
          assets: [...prev.assets, newAsset],
          primaryTimeline: {
            ...prev.primaryTimeline,
            folders: {
              ...prev.primaryTimeline.folders,
              [folderKey]: reindexBlocks([...targetFolder, newBlock]),
            },
          },
          updatedAt: new Date(),
        };
      });

      setSelectedAssetId(newAsset.id);
    },
    [setProject, setSelectedAssetId],
  );

  const handleAssetDrop = useCallback(
    (templateType: string, folder: string = 'story') => {
      handleAddAsset(templateType);
    },
    [handleAddAsset],
  );

  const performAssetRemoval = useCallback(
    (asset: Asset) => {
      let assetRemoved = false;

      setProject((prev) => {
        const existingAsset = prev.assets.find(
          (existing) => existing.id === asset.id,
        );
        if (!existingAsset) {
          return prev;
        }

        assetRemoved = true;

        const removedBlocks = prev.primaryTimeline.blocks
          .filter((block) => block.assetId === asset.id)
          .map((block) => ({ ...block }));

        const remainingBlocks = reindexBlocks(
          prev.primaryTimeline.blocks
            .filter((block) => block.assetId !== asset.id)
            .map((block) => ({ ...block })),
        );

        const removedFolderAssignments: UndoState['folderAssignments'] = [];
        const updatedFoldersEntries = Object.entries(
          prev.primaryTimeline.folders,
        ).map(([folderKey, blocks]) => {
          const keptBlocks: TimelineBlock[] = [];

          blocks.forEach((block) => {
            if (block.assetId === asset.id) {
              removedFolderAssignments.push({
                folder: folderKey,
                block: { ...block },
              });
            } else {
              keptBlocks.push({ ...block });
            }
          });

          return [folderKey, reindexBlocks(keptBlocks)] as [
            string,
            TimelineBlock[],
          ];
        });

        const updatedFolders = Object.fromEntries(
          updatedFoldersEntries,
        ) as typeof prev.primaryTimeline.folders;

        setUndoState({
          asset,
          blocks: removedBlocks,
          folderAssignments: removedFolderAssignments,
        });

        return {
          ...prev,
          assets: prev.assets.filter((existing) => existing.id !== asset.id),
          primaryTimeline: {
            ...prev.primaryTimeline,
            blocks: remainingBlocks,
            folders: updatedFolders,
          },
          updatedAt: new Date(),
        };
      });

      if (assetRemoved) {
        setSelectedAssetId((prevSelected) =>
          prevSelected === asset.id ? null : prevSelected,
        );
        setToastState({
          id: crypto.randomUUID(),
          message: `Removed "${asset.name}"`,
          allowUndo: true,
          kind: 'warning',
        });
      }
    },
    [setProject, setSelectedAssetId, setToastState, setUndoState],
  );

  const handleRequestDeleteAsset = useCallback(
    (asset: Asset) => {
      setPendingDeleteAsset(asset);
    },
    [setPendingDeleteAsset],
  );

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

    setProject((prev) => {
      if (
        prev.assets.some((existing) => existing.id === stateToRestore.asset.id)
      ) {
        return prev;
      }

      const restoredBlocks = restoreBlocksWithPositions(
        prev.primaryTimeline.blocks.map((block) => ({ ...block })),
        stateToRestore.blocks,
      );

      const assignmentsByFolder = stateToRestore.folderAssignments.reduce(
        (acc, assignment) => {
          if (!acc[assignment.folder]) {
            acc[assignment.folder] = [];
          }
          acc[assignment.folder].push({ ...assignment.block });
          return acc;
        },
        {} as Record<string, TimelineBlock[]>,
      );

      const restoredFoldersEntries = Object.entries(
        prev.primaryTimeline.folders,
      ).map(([folderKey, blocks]) => {
        const restoredForFolder = assignmentsByFolder[folderKey] || [];
        delete assignmentsByFolder[folderKey];
        return [
          folderKey,
          restoreBlocksWithPositions(
            blocks.map((block) => ({ ...block })),
            restoredForFolder,
          ),
        ] as [string, TimelineBlock[]];
      });

      Object.entries(assignmentsByFolder).forEach(([folderKey, blocks]) => {
        restoredFoldersEntries.push([
          folderKey,
          restoreBlocksWithPositions([], blocks),
        ]);
      });

      const restoredFolders = Object.fromEntries(
        restoredFoldersEntries,
      ) as typeof prev.primaryTimeline.folders;

      return {
        ...prev,
        assets: [...prev.assets, stateToRestore.asset],
        primaryTimeline: {
          ...prev.primaryTimeline,
          blocks: restoredBlocks,
          folders: restoredFolders,
        },
        updatedAt: new Date(),
      };
    });

    setUndoState(null);
    setSelectedAssetId(stateToRestore.asset.id);
    setToastState({
      id: crypto.randomUUID(),
      message: `Restored "${stateToRestore.asset.name}"`,
      kind: 'success',
    });
  }, [undoState, setProject, setSelectedAssetId, setToastState]);

  const handleUpdateAsset = (assetId: string, updates: Partial<Asset>) => {
    setProject((prev) => ({
      ...prev,
      assets: prev.assets.map((asset) =>
        asset.id === assetId
          ? { ...asset, ...updates, updatedAt: new Date() }
          : asset,
      ),
    }));
  };

  const handleGenerateOutput = async (folder: 'story' | 'image' | 'all') => {
    setIsGenerating(true);
    setToastState({
      id: crypto.randomUUID(),
      message: 'Generating master assets...',
      kind: 'info',
    });

    const workspace = {
      assets: project.assets,
      canvas: { nodes: [], connections: [] },
    };

    const runGeneration = async (target: 'story' | 'image') => {
      const outputType =
        target === 'story' ? 'Master Story' : 'Master Visual Style';
      const result = await generateFromWorkspace(workspace, {}, 50, outputType);

      if (result.data && !result.error) {
        const now = new Date();
        const sourceFolder = target === 'story' ? 'story' : 'image';

        const newMasterAsset: Asset = {
          id: crypto.randomUUID(),
          seedId: crypto.randomUUID(),
          type: target === 'story' ? 'master_story' : 'master_image',
          name: `Master ${target === 'story' ? 'Story' : 'Visual Style'}`,
          content: result.data,
          tags: ['master-asset', target === 'story' ? 'story' : 'visual'],
          createdAt: now,
          summary: `Generated master ${target === 'story' ? 'story' : 'visual style'} asset.`,
          isMaster: true,
          lineage:
            project.primaryTimeline.folders[
              sourceFolder as keyof typeof project.primaryTimeline.folders
            ]?.map((block) => block.assetId) || [],
          metadata: {
            generatedAt: now.toISOString(),
            outputType,
          },
        };

        setProject((prev) => {
          const updatedAssets = [...prev.assets, newMasterAsset];

          if (target === 'story') {
            const existingSecondary = prev.secondaryTimeline ?? {
              masterAssets: [],
              shotLists: [],
              appliedStyles: {},
            };

            return {
              ...prev,
              assets: updatedAssets,
              secondaryTimeline: {
                masterAssets: [
                  ...(existingSecondary.masterAssets || []),
                  newMasterAsset,
                ],
                shotLists: [...(existingSecondary.shotLists || [])],
                appliedStyles: existingSecondary.appliedStyles,
              },
              updatedAt: now,
            };
          }

          const existingThird = prev.thirdTimeline ?? {
            styledShots: [],
            videoPrompts: [],
            batchStyleAssets: [],
          };

          return {
            ...prev,
            assets: updatedAssets,
            thirdTimeline: {
              styledShots: [...(existingThird.styledShots || [])],
              videoPrompts: [...(existingThird.videoPrompts || [])],
              batchStyleAssets: [...(existingThird.batchStyleAssets || [])],
            },
            updatedAt: now,
          };
        });

        setToastState({
          id: crypto.randomUUID(),
          message: `Master ${target === 'story' ? 'story' : 'visual'} asset generated successfully!`,
          kind: 'success',
        });
        setActiveTimeline(target === 'story' ? 'secondary' : 'third');

        return true;
      }

      setToastState({
        id: crypto.randomUUID(),
        message: `Generation failed: ${result.error || 'Unknown error'}`,
        kind: 'error',
      });
      return false;
    };

    if (folder === 'all') {
      await runGeneration('story');
      await runGeneration('image');
    } else {
      await runGeneration(folder);
    }

    setIsGenerating(false);
  };

  const handleGenerate = async () => {
    await handleGenerateOutput('all');
  };

  return useMemo(
    () => ({
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
      handleGenerateOutput,
    }),
    [
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
      handleGenerateOutput,
    ],
  );
};
