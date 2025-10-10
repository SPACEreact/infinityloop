import React, { useState, useCallback, useEffect } from 'react';
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
import { apiConfig } from '../services/config';
import { syncAssetsToMcp } from '../services/mcpService';
import { useWorkspace } from '../state/WorkspaceContext';

const ReferenceViewer = React.lazy(() => import('./ReferenceViewer'));

interface WorkspaceProps {
  appLabel: string;
}

const Workspace: React.FC<WorkspaceProps> = ({ appLabel }) => {
  const {
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
    handleAcceptSuggestion
  } = useWorkspace();

  const [tagWeights, setTagWeights] = useState<Record<string, number>>({});
  const [styleRigidity, setStyleRigidity] = useState<number>(50);
  const [isWeightingEnabled, setIsWeightingEnabled] = useState<boolean>(false);

  const handleTagWeightChange = useCallback((tagId: string, newWeight: number) => {
    setTagWeights(prevWeights => ({ ...prevWeights, [tagId]: newWeight }));
  }, []);

  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isReferenceViewerOpen, setIsReferenceViewerOpen] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isMcpLoading, setIsMcpLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChromaEnabled, setIsChromaEnabled] = useState(() => apiConfig.isEnabled('chromadb'));

  useEffect(() => {
    if (!isApiConfigOpen) {
      setIsChromaEnabled(apiConfig.isEnabled('chromadb'));
    }
  }, [isApiConfigOpen]);

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

      updateUsage(response.usage);

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
  ): boolean => {
    if (selectedStoryAssets.length === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Select at least one master story asset to build a multi-shot plan.',
        kind: 'warning'
      });
      return false;
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
      return false;
    }

    setSelectedStoryAssets([]);
    setActiveTimeline('secondary');
    setSelectedAssetId(createdMultiShotIds[0] ?? null);
    setToastState({
      id: crypto.randomUUID(),
      message: `Created ${createdCount} multi-shot ${createdCount === 1 ? 'plan' : 'plans'} from master stories.`,
      kind: 'success'
    });
    return true;
  };

  const handleCancelMultiShot = () => {
    setSelectedStoryAssets([]);
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

  const handleConfirmBatchStyle = (): boolean => {
    if (selectedMultiShots.length === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Select multi-shot plans to apply batch styling.',
        kind: 'warning'
      });
      return false;
    }

    if (!selectedMasterImage) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Choose a master visual style before applying batch styling.',
        kind: 'warning'
      });
      return false;
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
      return false;
    }

    setSelectedMultiShots([]);
    setSelectedMasterImage(null);
    setActiveTimeline('third');
    setSelectedAssetId(createdBatchAssetIds[0] ?? null);
    setToastState({
      id: crypto.randomUUID(),
      message: `Styled ${totalStyledShots} ${totalStyledShots === 1 ? 'shot' : 'shots'} using the selected master visual.`,
      kind: 'success'
    });
    return true;
  };

  const handleCancelBatchStyle = () => {
    setSelectedMultiShots([]);
    setSelectedMasterImage(null);
  };

  const handleSyncAssetsToMcp = async () => {
    setIsMcpLoading(true);
    try {
      await syncAssetsToMcp(project, 'chromadb');
      setToastState({
        id: crypto.randomUUID(),
        message: 'Assets synchronized to vector storage successfully.',
        kind: 'success'
      });
    } catch (error) {
      console.error('MCP sync error:', error);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Failed to sync assets to vector storage.',
        kind: 'warning'
      });
    } finally {
      setIsMcpLoading(false);
    }
  };

  const handleDismissToast = () => {
    setToastState(null);
  };

  const handleToggleChromaService = (enabled: boolean) => {
    try {
      apiConfig.setEnabled('chromadb', enabled);
      setIsChromaEnabled(apiConfig.isEnabled('chromadb'));
      setToastState({
        id: crypto.randomUUID(),
        message: enabled
          ? 'ChromaDB service enabled. Vector memory sync is active.'
          : 'ChromaDB service disabled. Vector memory sync is paused.',
        kind: enabled ? 'success' : 'warning',
      });
    } catch (error) {
      console.error('Failed to toggle ChromaDB service:', error);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Unable to update ChromaDB service status.',
        kind: 'warning',
      });
      setIsChromaEnabled(apiConfig.isEnabled('chromadb'));
    }
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
              onGenerateOutput={handleGenerateOutput}
              onGenerate={handleGenerate}
              activeTimeline={activeTimeline}
              setActiveTimeline={setActiveTimeline}
              isWeightingEnabled={isWeightingEnabled}
              onWeightingToggle={(enabled) => setIsWeightingEnabled(enabled)}
              styleRigidity={styleRigidity}
              onStyleRigidityChange={(value) => setStyleRigidity(value)}
              selectedStoryAssets={selectedStoryAssets}
              onToggleStoryAsset={handleToggleMasterStorySelection}
              onConfirmMultiShot={handleConfirmMultiShot}
              onCancelMultiShot={handleCancelMultiShot}
              selectedMultiShots={selectedMultiShots}
              selectedMasterImage={selectedMasterImage}
              onToggleMultiShot={handleToggleMultiShotSelection}
              onSelectMasterImage={handleSelectMasterImage}
              onConfirmBatchStyle={handleConfirmBatchStyle}
              onCancelBatchStyle={handleCancelBatchStyle}
              onGenerateDirectorAdvice={handleGenerateDirectorAdvice}
              onAcceptSuggestion={handleAcceptSuggestion}
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
                onTagWeightChange={handleTagWeightChange}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onSyncAssetsToMcp={handleSyncAssetsToMcp}
                isMcpLoading={isMcpLoading}
                onOpenReference={() => setIsReferenceViewerOpen(true)}
                onOpenHelp={() => setIsUserGuideOpen(true)}
                onOpenApi={() => setIsApiConfigOpen(true)}
                onOpenOutput={() => setIsOutputModalOpen(true)}
                isChromaEnabled={isChromaEnabled}
                onToggleChroma={handleToggleChromaService}
                targetModel={project.targetModel ?? null}
                onTargetModelChange={handleSetTargetModel}
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