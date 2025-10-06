import React, { useState, useCallback } from 'react';
import { ChatRole } from '../types';
import type {
  Project,
  Asset,
  Message,
  StructuredInputData,
  IndividualShot,
  ShotDetails
} from '../types';
import { generateSandboxResponse } from '../services/geminiService';
import ChatAssistant from './ChatAssistant';
import UserGuide from './UserGuide';
import { MultiShotCreationModal } from './MultiShotCreationModal';
import { BatchStyleModal } from './BatchStyleModal';
import { ApiConfig } from './ApiConfig';
import { AssetLibraryPanel } from './AssetLibraryPanel';
import { AssetDetailsPanel } from './AssetDetailsPanel';
import { ControlPanel } from './ControlPanel';
import { Timeline } from './Timeline';
import { ConfirmModal } from './ConfirmModal';
import { ToastNotification, ToastState } from './ToastNotification';
import { OutputModal } from './OutputModal';
import WorkspaceHeader from './WorkspaceHeader';
import FloatingOutputButton from './FloatingOutputButton';
// import { saveProject } from '../services/mcpService';

const ReferenceViewer = React.lazy(() => import('./ReferenceViewer'));

interface WorkspaceProps {
  appLabel: string;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  pendingDeleteAsset: Asset | null;
  toastState: ToastState | null;
  setToastState: (toast: ToastState | null) => void;
  handleAddAsset: (templateType: string) => void;
  handleAssetDrop: (templateType: string, folder?: string) => void;
  handleRequestDeleteAsset: (asset: Asset) => void;
  handleConfirmDelete: () => void;
  handleCancelDelete: () => void;
  handleUndoDelete: () => void;
  handleUpdateAsset: (assetId: string, updates: Partial<Asset>) => void;
  selectedStoryAssets: string[];
  setSelectedStoryAssets: (assets: string[]) => void;
  selectedMultiShots: string[];
  setSelectedMultiShots: (assets: string[]) => void;
  selectedMasterImage: string | null;
  setSelectedMasterImage: (id: string | null) => void;
  tagWeights: Record<string, number>;
  styleRigidity: number;
  isWeightingEnabled: boolean;
  onTagWeightChange: (tagId: string, weight: number) => void;
  onStyleRigidityChange: (value: number) => void;
  onWeightingToggle: (enabled: boolean) => void;
  activeTimeline: 'primary' | 'secondary' | 'third' | 'fourth';
  setActiveTimeline: (timeline: 'primary' | 'secondary' | 'third' | 'fourth') => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onGenerateOutput: (folder: 'story' | 'image' | 'all') => void;
}

const Workspace: React.FC<WorkspaceProps> = ({
  appLabel,
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
  tagWeights,
  styleRigidity,
  isWeightingEnabled,
  onTagWeightChange,
  onStyleRigidityChange,
  onWeightingToggle,
  activeTimeline,
  setActiveTimeline,
  isGenerating,
  onGenerate,
  onGenerateOutput
}) => {
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isReferenceViewerOpen, setIsReferenceViewerOpen] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isMultiShotModalOpen, setIsMultiShotModalOpen] = useState(false);
  const [isBatchStyleModalOpen, setIsBatchStyleModalOpen] = useState(false);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isMcpLoading, setIsMcpLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleOpenMultiShotModal = useCallback(() => {
    setIsMultiShotModalOpen(true);
  }, [setIsMultiShotModalOpen]);

  const handleOpenBatchStyleModal = useCallback(() => {
    setIsBatchStyleModalOpen(true);
  }, [setIsBatchStyleModalOpen]);

  const handleSendMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!message.trim()) return null;

    const userMessage: Message = {
      role: ChatRole.USER,
      content: message
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [...chatMessages, userMessage].map(msg => ({
        role: msg.role === ChatRole.USER ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      const response = await generateSandboxResponse(
        message,
        conversationHistory,
        tagWeights,
        styleRigidity
      );

      setChatMessages(prev => {
        const next = [...prev];
        if (response.data) {
          next.push({ role: ChatRole.MODEL, content: response.data });
        }
        if (response.error) {
          next.push({ role: ChatRole.MODEL, content: `⚠️ ${response.error}` });
        }
        return next;
      });

      return response.data ?? null;
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: ChatRole.MODEL,
        content: 'Sorry, I encountered an unexpected error.'
      }]);
      return null;
    } finally {
      setIsChatLoading(false);
    }
  }, [chatMessages, tagWeights, styleRigidity]);

  const handleRequestFieldSuggestion = useCallback(async ({ assetId, fieldKey, fieldLabel, currentValue }: any) => {
    const asset = project.assets.find(a => a.id === assetId);
    if (!asset) return null;

    const context = `Suggest a new value for the field "${fieldLabel}" for the asset named "${asset.name}". The current value is "${currentValue}".`;
    const suggestion = await handleSendMessage(context);
    return suggestion;
  }, [project.assets, handleSendMessage]);

  const handleToggleMasterStorySelection = (assetId: string) => {
    setSelectedStoryAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleConfirmMultiShot = (
    numberOfShots: number,
    shotType: string,
    shotDetails?: ShotDetails,
    structuredData?: StructuredInputData,
    individualShots?: IndividualShot[]
  ) => {
    if (selectedStoryAssets.length === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Select at least one master story asset to build a multi-shot plan.',
        kind: 'warning'
      });
      return;
    }

    const normalizedIndividualShots = individualShots && individualShots.length > 0
      ? individualShots
      : undefined;

    let createdCount = 0;
    const createdMultiShotIds: string[] = [];

    setProject(prev => {
      const masterStoryAssets = prev.assets.filter(
        asset => selectedStoryAssets.includes(asset.id) && asset.type === 'master_story'
      );

      if (masterStoryAssets.length === 0) {
        return prev;
      }

      const now = new Date();
      const updatedAssets = [...prev.assets];
      const shotListsToAdd: { id: string; masterAssetId: string; shots: Asset[]; createdAt: Date }[] = [];

      masterStoryAssets.forEach(masterAsset => {
        const multiShotId = crypto.randomUUID();
        const configuration = {
          numberOfShots,
          shotType,
          shotDetails,
          structuredData,
          totalShots: numberOfShots,
          generatedAt: now.toISOString(),
          ...(normalizedIndividualShots ? { individualShots: normalizedIndividualShots } : {})
        };

        const multiShotAsset: Asset = {
          id: multiShotId,
          seedId: crypto.randomUUID(),
          type: 'multi_shot',
          name: `${masterAsset.name} · Multi-Shot Plan`,
          content: masterAsset.content,
          tags: Array.from(new Set([...(masterAsset.tags || []), 'multi_shot'])),
          createdAt: now,
          summary: `Planned ${numberOfShots} ${shotType.replace('_', ' ')} shots derived from ${masterAsset.name}.`,
          isMaster: false,
          lineage: [...(masterAsset.lineage || []), masterAsset.id],
          shotCount: numberOfShots,
          shotType,
          shotDetails,
          inputData: structuredData,
          individualShots: normalizedIndividualShots,
          metadata: {
            configuration,
            parentMasterAssetId: masterAsset.id
          }
        };

        const perShotConfigs = normalizedIndividualShots && normalizedIndividualShots.length === numberOfShots
          ? normalizedIndividualShots
          : Array.from({ length: numberOfShots }, (_, index) => ({
              id: `shot-${index + 1}`,
              shotNumber: index + 1,
              shotType: shotType === 'mixed'
                ? ['wide', 'medium', 'closeup'][index % 3]
                : shotType,
              description: shotDetails?.shotDescription || '',
              duration: shotDetails?.duration || '3-5 seconds',
              cameraMovement: shotDetails?.cameraMovement || 'static',
              cameraAngle: shotDetails?.cameraAngle || 'eye_level',
              lensType: shotDetails?.lensType || '50mm',
              lightingStyle: shotDetails?.lightingStyle || 'natural',
              framing: shotDetails?.framing || 'medium_shot',
              colorGrading: shotDetails?.colorGrading || 'natural',
              notes: ''
            }));

        const shotAssets = perShotConfigs.map(config => ({
          id: crypto.randomUUID(),
          seedId: crypto.randomUUID(),
          type: 'shot' as const,
          name: `${masterAsset.name} – Shot ${config.shotNumber}`,
          content: config.description || `Configuration for shot ${config.shotNumber}`,
          tags: ['shot', 'multi_shot'],
          createdAt: now,
          summary: `Shot ${config.shotNumber} (${config.shotType.replace('_', ' ')}) planned from ${masterAsset.name}.`,
          metadata: {
            configuration: config,
            parentMultiShotId: multiShotId,
            parentMasterAssetId: masterAsset.id
          },
          lineage: [masterAsset.id],
          isMaster: false
        } as Asset));

        multiShotAsset.metadata = {
          ...multiShotAsset.metadata,
          shotIds: shotAssets.map(asset => asset.id)
        };

        updatedAssets.push(multiShotAsset, ...shotAssets);

        shotListsToAdd.push({
          id: crypto.randomUUID(),
          masterAssetId: masterAsset.id,
          shots: shotAssets,
          createdAt: now
        });

        createdMultiShotIds.push(multiShotId);
      });

      createdCount = createdMultiShotIds.length;

      if (createdCount === 0) {
        return prev;
      }

      const existingSecondary = prev.secondaryTimeline ?? {
        masterAssets: [],
        shotLists: [],
        appliedStyles: {}
      };

      return {
        ...prev,
        assets: updatedAssets,
        secondaryTimeline: {
          masterAssets: [...(existingSecondary.masterAssets || [])],
          shotLists: [...(existingSecondary.shotLists || []), ...shotListsToAdd],
          appliedStyles: existingSecondary.appliedStyles
        },
        updatedAt: now
      };
    });

    if (createdCount === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Select master story assets to create a multi-shot plan.',
        kind: 'warning'
      });
      return;
    }

    setSelectedStoryAssets([]);
    setIsMultiShotModalOpen(false);
    setActiveTimeline('secondary');
    setSelectedAssetId(createdMultiShotIds[0] ?? null);
    setToastState({
      id: crypto.randomUUID(),
      message: `Created ${createdCount} multi-shot ${createdCount === 1 ? 'plan' : 'plans'} from master stories.`,
      kind: 'success'
    });
  };

  const handleToggleMultiShotSelection = (assetId: string) => {
    setSelectedMultiShots(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectMasterImage = (assetId: string) => {
    setSelectedMasterImage(assetId);
  };

  const handleConfirmBatchStyle = () => {
    if (selectedMultiShots.length === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Select multi-shot plans to apply batch styling.',
        kind: 'warning'
      });
      return;
    }

    if (!selectedMasterImage) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Choose a master visual style before applying batch styling.',
        kind: 'warning'
      });
      return;
    }

    let totalStyledShots = 0;
    const createdBatchAssetIds: string[] = [];

    setProject(prev => {
      const masterImageAsset = prev.assets.find(
        asset => asset.id === selectedMasterImage && asset.type === 'master_image'
      );

      if (!masterImageAsset) {
        return prev;
      }

      const multiShotAssets = prev.assets.filter(
        asset => selectedMultiShots.includes(asset.id) && asset.type === 'multi_shot'
      );

      if (multiShotAssets.length === 0) {
        return prev;
      }

      const now = new Date();
      const updatedAssets = [...prev.assets];
      const existingThird = prev.thirdTimeline ?? {
        styledShots: [],
        videoPrompts: [],
        batchStyleAssets: []
      };

      const styledShots = [...(existingThird.styledShots || [])];
      const batchStyleAssets = [...(existingThird.batchStyleAssets || [])];

      multiShotAssets.forEach(multiShot => {
        const relatedShots = prev.assets.filter(
          asset => asset.metadata?.parentMultiShotId === multiShot.id && asset.type === 'shot'
        );

        if (relatedShots.length === 0) {
          return;
        }

        const styledShotAssets = relatedShots.map(shot => {
          const styledId = crypto.randomUUID();
          return {
            id: styledId,
            seedId: crypto.randomUUID(),
            type: 'shot' as const,
            name: `${shot.name} · Styled`,
            content: `${shot.content || ''}\nStyled using ${masterImageAsset.name}.`,
            tags: Array.from(new Set([...(shot.tags || []), 'styled'])),
            createdAt: now,
            summary: `Styled variant informed by ${masterImageAsset.name}.`,
            metadata: {
              parentShotId: shot.id,
              parentMultiShotId: multiShot.id,
              masterImageId: masterImageAsset.id,
              configuration: shot.metadata?.configuration || multiShot.metadata?.configuration,
              styleName: masterImageAsset.name
            },
            lineage: [...(shot.lineage || []), masterImageAsset.id],
            isMaster: false
          } as Asset;
        });

        if (styledShotAssets.length === 0) {
          return;
        }

        styledShots.push(...styledShotAssets);
        updatedAssets.push(...styledShotAssets);
        totalStyledShots += styledShotAssets.length;

        const batchAssetId = crypto.randomUUID();
        const batchAsset: Asset = {
          id: batchAssetId,
          seedId: crypto.randomUUID(),
          type: 'batch_style',
          name: `${multiShot.name} · Styled Batch`,
          content: `Styled ${styledShotAssets.length} shots using ${masterImageAsset.name}.`,
          tags: ['batch_style'],
          createdAt: now,
          summary: `Batch styling derived from ${multiShot.name}.`,
          metadata: {
            masterImageId: masterImageAsset.id,
            multiShotId: multiShot.id,
            styledShotIds: styledShotAssets.map(asset => asset.id)
          },
          lineage: [multiShot.id, masterImageAsset.id],
          isMaster: false
        };

        batchStyleAssets.push(batchAsset);
        updatedAssets.push(batchAsset);
        createdBatchAssetIds.push(batchAssetId);
      });

      if (totalStyledShots === 0) {
        return prev;
      }

      return {
        ...prev,
        assets: updatedAssets,
        thirdTimeline: {
          styledShots,
          videoPrompts: [...(existingThird.videoPrompts || [])],
          batchStyleAssets
        },
        updatedAt: now
      };
    });

    if (totalStyledShots === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Select multi-shot plans that contain shots before applying styling.',
        kind: 'warning'
      });
      return;
    }

    setSelectedMultiShots([]);
    setSelectedMasterImage(null);
    setIsBatchStyleModalOpen(false);
    setActiveTimeline('third');
    setSelectedAssetId(createdBatchAssetIds[0] ?? null);
    setToastState({
      id: crypto.randomUUID(),
      message: `Styled ${totalStyledShots} ${totalStyledShots === 1 ? 'shot' : 'shots'} using the selected master visual.`,
      kind: 'success'
    });
  };

  const handleSyncAssetsToMcp = async () => {
    setIsMcpLoading(true);
    try {
      // await saveProject(project.id, project);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Project saved successfully!',
        kind: 'success'
      });
    } catch (error) {
      console.error('MCP save error:', error);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Failed to save project.',
        kind: 'warning'
      });
    } finally {
      setIsMcpLoading(false);
    }
  };

  const handleDismissToast = () => {
    setToastState(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <WorkspaceHeader 
        appLabel={appLabel} 
        isChatOpen={isChatOpen} 
        onToggleChat={() => setIsChatOpen(!isChatOpen)} 
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 p-4 border-r border-gray-700 overflow-y-auto">
          <AssetLibraryPanel onAddAsset={handleAddAsset} />
        </div>

        <main className={`flex-1 relative ${isChatOpen ? 'w-1/2' : ''}`}>
          <FloatingOutputButton onOpenModal={() => setIsOutputModalOpen(true)} />
          
          <div className="p-4 overflow-y-auto h-full">
            <Timeline
              project={project}
              selectedAssetId={selectedAssetId}
              setSelectedAssetId={setSelectedAssetId}
              onAssetDrop={handleAssetDrop}
              onGenerateOutput={onGenerateOutput}
              onGenerate={onGenerate}
              activeTimeline={activeTimeline}
              setActiveTimeline={setActiveTimeline}
              isWeightingEnabled={isWeightingEnabled}
              onWeightingToggle={onWeightingToggle}
              styleRigidity={styleRigidity}
              onStyleRigidityChange={onStyleRigidityChange}
              setIsOutputModalOpen={setIsOutputModalOpen}
              onOpenMultiShotModal={handleOpenMultiShotModal}
              onOpenBatchStyleModal={handleOpenBatchStyleModal}
            />
          </div>
        </main>

        {isChatOpen && (
          <div className="w-1/3 border-l border-gray-700">
            <ChatAssistant
              messages={chatMessages}
              isLoading={isChatLoading}
              generatedOutput={generatedOutput}
              onSendMessage={handleSendMessage}
              project={project}
              onCreateAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
            />
          </div>
        )}

        {!isChatOpen && (
          <div className="w-1/4 p-4 border-l border-gray-700 overflow-y-auto">
            {selectedAssetId ? (
              <AssetDetailsPanel
                selectedAssetId={selectedAssetId}
                project={project}
                onUpdateAsset={handleUpdateAsset}
                onDeleteAsset={handleRequestDeleteAsset}
                onClose={() => setSelectedAssetId(null)}
                onRequestSuggestion={handleRequestFieldSuggestion}
              />
            ) : (
              <ControlPanel
                tagWeights={tagWeights}
                onTagWeightChange={onTagWeightChange}
                onGenerate={onGenerate}
                isGenerating={isGenerating}
                onSyncAssetsToMcp={handleSyncAssetsToMcp}
                isMcpLoading={isMcpLoading}
                onOpenReference={() => setIsReferenceViewerOpen(true)}
                onOpenHelp={() => setIsUserGuideOpen(true)}
                onOpenApi={() => setIsApiConfigOpen(true)}
                onOpenOutput={() => setIsOutputModalOpen(true)}
              />
            )}
          </div>
        )}
      </div>

      <ToastNotification
        toast={toastState}
        onDismiss={handleDismissToast}
        onUndo={handleUndoDelete}
      />

      <ConfirmModal
        isOpen={!!pendingDeleteAsset}
        title="Confirm Deletion"
        description={`Are you sure you want to delete "${pendingDeleteAsset?.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <OutputModal
        isOpen={isOutputModalOpen}
        finalAssets={project.assets}
        onClose={() => setIsOutputModalOpen(false)}
      />

      <MultiShotCreationModal
        isOpen={isMultiShotModalOpen}
        assets={project.assets}
        selectedAssets={selectedStoryAssets}
        onToggleAsset={handleToggleMasterStorySelection}
        onConfirm={handleConfirmMultiShot}
        onCancel={() => {
          setIsMultiShotModalOpen(false);
          setSelectedStoryAssets([]);
        }}
      />

      <BatchStyleModal
        isOpen={isBatchStyleModalOpen}
        assets={project.assets}
        selectedMultiShots={selectedMultiShots}
        selectedMasterImage={selectedMasterImage}
        onToggleMultiShot={handleToggleMultiShotSelection}
        onSelectMasterImage={handleSelectMasterImage}
        onConfirm={handleConfirmBatchStyle}
        onCancel={() => {
          setIsBatchStyleModalOpen(false);
          setSelectedMultiShots([]);
          setSelectedMasterImage(null);
        }}
      />

      <UserGuide 
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />

      <ApiConfig 
        isOpen={isApiConfigOpen}
        onClose={() => setIsApiConfigOpen(false)}
      />

      <React.Suspense fallback={<div>Loading...</div>}>
        <ReferenceViewer
          isOpen={isReferenceViewerOpen}
          onClose={() => setIsReferenceViewerOpen(false)}
        />
      </React.Suspense>
    </div>
  );
};

export default Workspace;