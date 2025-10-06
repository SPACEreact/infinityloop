import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Workspace from '../../components/Workspace';
import type { Project, Asset } from '../../types';
import { vi } from 'vitest';

describe('timeline modal triggers', () => {
  const baseAssets: Asset[] = [
    {
      id: 'story-1',
      seedId: 'seed-story-1',
      type: 'master_story',
      name: 'Master Story One',
      content: 'Story content',
      tags: ['story'],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      summary: 'A hero begins the journey',
      isMaster: true,
      lineage: [],
      metadata: {}
    },
    {
      id: 'multi-shot-1',
      seedId: 'seed-multi-1',
      type: 'multi_shot',
      name: 'Plan Alpha',
      content: 'Plan content',
      tags: ['multi_shot'],
      createdAt: new Date('2024-01-02T00:00:00Z'),
      summary: 'Planned multi shot sequence',
      metadata: {
        configuration: { totalShots: 3 }
      },
      lineage: []
    },
    {
      id: 'image-1',
      seedId: 'seed-image-1',
      type: 'master_image',
      name: 'Master Visual',
      content: 'Visual description',
      tags: ['visual'],
      createdAt: new Date('2024-01-03T00:00:00Z'),
      summary: 'Primary visual tone',
      isMaster: true,
      lineage: [],
      metadata: {}
    }
  ];

  const baseProject: Project = {
    id: 'project-1',
    name: 'Modal Project',
    assets: baseAssets,
    primaryTimeline: {
      blocks: [],
      folders: {
        story: [],
        image: [],
        text_to_video: []
      }
    },
    secondaryTimeline: {
      masterAssets: [baseAssets[0]],
      shotLists: [],
      appliedStyles: {}
    },
    thirdTimeline: {
      styledShots: [],
      videoPrompts: [],
      batchStyleAssets: []
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-04T00:00:00Z')
  };

  const defaultHandlers = {
    setProject: vi.fn(),
    setSelectedAssetId: vi.fn(),
    setToastState: vi.fn(),
    handleAddAsset: vi.fn(),
    handleAssetDrop: vi.fn(),
    handleRequestDeleteAsset: vi.fn(),
    handleConfirmDelete: vi.fn(),
    handleCancelDelete: vi.fn(),
    handleUndoDelete: vi.fn(),
    handleUpdateAsset: vi.fn(),
    setSelectedStoryAssets: vi.fn(),
    setSelectedMultiShots: vi.fn(),
    setSelectedMasterImage: vi.fn(),
    setActiveTimeline: vi.fn(),
    onTagWeightChange: vi.fn(),
    onStyleRigidityChange: vi.fn(),
    onWeightingToggle: vi.fn(),
    onGenerate: vi.fn(),
    onGenerateOutput: vi.fn()
  } as const;

  const renderWorkspace = (overrides: Partial<React.ComponentProps<typeof Workspace>> = {}) => {
    const props: React.ComponentProps<typeof Workspace> = {
      appLabel: 'Loop',
      project: baseProject,
      setProject: defaultHandlers.setProject,
      selectedAssetId: null,
      setSelectedAssetId: defaultHandlers.setSelectedAssetId,
      pendingDeleteAsset: null,
      toastState: null,
      setToastState: defaultHandlers.setToastState,
      handleAddAsset: defaultHandlers.handleAddAsset,
      handleAssetDrop: defaultHandlers.handleAssetDrop,
      handleRequestDeleteAsset: defaultHandlers.handleRequestDeleteAsset,
      handleConfirmDelete: defaultHandlers.handleConfirmDelete,
      handleCancelDelete: defaultHandlers.handleCancelDelete,
      handleUndoDelete: defaultHandlers.handleUndoDelete,
      handleUpdateAsset: defaultHandlers.handleUpdateAsset,
      selectedStoryAssets: [],
      setSelectedStoryAssets: defaultHandlers.setSelectedStoryAssets,
      selectedMultiShots: [],
      setSelectedMultiShots: defaultHandlers.setSelectedMultiShots,
      selectedMasterImage: null,
      setSelectedMasterImage: defaultHandlers.setSelectedMasterImage,
      tagWeights: {},
      styleRigidity: 50,
      isWeightingEnabled: false,
      onTagWeightChange: defaultHandlers.onTagWeightChange,
      onStyleRigidityChange: defaultHandlers.onStyleRigidityChange,
      onWeightingToggle: defaultHandlers.onWeightingToggle,
      activeTimeline: 'secondary',
      setActiveTimeline: defaultHandlers.setActiveTimeline,
      isGenerating: false,
      onGenerate: defaultHandlers.onGenerate,
      onGenerateOutput: defaultHandlers.onGenerateOutput,
      ...overrides
    };

    return render(<Workspace {...props} />);
  };

  it('opens the multi-shot modal when requested from the timeline', async () => {
    const user = userEvent.setup();
    renderWorkspace({ activeTimeline: 'secondary' });

    await user.click(screen.getByRole('button', { name: /create multi-shot/i }));

    expect(await screen.findByRole('dialog', { name: /create multi-shot asset/i })).toBeInTheDocument();
  });

  it('opens the batch style modal from the batch style timeline', async () => {
    const user = userEvent.setup();
    renderWorkspace({ activeTimeline: 'third' });

    await user.click(screen.getByRole('button', { name: /create batch style/i }));

    expect(await screen.findByRole('dialog', { name: /create batch style application/i })).toBeInTheDocument();
  });
});
