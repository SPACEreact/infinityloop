import { useState, useCallback, useMemo } from 'react';
import type { SetStateAction } from 'react';
import type { Project, Asset, TimelineBlock, UsageTotals, UsageStats } from '../types';
import { ToastState } from '../components/ToastNotification';
import { ASSET_TEMPLATES } from '../constants';
import {
  generateFromWorkspace,
  generateDirectorAdvice,
  type DirectorAdviceContext,
  type DirectorAdviceSuggestionPayload,
} from '../services/geminiService';
import { TOKEN_DAILY_LIMIT } from '../services/config';

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

const normalizeUsageTotals = (
  usageTotals: Project['usageTotals'] | undefined,
): UsageTotals | undefined => {
  if (!usageTotals) {
    return usageTotals ?? undefined;
  }

  const normalize = (value: unknown): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }

    return 0;
  };

  const typedTotals = usageTotals as Partial<UsageTotals>;
  const hasPrompt = typedTotals.promptTokens !== undefined && typedTotals.promptTokens !== null;
  const hasCompletion =
    typedTotals.completionTokens !== undefined && typedTotals.completionTokens !== null;
  const hasTotal = typedTotals.totalTokens !== undefined && typedTotals.totalTokens !== null;

  if (!hasPrompt && !hasCompletion && !hasTotal) {
    return undefined;
  }

  const promptTokens = normalize(typedTotals.promptTokens);
  const completionTokens = normalize(typedTotals.completionTokens);
  const totalTokensRaw = normalize(typedTotals.totalTokens);

  const totalTokens = totalTokensRaw || promptTokens + completionTokens;

  const isAlreadyNormalized =
    typeof typedTotals.promptTokens === 'number' &&
    typedTotals.promptTokens === promptTokens &&
    typeof typedTotals.completionTokens === 'number' &&
    typedTotals.completionTokens === completionTokens &&
    typeof typedTotals.totalTokens === 'number' &&
    typedTotals.totalTokens === totalTokens;

  if (isAlreadyNormalized) {
    return typedTotals as UsageTotals;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
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

  const normalizedUsageTotals = normalizeUsageTotals(project.usageTotals);

  if (normalizedUsageTotals !== project.usageTotals) {
    normalizedProject = {
      ...normalizedProject,
      usageTotals: normalizedUsageTotals,
    };
  }

  return normalizedProject;
};

const toContentPreview = (value?: string | null, limit: number = 600): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit)}...`;
};

const mapTimelineBlocksToDirectorEntries = (
  blocks: TimelineBlock[] | undefined,
  assetsById: Map<string, Asset>,
): DirectorAdviceContext['primaryTimeline']['story'] => {
  if (!blocks?.length) {
    return [];
  }

  return blocks.map((block) => {
    const asset = assetsById.get(block.assetId);
    return {
      assetId: block.assetId,
      name: asset?.name ?? 'Untitled asset',
      type: asset?.type,
      summary: asset?.summary,
      contentPreview: toContentPreview(asset?.content, 360),
    };
  });
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
  const [isDirectorAdviceLoading, setIsDirectorAdviceLoading] = useState(false);

  const updateUsage = useCallback((usage?: UsageTotals | null) => {
    if (!usage) {
      return;
    }

    const sanitized = normalizeUsageTotals(usage);

    setProjectState(prev => {
      const current = prev.usage ?? DEFAULT_USAGE;
      if (usageTotalsEqual(current, sanitized)) {
        if (prev.usage) {
          return prev;
        }
      }

      if (prev.usage && usageTotalsEqual(prev.usage, sanitized)) {
        return prev;
      }

      return {
        ...prev,
        usage: sanitized,
      };
    });
  }, []);

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

  const handleAcceptSuggestion = useCallback(
    (suggestionId: string) => {
      let didUpdate = false;

      setProject((prev) => {
        const timeline = prev.fourthTimeline;
        if (!timeline) {
          return prev;
        }

        let mutated = false;
        const updatedSuggestions = timeline.suggestions.map((suggestion) => {
          if (suggestion.id === suggestionId && !suggestion.accepted) {
            mutated = true;
            return { ...suggestion, accepted: true };
          }
          return suggestion;
        });

        if (!mutated) {
          return prev;
        }

        didUpdate = true;
        const acceptedSuggestions = updatedSuggestions.filter((suggestion) => suggestion.accepted);

        return {
          ...prev,
          fourthTimeline: {
            ...timeline,
            suggestions: updatedSuggestions,
            acceptedSuggestions,
          },
          updatedAt: new Date(),
        };
      });

      if (didUpdate) {
        setToastState({
          id: crypto.randomUUID(),
          message: 'Suggestion marked as accepted.',
          kind: 'success',
        });
      }
    },
    [setProject, setToastState],
  );

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
      targetModel: project.targetModel ?? null,
    };

    const runGeneration = async (target: 'story' | 'image') => {
      const outputType =
        target === 'story' ? 'Master Story' : 'Master Visual Style';
      const result = await generateFromWorkspace(workspace, {}, 50, outputType);

      updateUsage(result.usage);

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

  const handleGenerateDirectorAdvice = useCallback(
    async (options?: { tagWeights?: Record<string, number>; styleRigidity?: number }) => {
      setIsDirectorAdviceLoading(true);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Analyzing project for director-level notes...',
        kind: 'info',
      });

      try {
        const result = await generateDirectorAdvice(project, {
          tagWeights: options?.tagWeights,
          styleRigidity: options?.styleRigidity,
        });

        updateUsage(result.usage);

        if (result.data) {
          const incomingSuggestions = result.data.map(suggestion => ({
            ...suggestion,
            accepted: suggestion.accepted ?? false,
          }));

          setProject(prev => {
            const existingAccepted = prev.fourthTimeline?.acceptedSuggestions ?? [];
            const acceptedMap = new Map(existingAccepted.map(item => [item.id, item] as const));

            const synchronizedSuggestions = incomingSuggestions.map(suggestion => {
              if (acceptedMap.has(suggestion.id) || suggestion.accepted) {
                const updatedSuggestion = { ...suggestion, accepted: true };
                acceptedMap.set(suggestion.id, updatedSuggestion);
                return updatedSuggestion;
              }
              return suggestion;
            });

            const acceptedSuggestions = synchronizedSuggestions.filter(
              suggestion => suggestion.accepted,
            );

            return {
              ...prev,
              fourthTimeline: {
                suggestions: synchronizedSuggestions,
                acceptedSuggestions,
              },
              updatedAt: new Date(),
            };
          });

          setToastState({
            id: crypto.randomUUID(),
            message: result.isMock
              ? 'Director advice mocked — connect Gemini for live suggestions.'
              : 'Director advice ready. Review the Director’s Advice timeline.',
            kind: result.isMock ? 'info' : 'success',
          });
        } else if (result.error) {
          setToastState({
            id: crypto.randomUUID(),
            message: `Director advice failed: ${result.error}`,
            kind: 'error',
          });
        }
      } catch (error) {
        console.error('Failed to generate director advice:', error);
        setToastState({
          id: crypto.randomUUID(),
          message: 'Director advice request failed unexpectedly.',
          kind: 'error',
        });
      } finally {
        setIsDirectorAdviceLoading(false);
      }
    },
    [project, setProject, setToastState]
  );

  const handleAcceptDirectorSuggestion = useCallback(
    (suggestionId: string) => {
      let suggestionAccepted = false;

      setProject(prev => {
        const timeline = prev.fourthTimeline;
        if (!timeline) {
          return prev;
        }

        const updatedSuggestions = timeline.suggestions.map(suggestion => {
          if (suggestion.id === suggestionId && !suggestion.accepted) {
            suggestionAccepted = true;
            return { ...suggestion, accepted: true };
          }
          return suggestion;
        });

        if (!suggestionAccepted) {
          return prev;
        }

        const acceptedMap = new Map(
          (timeline.acceptedSuggestions ?? []).map(item => [item.id, item] as const)
        );
        updatedSuggestions
          .filter(item => item.accepted)
          .forEach(item => acceptedMap.set(item.id, item));

        return {
          ...prev,
          fourthTimeline: {
            suggestions: updatedSuggestions,
            acceptedSuggestions: Array.from(acceptedMap.values()),
          },
          updatedAt: new Date(),
        };
      });

      if (suggestionAccepted) {
        setToastState({
          id: crypto.randomUUID(),
          message: 'Suggestion marked as accepted.',
          kind: 'success',
        });
      }
    },
    [setProject, setToastState]
  );

  const handleSetTargetModel = useCallback(
    (modelId: string | null) => {
      setProject(prev => {
        const normalized = modelId?.trim() ? modelId.trim() : undefined;
        if (prev.targetModel === normalized) {
          return prev;
        }

        return {
          ...prev,
          targetModel: normalized,
          updatedAt: new Date(),
        };
      });
    },
    [setProject]
  );

  const usageStats = useMemo<UsageStats | null>(() => {
    const totals = project.usageTotals;
    if (!totals) {
      return null;
    }

    const used = Math.max(0, totals.totalTokens);
    const limit = Number.isFinite(TOKEN_DAILY_LIMIT) ? TOKEN_DAILY_LIMIT : 0;
    const normalizedLimit = limit > 0 ? limit : 0;

    if (!normalizedLimit) {
      return {
        used,
        remaining: 0,
        percent: 0,
        limit: 0,
      };
    }

    const remaining = normalizedLimit - used;
    const percent = (used / normalizedLimit) * 100;

    return {
      used,
      remaining,
      percent,
      limit: normalizedLimit,
    };
  }, [project.usageTotals]);

  return useMemo(
    () => ({
      project,
      setProject,
      updateUsage,
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
      handleGenerateDirectorAdvice,
      handleAcceptSuggestion,
      handleSetTargetModel,
      usageStats,
    }),
    [
      project,
      setProject,
      updateUsage,
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
      handleGenerateDirectorAdvice,
      handleAcceptSuggestion,
      handleSetTargetModel,
      usageStats,
    ],
  );
};
