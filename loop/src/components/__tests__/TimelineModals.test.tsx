import { vi } from 'vitest';

vi.mock('../../services/config', () => ({
  apiConfig: {
    getConfigs: vi.fn(() => []),
    addConfig: vi.fn(),
    updateConfigByName: vi.fn(),
    removeConfigByName: vi.fn(),
  },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project, Asset } from '../../types';
import { useProject } from '../../hooks/useProject';

function MultiShotModalStub({ isOpen, onCancel }: any) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-label="Create Multi-Shot Asset">
      <button type="button" onClick={onCancel}>
        Close Multi-Shot Modal
      </button>
    </div>
  );
}

function BatchStyleModalStub({ isOpen, onCancel }: any) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-label="Create Batch Style Application">
      <button type="button" onClick={onCancel}>
        Close Batch Style Modal
      </button>
    </div>
  );
}

vi.mock('../../components/MultiShotCreationModal', () => ({
  MultiShotCreationModal: MultiShotModalStub,
}));

vi.mock('../../components/BatchStyleModal', () => ({
  BatchStyleModal: BatchStyleModalStub,
}));

import Workspace from '../../components/Workspace';

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
      metadata: {},
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
        configuration: { totalShots: 3 },
      },
      lineage: [],
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
      metadata: {},
    },
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
        text_to_video: [],
      },
    },
    secondaryTimeline: {
      masterAssets: [baseAssets[0]],
      shotLists: [],
      appliedStyles: {},
    },
    thirdTimeline: {
      styledShots: [],
      videoPrompts: [],
      batchStyleAssets: [],
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-04T00:00:00Z'),
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
    onGenerateOutput: vi.fn(),
  } as const;

  const renderWorkspace = (
    overrides: Partial<React.ComponentProps<typeof Workspace>> = {},
  ) => {
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
      ...overrides,
    };

    return render(<Workspace {...props} />);
  };

  it('opens the multi-shot modal when requested from the timeline', async () => {
    const user = userEvent.setup();
    renderWorkspace({ activeTimeline: 'secondary' });

    await user.click(
      screen.getByRole('button', { name: /create multi-shot/i }),
    );

    expect(
      await screen.findByRole('dialog', { name: /create multi-shot asset/i }),
    ).toBeInTheDocument();
  });

  it('opens the batch style modal from the batch style timeline', async () => {
    const user = userEvent.setup();
    renderWorkspace({ activeTimeline: 'third' });

    await user.click(
      screen.getByRole('button', { name: /create batch style/i }),
    );

    expect(
      await screen.findByRole('dialog', {
        name: /create batch style application/i,
      }),
    ).toBeInTheDocument();
  });

  it('normalizes missing seed IDs before rendering timeline modals', async () => {
    const user = userEvent.setup();

    const masterStoryWithoutSeed: Asset = { ...baseAssets[0], seedId: '' };
    const multiShotWithoutSeed: Asset = { ...baseAssets[1], seedId: '' };
    const masterImageWithoutSeed: Asset = { ...baseAssets[2], seedId: '' };

    const projectWithMissingSeeds: Project = {
      ...baseProject,
      assets: [
        masterStoryWithoutSeed,
        multiShotWithoutSeed,
        masterImageWithoutSeed,
      ],
      secondaryTimeline: {
        masterAssets: [masterImageWithoutSeed],
        shotLists: [
          {
            id: 'shotlist-1',
            masterAssetId: masterStoryWithoutSeed.id,
            shots: [multiShotWithoutSeed],
            createdAt: new Date('2024-01-05T00:00:00Z'),
          },
        ],
        appliedStyles: {},
      },
      thirdTimeline: {
        styledShots: [multiShotWithoutSeed],
        videoPrompts: [],
        batchStyleAssets: [masterImageWithoutSeed],
      },
    };

    const Harness: React.FC = () => {
      const {
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
      } = useProject(projectWithMissingSeeds);

      const [tagWeights, setTagWeights] = React.useState<
        Record<string, number>
      >({});
      const [styleRigidity, setStyleRigidity] = React.useState<number>(50);
      const [isWeightingEnabled, setIsWeightingEnabled] =
        React.useState<boolean>(false);

      return (
        <Workspace
          appLabel="Loop"
          project={project}
          setProject={setProject}
          selectedAssetId={selectedAssetId}
          setSelectedAssetId={setSelectedAssetId}
          pendingDeleteAsset={pendingDeleteAsset}
          toastState={toastState}
          setToastState={setToastState}
          handleAddAsset={handleAddAsset}
          handleAssetDrop={handleAssetDrop}
          handleRequestDeleteAsset={handleRequestDeleteAsset}
          handleConfirmDelete={handleConfirmDelete}
          handleCancelDelete={handleCancelDelete}
          handleUndoDelete={handleUndoDelete}
          handleUpdateAsset={handleUpdateAsset}
          selectedStoryAssets={selectedStoryAssets}
          setSelectedStoryAssets={setSelectedStoryAssets}
          selectedMultiShots={selectedMultiShots}
          setSelectedMultiShots={setSelectedMultiShots}
          selectedMasterImage={selectedMasterImage}
          setSelectedMasterImage={setSelectedMasterImage}
          tagWeights={tagWeights}
          styleRigidity={styleRigidity}
          isWeightingEnabled={isWeightingEnabled}
          onTagWeightChange={(tagId, weight) =>
            setTagWeights((prev) => ({ ...prev, [tagId]: weight }))
          }
          onStyleRigidityChange={setStyleRigidity}
          onWeightingToggle={setIsWeightingEnabled}
          activeTimeline={activeTimeline}
          setActiveTimeline={setActiveTimeline}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onGenerateOutput={handleGenerateOutput}
        />
      );
    };

    render(<Harness />);

    await user.click(
      await screen.findByRole('button', { name: /multi-shot/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /create multi-shot/i }),
    );
    expect(
      await screen.findByRole('dialog', { name: /create multi-shot asset/i }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', { name: /close multi-shot modal/i }),
    );

    await user.click(
      await screen.findByRole('button', { name: /batch style/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /create batch style/i }),
    );
    expect(
      await screen.findByRole('dialog', {
        name: /create batch style application/i,
      }),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: /close batch style modal/i }),
    );
  });

  it('maintains canonical seed IDs across all timelines for shared assets', async () => {
    const sharedAssetBase: Asset = {
      id: 'shared-asset',
      seedId: '',
      type: 'master_image',
      name: 'Shared Asset',
      content: 'Shared content',
      tags: ['shared'],
      createdAt: new Date('2024-02-01T00:00:00Z'),
      summary: 'A shared asset',
      isMaster: true,
      lineage: [],
      metadata: {},
    };

    const projectWithSharedAssets: Project = {
      ...baseProject,
      assets: [{ ...sharedAssetBase }, { ...baseAssets[1] }],
      secondaryTimeline: {
        masterAssets: [{ ...sharedAssetBase, seedId: '' }],
        shotLists: [
          {
            id: 'shotlist-canonical',
            masterAssetId: sharedAssetBase.id,
            shots: [{ ...sharedAssetBase, seedId: '' }],
            createdAt: new Date('2024-02-10T00:00:00Z'),
          },
        ],
        appliedStyles: {},
      },
      thirdTimeline: {
        styledShots: [{ ...sharedAssetBase, seedId: 'styled-seed' }],
        videoPrompts: [],
        batchStyleAssets: [{ ...sharedAssetBase, seedId: '' }],
      },
    };

    const onProjectNormalized = vi.fn();

    const CaptureProject: React.FC<{ initialProject: Project }> = ({
      initialProject,
    }) => {
      const { project } = useProject(initialProject);

      React.useEffect(() => {
        onProjectNormalized(project);
      }, [onProjectNormalized, project]);

      return null;
    };

    render(<CaptureProject initialProject={projectWithSharedAssets} />);

    await waitFor(() => {
      expect(onProjectNormalized).toHaveBeenCalled();
    });

    const normalizedProject = onProjectNormalized.mock.calls.at(
      -1,
    )![0] as Project;
    const canonicalSeed = normalizedProject.assets.find(
      (asset) => asset.id === sharedAssetBase.id,
    )?.seedId;

    expect(canonicalSeed).toBe('styled-seed');
    expect(normalizedProject.secondaryTimeline?.masterAssets[0]?.seedId).toBe(
      canonicalSeed,
    );
    expect(
      normalizedProject.secondaryTimeline?.shotLists[0]?.shots[0]?.seedId,
    ).toBe(canonicalSeed);
    expect(normalizedProject.thirdTimeline?.styledShots[0]?.seedId).toBe(
      canonicalSeed,
    );
    expect(normalizedProject.thirdTimeline?.batchStyleAssets?.[0]?.seedId).toBe(
      canonicalSeed,
    );
  });

  it('maintains canonical seed IDs across all timelines for shared assets', async () => {
    const sharedAssetBase: Asset = {
      id: 'shared-asset',
      seedId: '',
      type: 'master_image',
      name: 'Shared Asset',
      content: 'Shared content',
      tags: ['shared'],
      createdAt: new Date('2024-02-01T00:00:00Z'),
      summary: 'A shared asset',
      isMaster: true,
      lineage: [],
      metadata: {}
    };

    const projectWithSharedAssets: Project = {
      ...baseProject,
      assets: [
        { ...sharedAssetBase },
        { ...baseAssets[1] }
      ],
      secondaryTimeline: {
        masterAssets: [
          { ...sharedAssetBase, seedId: 'secondary-seed' }
        ],
        shotLists: [
          {
            id: 'shotlist-canonical',
            masterAssetId: sharedAssetBase.id,
            shots: [
              { ...sharedAssetBase, seedId: 'shot-seed' }
            ],
            createdAt: new Date('2024-02-10T00:00:00Z')
          }
        ],
        appliedStyles: {}
      },
      thirdTimeline: {
        styledShots: [
          { ...sharedAssetBase, seedId: '' }
        ],
        videoPrompts: [],
        batchStyleAssets: [
          { ...sharedAssetBase, seedId: 'batch-seed' }
        ]
      }
    };

    const onProjectNormalized = vi.fn();

    const CaptureProject: React.FC<{ initialProject: Project }> = ({ initialProject }) => {
      const { project } = useProject(initialProject);

      React.useEffect(() => {
        onProjectNormalized(project);
      }, [onProjectNormalized, project]);

      return null;
    };

    render(<CaptureProject initialProject={projectWithSharedAssets} />);

    await waitFor(() => {
      expect(onProjectNormalized).toHaveBeenCalled();
    });

    const normalizedProject = onProjectNormalized.mock.calls.at(-1)![0] as Project;
    const canonicalSeed = normalizedProject.assets.find(asset => asset.id === sharedAssetBase.id)?.seedId;

    expect(canonicalSeed).toBeTruthy();
    expect(normalizedProject.secondaryTimeline?.masterAssets[0]?.seedId).toBe(canonicalSeed);
    expect(normalizedProject.secondaryTimeline?.shotLists[0]?.shots[0]?.seedId).toBe(canonicalSeed);
    expect(normalizedProject.thirdTimeline?.styledShots[0]?.seedId).toBe(canonicalSeed);
    expect(normalizedProject.thirdTimeline?.batchStyleAssets?.[0]?.seedId).toBe(canonicalSeed);
  });
});
