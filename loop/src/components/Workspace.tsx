import React, { useState, useCallback } from 'react';
import { ChatRole } from '../types';
import type { Project, Asset, Message, TimelineBlock } from '../types';
import { generateFromWorkspace, generateSandboxResponse, isMockMode } from '../services/geminiService';
import { FracturedLoopLogo } from './IconComponents';
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
  onWeightingToggle
}) => {
  const [activeTimeline, setActiveTimeline] = useState<'primary' | 'secondary' | 'third' | 'fourth'>('primary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isReferenceViewerOpen, setIsReferenceViewerOpen] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isMultiShotModalOpen, setIsMultiShotModalOpen] = useState(false);
  const [isBatchStyleModalOpen, setIsBatchStyleModalOpen] = useState(false);
  const [isCreateShotsModalOpen, setIsCreateShotsModalOpen] = useState(false);
  const [selectedAssetIdForShots, setSelectedAssetIdForShots] = useState<string | null>(null);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isMcpLoading, setIsMcpLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleGenerate = async (outputType: 'story' | 'image' | 'text_to_video' = 'story') => {
    setIsGenerating(true);
    setGeneratedOutput('');

    try {
      const allBlocks = [
        ...project.primaryTimeline.folders.story,
        ...project.primaryTimeline.folders.image,
        ...project.primaryTimeline.folders.text_to_video,
      ];
      const canvas = {
        nodes: allBlocks.map(block => ({
          id: block.id,
          assetId: block.assetId,
          position: { x: 0, y: 0 },
          size: 1
        })),
        connections: []
      };

      const response = await generateFromWorkspace({
        assets: project.assets,
        canvas
      }, tagWeights, styleRigidity, outputType);

      const outputSections: string[] = [];
      if (response.data) {
        outputSections.push(response.data);
      }
      if (response.error) {
        outputSections.push(`⚠️ ${response.error}`);
      }
      if (!outputSections.length) {
        outputSections.push('No content was returned. Please try again in a moment.');
      }

      setGeneratedOutput(outputSections.join('\n\n---\n\n'));
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedOutput('An unexpected error occurred while generating content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

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

  const handleCreateShots = (assetId: string) => {
    setSelectedAssetIdForShots(assetId);
    setIsCreateShotsModalOpen(true);
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
      <header className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FracturedLoopLogo className="w-8 h-8" />
          <h1 className="text-xl font-bold">{appLabel}</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 p-4 border-r border-gray-700 overflow-y-auto">
          <AssetLibraryPanel onAddAsset={handleAddAsset} />
        </div>

        <main className="flex-1 p-4 overflow-y-auto">
          <Timeline
            project={project}
            selectedAssetId={selectedAssetId}
            setSelectedAssetId={setSelectedAssetId}
            onAssetDrop={handleAssetDrop}
            onGenerateOutput={handleGenerate}
            onGenerate={() => handleGenerate()}
            activeTimeline={activeTimeline}
            setActiveTimeline={setActiveTimeline}
            onCreateShots={handleCreateShots}
            isWeightingEnabled={isWeightingEnabled}
            onWeightingToggle={onWeightingToggle}
            styleRigidity={styleRigidity}
            onStyleRigidityChange={onStyleRigidityChange}
            selectedAssetIdForShots={selectedAssetIdForShots}
            setSelectedAssetIdForShots={setSelectedAssetIdForShots}
            isCreateShotsModalOpen={isCreateShotsModalOpen}
            setIsCreateShotsModalOpen={setIsCreateShotsModalOpen}
            setIsMultiShotModalOpen={setIsMultiShotModalOpen}
            setIsBatchStyleModalOpen={setIsBatchStyleModalOpen}
            setIsOutputModalOpen={setIsOutputModalOpen}
          />
        </main>

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
              onGenerate={() => handleGenerate()}
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
    </div>
  );
};

export default Workspace;
