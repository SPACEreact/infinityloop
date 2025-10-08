import React from 'react';
import type { Asset, Project, TimelineBlock } from '../types';
import { ASSET_TEMPLATES } from '../constants';
import { MagicWandIcon, PlusIcon, QuestionMarkCircleIcon, SparklesIcon } from './IconComponents';

// @ts-ignore
export const Timeline = ({
  project,
  selectedAssetId,
  setSelectedAssetId,
  onAssetDrop,
  onGenerateOutput,
  onGenerate,
  activeTimeline,
  setActiveTimeline,
  isWeightingEnabled,
  onWeightingToggle,
  styleRigidity,
  onStyleRigidityChange,
  setIsOutputModalOpen,
  onOpenMultiShotModal,
  onOpenBatchStyleModal
}: {
  project: Project;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  onAssetDrop: (assetId: string, timelineId: string) => void;
  onGenerateOutput: (folder: string) => void;
  onGenerate: () => void;
  activeTimeline: 'primary' | 'secondary' | 'third' | 'fourth';
  setActiveTimeline: (timeline: 'primary' | 'secondary' | 'third' | 'fourth') => void;
  isWeightingEnabled: boolean;
  onWeightingToggle: (enabled: boolean) => void;
  styleRigidity: number;
  onStyleRigidityChange: (value: number) => void;
  setIsOutputModalOpen: (open: boolean) => void;
  onOpenMultiShotModal: () => void;
  onOpenBatchStyleModal: () => void;
  onGenerateDirectorAdvice?: () => void;
  onAcceptSuggestion?: (suggestionId: string) => void;
}) => {

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, folder?: string) => {
    e.preventDefault();
    const templateType = e.dataTransfer.getData('text/plain');
    if (templateType) {
      onAssetDrop(templateType, folder || 'combined');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const shotsByMultiShotId = React.useMemo(() => {
    return project.assets.reduce((acc, asset) => {
      const parentId = asset.metadata?.parentMultiShotId;
      if (parentId) {
        if (!acc[parentId]) {
          acc[parentId] = [];
        }
        acc[parentId].push(asset);
      }
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [project.assets]);

const renderAssetBlock = (block: TimelineBlock, index: number, assetTypeCounts?: Record<string, number>) => {
    const asset = project.assets.find(a => a.id === block.assetId);
    if (!asset) return null;

    const template = ASSET_TEMPLATES[asset.type];
    const hoverClass = template?.category === 'story' ? '!hover:bg-[rgba(255,250,205,0.8)]' : template?.category === 'visual' ? '!hover:bg-[rgba(224,240,255,0.8)]' : '';
    const count = assetTypeCounts ? assetTypeCounts[asset.type] : 0;
    const hasMultipleSameType = count > 1;

    // Determine main dot color based on category
    const mainDotColor = template?.category === 'story' ? 'bg-yellow-400' : template?.category === 'visual' ? 'bg-blue-400' : 'bg-purple-400';

    // Limit max orbiting dots to 8 for visual clarity
    const maxOrbitDots = 8;
    const orbitDotsCount = Math.min(count - 1, maxOrbitDots);

    // Calculate positions for orbiting dots in a circle
    const orbitDots = [];
    const radius = 10; // radius in px for orbit circle
    for (let i = 0; i < orbitDotsCount; i++) {
      const angle = (2 * Math.PI / orbitDotsCount) * i;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      orbitDots.push({ x, y });
    }

    return (
      <div
        key={block.id}
        className={`p-5 cursor-pointer timeline-card group ${
          selectedAssetId === asset.id ? 'timeline-card--active' : ''
        } ${hoverClass}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setSelectedAssetId(asset.id);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index relative">
              {/* Main dot */}
              <div className={`w-4 h-4 rounded-full ${mainDotColor} opacity-0 group-hover:opacity-100`}></div>
              {/* Orbiting dots */}
              {hasMultipleSameType && orbitDots.map((pos, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full bg-pink-300 absolute opacity-0 group-hover:opacity-100"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginTop: pos.y - 8,
                    marginLeft: pos.x - 8,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold ink-strong text-base">{asset.name}</h3>
              <p className="text-sm ink-subtle capitalize">{asset.type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        {asset.summary && (
          <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
        )}
      </div>
    );
  };

  const renderPrimaryTimeline = () => {
    // Combine all blocks from story and image folders, sorted by category (story first, then visual)
    const allBlocks = [
      ...project.primaryTimeline.folders.story.map(block => ({ ...block, category: 'story' as const })),
      ...project.primaryTimeline.folders.image.map(block => ({ ...block, category: 'visual' as const }))
    ].sort((a, b) => {
      // Sort by category first (story before visual), then by position
      if (a.category !== b.category) {
        return a.category === 'story' ? -1 : 1;
      }
      return a.position - b.position;
    });

    // Count assets by type to determine if we need notification dots
    const assetTypeCounts = allBlocks.reduce((acc, block) => {
      const asset = project.assets.find(a => a.id === block.assetId);
      if (asset) {
        acc[asset.type] = (acc[asset.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-8" style={{ background: 'rgba(255, 182, 193, 0.05)' }}>
        <div className="flex justify-center md:justify-center relative">
          <div className="group inline-flex items-center gap-4">
            {/* Left dropdown for Story */}
            <div className="relative group/story">
              <button
                className="timeline-action px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{ backgroundColor: '#FFFACD', color: '#8B7355', border: '3px solid #F0E68C' }}
                onClick={() => onGenerateOutput('story')}
              >
                Generate Story
              </button>
              
              {/* Hover popup for Story */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/story:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 shadow-xl border border-white/10 whitespace-nowrap">
                  <div className="font-medium mb-1">Story Generation</div>
                  <div className="text-gray-300">Creates master story assets from your inputs</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45 border-r border-b border-white/10"></div>
                </div>
              </div>
            </div>

            {/* Center button - 3D effect with enhanced hover */}
            <div className="relative group/generate">
              <button
                className="timeline-action px-6 py-3 text-base font-bold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{
                  background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.9)',
                  border: '3px solid #bbb',
                  filter: 'drop-shadow(4px 4px 0 rgba(0,0,0,0.4)) contrast(1.2)'
                }}
                onClick={onGenerate}
              >
                <MagicWandIcon className="w-6 h-6" />
                GENERATE ALL
              </button>
              
              {/* Enhanced hover popup for Generate All */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/generate:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-4 shadow-2xl border border-white/20 min-w-48">
                  <div className="font-bold mb-2 text-sm">🎬 Master Generation</div>
                  <div className="space-y-1 text-gray-200">
                    <div>• Processes all timeline assets</div>
                    <div>• Creates master story & visual</div>
                    <div>• Applies AI-powered enhancement</div>
                    <div>• Optimizes for next workflow steps</div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-900/95 rotate-45 border-r border-b border-white/20"></div>
                </div>
              </div>
            </div>

            {/* Right dropdown for Image */}
            <div className="relative group/visual">
              <button
                className="timeline-action px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{ backgroundColor: '#E0F6FF', color: '#4682B4', border: '3px solid #B0E0E6' }}
                onClick={() => onGenerateOutput('image')}
              >
                Generate Visual
              </button>
              
              {/* Hover popup for Visual */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/visual:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 shadow-xl border border-white/10 whitespace-nowrap">
                  <div className="font-medium mb-1">Visual Generation</div>
                  <div className="text-gray-300">Creates master visual style assets</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45 border-r border-b border-white/10"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Style Controls - Compact and Thin */}
        <div className="flex justify-center">
          <div className="p-2 max-w-lg w-full bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
            <div className="flex items-center gap-2 px-2">
              <div className="flex items-center gap-1">
                <label
                  htmlFor="weighting-enabled-timeline"
                  className="text-xs font-medium ink-strong whitespace-nowrap"
                >
                  Style Weighting
                </label>
                <QuestionMarkCircleIcon
                  className="w-3.5 h-3.5 opacity-70"
                  title="Style weighting balances AI creativity with adherence to your selected references."
                />
              </div>
              <button
                role="switch"
                aria-checked={isWeightingEnabled}
                onClick={() => onWeightingToggle(!isWeightingEnabled)}
                className={`relative inline-flex h-4 w-7 items-center rounded-full toggle-track ${isWeightingEnabled ? 'switch-on' : ''}`}
                id="weighting-enabled-timeline"
              >
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full toggle-thumb ${isWeightingEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              
              <div className={`flex items-start gap-3 flex-1 ${isWeightingEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <label htmlFor="style-rigidity-timeline" className="text-xs ink-strong whitespace-nowrap">
                      Style Rigidity
                    </label>
                  </div>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                        id="style-rigidity-timeline"
                        type="range"
                        min="0"
                        max="100"
                        value={styleRigidity}
                        onChange={(e) => onStyleRigidityChange(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${styleRigidity}%, rgba(255,255,255,0.3) ${styleRigidity}%, rgba(255,255,255,0.3) 100%)`
                        }}
                        disabled={!isWeightingEnabled}
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="w-px h-3 bg-white/70 rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase ink-subtle tracking-wide mt-1">
                      <span>Creativity</span>
                      <span>Adherence</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs ink-subtle min-w-[2.5rem] text-right">{styleRigidity}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Single Drop Zone */}
        <div className="space-y-3">
          <div
            className="min-h-32 p-6 timeline-placeholder"
            onDrop={(e) => handleDrop(e)}
            onDragOver={handleDragOver}
          >
            {allBlocks.length > 0 ? (
              <div className="space-y-3">
                {allBlocks.map((block, index) => renderAssetBlock(block, index, assetTypeCounts))}
              </div>
            ) : (
              <p className="ink-subtle text-center py-8">start building - drag and drop blocks</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSecondaryTimeline = () => {
    const masterStoryAssets = project.secondaryTimeline?.masterAssets || [];
    const multiShotAssets = project.assets.filter(asset => asset.type === 'multi_shot');

    return (
      <div className="space-y-8" style={{ background: 'rgba(230, 230, 250, 0.05)' }}>
        {/* Multi-shot Actions */}
        <div className="flex justify-center mb-6">
          <div className="group inline-flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMultiShotModal}
              className="timeline-action px-6 py-3 text-base font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
              style={{
                background: 'linear-gradient(145deg, #E6E6FA, #D1D1F0)',
                boxShadow: '0 10px 20px rgba(230, 230, 250, 0.3), inset 0 2px 0 rgba(255,255,255,0.9)',
                border: '3px solid #D1D1F0',
                color: '#4B0082',
                filter: 'drop-shadow(4px 4px 0 rgba(75, 0, 130, 0.3)) contrast(1.2)'
              }}
            >
              <PlusIcon className="w-6 h-6" />
              CREATE MULTI-SHOT
            </button>
          </div>
        </div>

        <div className="space-y-10 px-1">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] ink-subtle mb-3">Master Story Assets</h3>
            {masterStoryAssets.length > 0 ? (
              <div className="space-y-5">
                {masterStoryAssets.map((asset, index) => (
                  <div
                    key={asset.id}
                    className={`p-5 timeline-card cursor-pointer ${selectedAssetId === asset.id ? 'timeline-card--active' : ''}`}
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index secondary">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold ink-strong">{asset.name}</h3>
                        <p className="text-sm ink-subtle">{asset.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {asset.summary && (
                      <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ink-subtle">
                Generate master story assets from the Scene timeline to unlock multi-shot planning.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] ink-subtle mb-3">Multi-Shot Plans</h3>
            {multiShotAssets.length > 0 ? (
              <div className="space-y-5">
                {multiShotAssets.map(asset => {
                  const relatedShots = shotsByMultiShotId[asset.id] || [];
                  const parentMaster = asset.metadata?.parentMasterAssetId
                    ? project.assets.find(a => a.id === asset.metadata?.parentMasterAssetId)
                    : undefined;
                  const totalShots = relatedShots.length || asset.shotCount || 0;

                  return (
                    <div
                      key={asset.id}
                      className={`p-5 timeline-card cursor-pointer ${selectedAssetId === asset.id ? 'timeline-card--active' : ''}`}
                      onClick={() => setSelectedAssetId(asset.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold ink-strong">{asset.name}</h3>
                          <p className="text-xs uppercase tracking-wide ink-subtle mt-1">
                            {parentMaster ? `Derived from ${parentMaster.name}` : 'Derived from master story'}
                          </p>
                        </div>
                        <div className="w-10 h-10 flex items-center justify-center font-bold timeline-index secondary">
                          {totalShots}
                        </div>
                      </div>
                      {asset.summary && (
                        <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
                      )}
                      <div className="mt-3 text-xs ink-subtle flex flex-wrap gap-4">
                        <span>Shot type: {asset.shotType ? asset.shotType.replace('_', ' ') : 'mixed'}</span>
                        <span>Total shots: {totalShots}</span>
                      </div>
                      {relatedShots.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {relatedShots.slice(0, 4).map(shot => (
                            <span key={shot.id} className="timeline-chip text-xs">{shot.name}</span>
                          ))}
                          {relatedShots.length > 4 && (
                            <span className="timeline-chip text-xs">+{relatedShots.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ink-subtle">
                Use master story assets to create multi-shot plans that feed the Batch Style timeline.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderThirdTimeline = () => {
    const masterVisualAssets = project.assets.filter(asset => asset.type === 'master_image' && asset.isMaster);
    const styledShots = project.thirdTimeline?.styledShots || [];
    const batchStyleAssets = (project.thirdTimeline?.batchStyleAssets || []).filter(asset => asset.type === 'batch_style');

    return (
      <div className="space-y-8" style={{ background: 'rgba(152, 251, 152, 0.05)' }}>
        {/* Batch Style Actions */}
        <div className="flex justify-center mb-6">
          <div className="group inline-flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBatchStyleModal}
              className="timeline-action px-6 py-3 text-base font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
              style={{
                background: 'linear-gradient(145deg, #98FB98, #7AE67A)',
                boxShadow: '0 10px 20px rgba(152, 251, 152, 0.3), inset 0 2px 0 rgba(255,255,255,0.9)',
                border: '3px solid #7AE67A',
                color: '#2E8B57',
                filter: 'drop-shadow(4px 4px 0 rgba(46, 139, 87, 0.3)) contrast(1.2)'
              }}
            >
              <PlusIcon className="w-6 h-6" />
              CREATE BATCH STYLE
            </button>
          </div>
        </div>

        <div className="space-y-10 px-1">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] ink-subtle mb-3">Master Visual Styles</h3>
            {masterVisualAssets.length > 0 ? (
              <div className="space-y-5">
                {masterVisualAssets.map((asset, index) => (
                  <div
                    key={asset.id}
                    className={`p-5 timeline-card cursor-pointer ${selectedAssetId === asset.id ? 'timeline-card--active' : ''}`}
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index secondary">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold ink-strong">{asset.name}</h3>
                        <p className="text-sm ink-subtle">{asset.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {asset.summary && (
                      <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ink-subtle">
                Generate a master visual style from the Scene timeline to guide batch styling.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] ink-subtle mb-3">Batch Style Runs</h3>
            {batchStyleAssets.length > 0 ? (
              <div className="space-y-5">
                {batchStyleAssets.map(asset => {
                  const styledShotIds: string[] = asset.metadata?.styledShotIds || [];
                  const styledCount = styledShotIds.length;
                  const sourceMultiShot = asset.metadata?.multiShotId
                    ? project.assets.find(a => a.id === asset.metadata?.multiShotId)
                    : undefined;
                  const masterVisual = asset.metadata?.masterImageId
                    ? project.assets.find(a => a.id === asset.metadata?.masterImageId)
                    : undefined;

                  return (
                    <div
                      key={asset.id}
                      className={`p-5 timeline-card cursor-pointer ${selectedAssetId === asset.id ? 'timeline-card--active' : ''}`}
                      onClick={() => setSelectedAssetId(asset.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold ink-strong">{asset.name}</h3>
                          <p className="text-xs uppercase tracking-wide ink-subtle mt-1">
                            {sourceMultiShot ? `Styled from ${sourceMultiShot.name}` : 'Styled batch'}
                          </p>
                        </div>
                        <div className="w-10 h-10 flex items-center justify-center font-bold timeline-index secondary">
                          {styledCount}
                        </div>
                      </div>
                      {asset.summary && (
                        <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
                      )}
                      <div className="mt-3 text-xs ink-subtle flex flex-wrap gap-4">
                        {masterVisual && <span>Style: {masterVisual.name}</span>}
                        <span>Shots styled: {styledCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ink-subtle">
                Apply batch styling to multi-shot plans to see styled batches appear here.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] ink-subtle mb-3">Styled Shots</h3>
            {styledShots.length > 0 ? (
              <div className="space-y-5">
                {styledShots.map((shot, index) => {
                  const sourceMultiShot = shot.metadata?.parentMultiShotId
                    ? project.assets.find(a => a.id === shot.metadata?.parentMultiShotId)
                    : undefined;
                  const styleName = shot.metadata?.styleName
                    || (shot.metadata?.masterImageId
                      ? project.assets.find(a => a.id === shot.metadata?.masterImageId)?.name
                      : undefined);

                  return (
                    <div
                      key={shot.id}
                      className={`p-5 timeline-card cursor-pointer ${selectedAssetId === shot.id ? 'timeline-card--active' : ''}`}
                      onClick={() => setSelectedAssetId(shot.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index secondary">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold ink-strong">{shot.name}</h3>
                          <p className="text-xs uppercase tracking-wide ink-subtle mt-1">
                            {styleName ? `Style: ${styleName}` : 'Styled shot'}
                          </p>
                        </div>
                      </div>
                      {shot.summary && (
                        <p className="text-sm ink-subtle mt-3">{shot.summary}</p>
                      )}
                      {sourceMultiShot && (
                        <p className="text-xs ink-subtle mt-2">From {sourceMultiShot.name}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ink-subtle">No styled shots yet. Apply batch styling to generate styled outputs.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFourthTimeline = () => {

    const generateDirectorAdvice = async () => {
      // This would trigger the parent component to generate director advice
      if (onGenerateDirectorAdvice) {
        onGenerateDirectorAdvice();
      }
    };

    const acceptSuggestion = (suggestionId: string) => {
      // This would update the suggestion status in the parent component
      if (onAcceptSuggestion) {
        onAcceptSuggestion(suggestionId);
      }
    };

    return (
      <div className="space-y-8" style={{ background: 'rgba(255, 218, 185, 0.05)' }}>
      {/* Director's Advice Actions */}
      <div className="flex justify-center mb-6">
        <div className="group inline-flex items-center gap-2">
          <button
            onClick={() => generateDirectorAdvice()}
            className="timeline-action px-6 py-3 text-base font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
            style={{
              background: 'linear-gradient(145deg, #FFDAB9, #FFCBA4)',
              boxShadow: '0 10px 20px rgba(255, 218, 185, 0.3), inset 0 2px 0 rgba(255,255,255,0.9)',
              border: '3px solid #FFCBA4',
              color: '#8B4513',
              filter: 'drop-shadow(4px 4px 0 rgba(139, 69, 19, 0.3)) contrast(1.2)'
            }}
          >
            <SparklesIcon className="w-6 h-6" />
            GENERATE DIRECTOR ADVICE
          </button>
        </div>
      </div>

      {project.fourthTimeline ? (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold ink-strong">Director's Suggestions</h3>
          {project.fourthTimeline.suggestions.map((suggestion, index) => (
            <div key={suggestion.id} className="p-5 timeline-card cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold ink-strong text-orange-300">{suggestion.type.toUpperCase()}</h4>
                  <p className="text-sm ink-subtle mt-2">{suggestion.description}</p>
                  {suggestion.advice && (
                    <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <p className="text-sm text-orange-200">{suggestion.advice}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className={`timeline-chip ${suggestion.accepted ? 'is-affirmative' : ''}`}>
                    {suggestion.accepted ? 'Accepted' : 'Pending'}
                  </div>
                  {!suggestion.accepted && (
                    <button
                      onClick={() => acceptSuggestion(suggestion.id)}
                      className="px-3 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                    >
                      Accept
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold ink-strong mb-2">No Director Suggestions Yet</h3>
          <p className="ink-subtle mb-6">Generate AI-powered director advice based on your project's story, shots, and style.</p>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="h-full w-full">
      <div className="flex w-full flex-col gap-8 px-0">
        {/* Timeline Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={() => setActiveTimeline('primary')}
            className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'primary' ? 'timeline-tab--active' : ''}`}
            style={{
              background: activeTimeline === 'primary' ? 'linear-gradient(135deg, #FFB6C1, #FF8FA3)' : undefined,
              boxShadow: activeTimeline === 'primary' ? '0 4px 8px rgba(255, 182, 193, 0.3)' : undefined
            }}
          >
            Scene
          </button>
          <button
            onClick={() => setActiveTimeline('secondary')}
            className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'secondary' ? 'timeline-tab--active' : ''}`}
            style={{
        background: activeTimeline === 'secondary' ? 'linear-gradient(135deg, #E6E6FA, #D1D1F0)' : undefined,
        boxShadow: activeTimeline === 'secondary' ? '0 4px 8px rgba(230, 230, 250, 0.3)' : undefined
      }}
    >
      Multi-Shot
    </button>
    <button
      onClick={() => setActiveTimeline('third')}
      className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'third' ? 'timeline-tab--active' : ''}`}
      style={{
        background: activeTimeline === 'third' ? 'linear-gradient(135deg, #98FB98, #7AE67A)' : undefined,
        boxShadow: activeTimeline === 'third' ? '0 4px 8px rgba(152, 251, 152, 0.3)' : undefined
      }}
    >
      Batch Style
    </button>
          <button
            onClick={() => setActiveTimeline('fourth')}
            className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'fourth' ? 'timeline-tab--active' : ''}`}
            style={{
              background: activeTimeline === 'fourth' ? 'linear-gradient(135deg, #FFDAB9, #FFCBA4)' : undefined,
              boxShadow: activeTimeline === 'fourth' ? '0 4px 8px rgba(255, 218, 185, 0.3)' : undefined
            }}
          >
            Director’s Advice
          </button>
        </div>

        {/* Timeline Content */}
        {activeTimeline === 'primary' && renderPrimaryTimeline()}
        {activeTimeline === 'secondary' && renderSecondaryTimeline()}
        {activeTimeline === 'third' && renderThirdTimeline()}
        {activeTimeline === 'fourth' && renderFourthTimeline()}
      </div>
    </div>
  );
};