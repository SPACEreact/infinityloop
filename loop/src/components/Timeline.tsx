import React from 'react';
import type { Project, TimelineBlock } from '../types';
import { ASSET_TEMPLATES } from '../constants';
import { MagicWandIcon, PlusIcon, SparklesIcon } from './IconComponents';

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
  onCreateShots,
  isWeightingEnabled,
  onWeightingToggle,
  styleRigidity,
  onStyleRigidityChange,
  selectedAssetIdForShots,
  setSelectedAssetIdForShots,
  isCreateShotsModalOpen,
  setIsCreateShotsModalOpen,
  setIsMultiShotModalOpen,
  setIsBatchStyleModalOpen,
  setIsOutputModalOpen
}: {
  project: Project;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  onAssetDrop: (assetId: string, timelineId: string) => void;
  onGenerateOutput: (folder: string) => void;
  onGenerate: () => void;
  activeTimeline: 'primary' | 'secondary' | 'third' | 'fourth';
  setActiveTimeline: (timeline: 'primary' | 'secondary' | 'third' | 'fourth') => void;
  onCreateShots: (assetId: string) => void;
  isWeightingEnabled: boolean;
  onWeightingToggle: (enabled: boolean) => void;
  styleRigidity: number;
  onStyleRigidityChange: (value: number) => void;
  selectedAssetIdForShots: string | null;
  setSelectedAssetIdForShots: (id: string | null) => void;
  isCreateShotsModalOpen: boolean;
  setIsCreateShotsModalOpen: (open: boolean) => void;
  setIsMultiShotModalOpen: (open: boolean) => void;
  setIsBatchStyleModalOpen: (open: boolean) => void;
  setIsOutputModalOpen: (open: boolean) => void;
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

            {/* Sleek Output Button - Positioned elegantly */}
            <div className="relative group/output">
              <button
                onClick={() => setIsOutputModalOpen(true)}
                className="timeline-action px-4 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-lg transform hover:scale-110 transition-all duration-300 group"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '12px'
                }}
                title="View Final Outputs"
              >
                <SparklesIcon className="w-4 h-4 group-hover:animate-pulse" />
                Output
              </button>
              
              {/* Hover popup for Output */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/output:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="bg-gradient-to-br from-indigo-900/95 to-purple-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 shadow-xl border border-white/20 whitespace-nowrap">
                  <div className="font-medium mb-1">✨ Final Outputs</div>
                  <div className="text-gray-200">View and manage all generated content</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-indigo-900/95 rotate-45 border-r border-b border-white/20"></div>
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
              <label htmlFor="weighting-enabled-timeline" className="text-xs font-medium ink-strong whitespace-nowrap">Tag</label>
              <button
                role="switch"
                aria-checked={isWeightingEnabled}
                onClick={() => onWeightingToggle(!isWeightingEnabled)}
                className={`relative inline-flex h-4 w-7 items-center rounded-full toggle-track ${isWeightingEnabled ? 'switch-on' : ''}`}
                id="weighting-enabled-timeline"
              >
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full toggle-thumb ${isWeightingEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              
              <div className={`flex items-center gap-2 flex-1 ${isWeightingEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label htmlFor="style-rigidity-timeline" className="text-xs ink-strong whitespace-nowrap">Style</label>
                <input
                  id="style-rigidity-timeline"
                  type="range"
                  min="0"
                  max="100"
                  value={styleRigidity}
                  onChange={(e) => onStyleRigidityChange(parseInt(e.target.value, 10))}
                  className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${styleRigidity}%, rgba(255,255,255,0.3) ${styleRigidity}%, rgba(255,255,255,0.3) 100%)`
                  }}
                  disabled={!isWeightingEnabled}
                />
                <span className="text-xs ink-subtle min-w-[2rem] text-center">{styleRigidity}%</span>
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

  const renderSecondaryTimeline = () => (
    <div className="space-y-8" style={{ background: 'rgba(230, 230, 250, 0.05)' }}>
      {/* Multi-shot Actions */}
      <div className="flex justify-center mb-6">
        <div className="group inline-flex items-center gap-2">
          <button
            onClick={() => setIsMultiShotModalOpen(true)}
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

{project.secondaryTimeline ? (
  <div className="space-y-5">
    {project.secondaryTimeline.masterAssets.map((asset, index) => (
      <div
        key={asset.id}
        className="p-5 timeline-card cursor-pointer"
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
        <div className="flex justify-end mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAssetIdForShots(asset.id);
              setIsCreateShotsModalOpen(true);
            }}
            className="timeline-action px-3 py-1.5 text-sm shadow-lg transform hover:scale-105 transition-all duration-200"
            style={{ 
              background: 'linear-gradient(145deg, #98FB98, #7AE67A)',
              boxShadow: '0 4px 8px rgba(152, 251, 152, 0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '2px solid #7AE67A',
              color: '#2E8B57' 
            }}
          >
            Create Shots
          </button>
        </div>
      </div>
    ))}
  </div>
) : (
  <p className="ink-subtle">No multi-shots yet. Generate from primary timeline first.</p>
)}
    </div>
  );

  const renderThirdTimeline = () => (
    <div className="space-y-8" style={{ background: 'rgba(152, 251, 152, 0.05)' }}>
      {/* Batch Style Actions */}
      <div className="flex justify-center mb-6">
        <div className="group inline-flex items-center gap-2">
          <button
            onClick={() => setIsBatchStyleModalOpen(true)}
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

      {project.thirdTimeline ? (
        <div className="space-y-5">
          {project.thirdTimeline.styledShots.map((shot, index) => (
            <div key={shot.id} className="p-5 timeline-card">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index secondary">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold ink-strong">{shot.name}</h3>
                  <p className="text-sm ink-subtle">{shot.type.replace('_', ' ')}</p>
                </div>
              </div>
              {shot.summary && (
                <p className="text-sm ink-subtle mt-3">{shot.summary}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="ink-subtle">No styled shots yet. Generate from secondary timeline first.</p>
      )}
    </div>
  );

  const renderFourthTimeline = () => (
    <div className="space-y-8" style={{ background: 'rgba(255, 218, 185, 0.05)' }}>

      {project.fourthTimeline ? (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold ink-strong">Suggestions</h3>
          {project.fourthTimeline.suggestions.map((suggestion, index) => (
            <div key={suggestion.id} className="p-5 timeline-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold ink-strong">{suggestion.type.toUpperCase()}</h4>
                  <p className="text-sm ink-subtle">{suggestion.description}</p>
                </div>
                <div className={`timeline-chip ${suggestion.accepted ? 'is-affirmative' : ''}`}>
                  {suggestion.accepted ? 'Accepted' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ink-subtle">No director suggestions yet.</p>
      )}
    </div>
  );

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