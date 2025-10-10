import React, { useState, useEffect, useMemo } from 'react';
import { Asset, StructuredInputData, ShotDetails, IndividualShot } from '../types';

interface OutputModalProps {
  isOpen: boolean;
  finalAssets: Asset[];
  onClose: () => void;
  onExport?: (format: 'json' | 'txt' | 'csv') => void;
}

const humanizeLabel = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^./, char => char.toUpperCase());

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripHtml = (value: string): string =>
  decodeEntities(
    value
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n')
      .replace(/<\s*li\s*>/gi, '- ')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/\n /g, '\n')
    .trim();

const formatStructuredData = (data?: StructuredInputData): string[] => {
  if (!data) {
    return [];
  }

  const entries: string[] = [];

  const pushLine = (label: string, raw?: string | null) => {
    if (!raw) return;
    const text = stripHtml(raw);
    if (text) {
      entries.push(`${label}: ${text}`);
    }
  };

  pushLine('Scene Description', data.sceneDescription);
  pushLine('Character Focus', data.characterDetails);
  pushLine('Location Details', data.locationDetails);
  pushLine('Mood & Tone', data.moodAndTone);
  pushLine('Visual Style', data.visualStyle);
  pushLine('Narrative Purpose', data.narrativePurpose);
  pushLine('Cinematic References', data.cinematicReferences);
  pushLine('Specific Instructions', data.specificInstructions);

  if (Array.isArray(data.keyMoments) && data.keyMoments.length) {
    const sanitized = data.keyMoments
      .map(moment => stripHtml(moment))
      .filter(Boolean)
      .map((moment, index) => `${index + 1}. ${moment}`);
    if (sanitized.length) {
      entries.push(`Key Moments:\n${sanitized.join('\n')}`);
    }
  }

  return entries;
};

const formatShotDetails = (details?: ShotDetails): string[] => {
  if (!details) {
    return [];
  }

  return Object.entries(details)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      return `${humanizeLabel(key)}: ${stripHtml(String(value))}`;
    })
    .filter((entry): entry is string => Boolean(entry));
};

const formatIndividualShots = (shots?: IndividualShot[]): string[] => {
  if (!shots || !shots.length) {
    return [];
  }

  return shots.map(shot => {
    const lines: string[] = [];
    lines.push(`Shot ${shot.shotNumber}${shot.shotType ? ` — ${humanizeLabel(shot.shotType)}` : ''}`);

    const fieldEntries: Array<[keyof IndividualShot, string]> = [
      ['description', 'Description'],
      ['duration', 'Duration'],
      ['cameraMovement', 'Camera Movement'],
      ['cameraAngle', 'Camera Angle'],
      ['lensType', 'Lens'],
      ['lightingStyle', 'Lighting'],
      ['framing', 'Framing'],
      ['colorGrading', 'Color Grading'],
      ['notes', 'Notes'],
    ];

    fieldEntries.forEach(([key, label]) => {
      const value = shot[key];
      if (value) {
        lines.push(`  • ${label}: ${stripHtml(String(value))}`);
      }
    });

    return lines.join('\n');
  });
};

const formatMetadataEntries = (metadata?: Record<string, unknown>): string[] => {
  if (!metadata) {
    return [];
  }

  return Object.entries(metadata).reduce<string[]>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }

    const label = humanizeLabel(key);

    if (typeof value === 'string') {
      const sanitized = stripHtml(value);
      if (sanitized) {
        acc.push(`${label}: ${sanitized}`);
      }
      return acc;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      acc.push(`${label}: ${value}`);
      return acc;
    }

    if (Array.isArray(value)) {
      const items = value
        .map(item => (typeof item === 'string' ? stripHtml(item) : String(item)))
        .map(item => item.trim())
        .filter(Boolean);
      if (items.length) {
        acc.push(`${label}: ${items.join(', ')}`);
      }
      return acc;
    }

    acc.push(`${label}: ${JSON.stringify(value, null, 2)}`);
    return acc;
  }, []);
};

const buildPromptForAsset = (asset: Asset): string => {
  const sections: string[] = [];

  const assetTypeName = humanizeLabel(asset.type);
  sections.push(`TITLE: ${asset.name}`);
  sections.push(`ASSET TYPE: ${assetTypeName}`);
  sections.push(`SEED: ${asset.seedId}`);

  if (asset.summary) {
    const summary = stripHtml(asset.summary);
    if (summary) {
      sections.push(`SUMMARY:\n${summary}`);
    }
  }

  if (asset.content) {
    const content = stripHtml(asset.content);
    if (content) {
      sections.push(`CORE CONCEPT:\n${content}`);
    }
  }

  if (asset.tags?.length) {
    sections.push(`TAGS: ${asset.tags.join(', ')}`);
  }

  if (typeof asset.shotCount === 'number' && asset.shotCount > 0) {
    const shotType = asset.shotType ? humanizeLabel(asset.shotType) : undefined;
    sections.push(
      `SHOT PLAN: ${asset.shotCount} shot${asset.shotCount === 1 ? '' : 's'}${shotType ? ` • Emphasis: ${shotType}` : ''}`
    );
  }

  const shotDetailLines = formatShotDetails(asset.shotDetails);
  if (shotDetailLines.length) {
    sections.push(`SHOT DETAILS:\n${shotDetailLines.map(line => `- ${line}`).join('\n')}`);
  }

  const structuredLines = formatStructuredData(asset.inputData);
  if (structuredLines.length) {
    sections.push(`STRUCTURED CONTEXT:\n${structuredLines.map(line => `- ${line}`).join('\n')}`);
  }

  const individualShotLines = formatIndividualShots(asset.individualShots);
  if (individualShotLines.length) {
    sections.push(`INDIVIDUAL SHOTS:\n${individualShotLines.join('\n\n')}`);
  }

  const metadataLines = formatMetadataEntries(asset.metadata);
  if (metadataLines.length) {
    sections.push(`STYLE & TECHNICAL NOTES:\n${metadataLines.map(line => `- ${line}`).join('\n')}`);
  }

  if (asset.outputs?.length) {
    const outputs = asset.outputs
      .map(entry => stripHtml(entry))
      .filter(Boolean);
    if (outputs.length) {
      sections.push(`REFERENCE PROMPTS:\n${outputs.map((entry, index) => `${index + 1}. ${entry}`).join('\n')}`);
    }
  }

  if (asset.lineage?.length) {
    sections.push(`SOURCE LINEAGE: ${asset.lineage.join(' → ')}`);
  }

  sections.push(
    'DELIVERABLE: Craft a polished visual prompt ready for AI generation tools. Maintain cinematic clarity, reference the notes above, and keep the tone aligned with the project.'
  );

  return sections
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const assetTypeDisplayName = (type: Asset['type']): string => humanizeLabel(type);

export const OutputModal: React.FC<OutputModalProps> = ({
  isOpen,
  finalAssets,
  onClose,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'export' | 'prompts'>('overview');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const copyResetRef = React.useRef<number | null>(null);

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  const promptGroups = useMemo(() => {
    const buildEntries = (assets: Asset[]) =>
      assets
        .map(asset => ({ asset, prompt: buildPromptForAsset(asset) }))
        .filter(entry => Boolean(entry.prompt));

    const visualAssetTypes: Array<Asset['type']> = ['multi_shot', 'batch_style', 'master_image', 'master_video'];
    const visualAssets = finalAssets.filter(asset => visualAssetTypes.includes(asset.type));
    const shotAssets = finalAssets.filter(asset => asset.type === 'shot');

    return [
      {
        id: 'visuals' as const,
        label: 'Visual Prompts',
        description: 'Copy-ready structured prompts for cinematic image or video generators.',
        entries: buildEntries(visualAssets),
      },
      {
        id: 'shots' as const,
        label: 'Shot Prompts',
        description: 'Detailed shot breakdowns ready for storyboard or animation tools.',
        entries: buildEntries(shotAssets),
      },
    ];
  }, [finalAssets]);

  const handleCopyPrompt = React.useCallback(async (assetId: string, prompt: string) => {
    const text = prompt.trim();
    if (!text) {
      return;
    }

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        console.warn('Clipboard API copy failed, falling back to legacy method:', error);
      }
    }

    if (!copied && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        copied = true;
      } catch (error) {
        console.warn('execCommand copy failed:', error);
      } finally {
        document.body.removeChild(textarea);
      }
    }

    if (copied) {
      setCopiedPromptId(assetId);
      if (typeof window !== 'undefined') {
        if (copyResetRef.current) {
          window.clearTimeout(copyResetRef.current);
        }
        copyResetRef.current = window.setTimeout(() => setCopiedPromptId(null), 2000);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const focusableElements = Array.from(
      dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => !element.hasAttribute('disabled'));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (event.key === 'Tab' && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    const focusTimeout = window.setTimeout(() => {
      focusableElements[0]?.focus();
    }, 0);

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Group assets by type for better organization
  const assetGroups = {
    masterStories: finalAssets.filter(asset => asset.type === 'master_story'),
    multiShots: finalAssets.filter(asset => asset.type === 'multi_shot'),
    batchStyled: finalAssets.filter(asset => asset.type === 'batch_style'),
    shots: finalAssets.filter(asset => asset.type === 'shot')
  };

  const totalShots = assetGroups.multiShots.reduce((total, asset) => 
    total + (asset.shotCount || 0), 0) + assetGroups.shots.length;

  return (
    <div
      className="glass-modal-backdrop"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="glass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ maxWidth: '95vw', width: '1400px', maxHeight: '95vh', minHeight: '800px' }}
      >
        <div className="glass-modal__header">
          <h2 id={titleId} className="glass-modal__title ink-strong flex items-center gap-2">
            🎬 Final Output Assets
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <p id={descriptionId} className="glass-modal__description">
          Your completed assets ready for production. All outputs are clean and production-ready.
        </p>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-white/20">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift ${
              activeTab === 'overview' 
                ? 'border-b-2 border-green-500 text-green-600 ink-strong transform translateY(-1px)' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift ${
              activeTab === 'details' 
                ? 'border-b-2 border-green-500 text-green-600 ink-strong transform translateY(-1px)' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📋 Asset Details
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift ${
              activeTab === 'prompts'
                ? 'border-b-2 border-green-500 text-green-600 ink-strong transform translateY(-1px)'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🧾 Prompt Library
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift ${
              activeTab === 'export' 
                ? 'border-b-2 border-green-500 text-green-600 ink-strong transform translateY(-1px)' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            💾 Export Options
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6" style={{ maxHeight: 'calc(95vh - 200px)', minHeight: '600px' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-8 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                  <div className="text-4xl font-bold text-blue-400 mb-2">{assetGroups.masterStories.length}</div>
                  <div className="text-sm font-medium text-blue-300">Master Stories</div>
                </div>
                <div className="text-center p-8 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                  <div className="text-4xl font-bold text-purple-400 mb-2">{assetGroups.multiShots.length}</div>
                  <div className="text-sm font-medium text-purple-300">Multi-Shot Assets</div>
                </div>
                <div className="text-center p-8 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl border border-green-500/30 hover:border-green-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                  <div className="text-4xl font-bold text-green-400 mb-2">{totalShots}</div>
                  <div className="text-sm font-medium text-green-300">Total Shots</div>
                </div>
                <div className="text-center p-8 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-2xl border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">{assetGroups.batchStyled.length}</div>
                  <div className="text-sm font-medium text-yellow-300">Styled Assets</div>
                </div>
              </div>

              <div className="p-4 bg-green-50/10 rounded-lg border border-green-500/20">
                <h3 className="font-medium ink-strong mb-2 text-green-400">✅ Production Ready</h3>
                <p className="text-sm ink-subtle">
                  All assets have been processed and are ready for video production. 
                  Each asset contains structured data, shot configurations, and applied visual styling.
                </p>
              </div>

              {/* Asset Type Breakdown */}
              <div className="space-y-4">
                <h3 className="font-medium ink-strong">Asset Breakdown</h3>
                
                {Object.entries(assetGroups).map(([groupKey, assets]) => {
                  if (assets.length === 0) return null;
                  
                  const groupLabels = {
                    masterStories: { title: 'Master Stories', icon: '📖', color: 'blue' },
                    multiShots: { title: 'Multi-Shot Assets', icon: '🎬', color: 'purple' },
                    batchStyled: { title: 'Batch Styled Assets', icon: '🎨', color: 'yellow' },
                    shots: { title: 'Individual Shots', icon: '🎯', color: 'green' }
                  };
                  
                  const group = groupLabels[groupKey as keyof typeof groupLabels];
                  
                  return (
                    <div key={groupKey} className="border border-white/10 rounded-lg overflow-hidden">
                      <div className={`p-3 bg-${group.color}-500/10 border-b border-white/10`}>
                        <h4 className="font-medium ink-strong flex items-center gap-2">
                          <span>{group.icon}</span>
                          {group.title} ({assets.length})
                        </h4>
                      </div>
                      <div className="p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {assets.map(asset => (
                          <div key={asset.id} className="text-sm ink-subtle flex justify-between items-center p-2 hover:bg-white/5 rounded">
                            <span>{asset.name}</span>
                            <span className="text-xs">{asset.seedId.slice(0, 8)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Asset Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Asset List */}
                <div className="space-y-2">
                  <h3 className="font-medium ink-strong">Select Asset for Details</h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg">
                    {finalAssets.map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={`w-full text-left p-3 transition-colors ${
                          selectedAsset?.id === asset.id 
                            ? 'bg-green-500/20 border-l-4 border-green-500' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="font-medium ink-strong text-sm">{asset.name}</div>
                        <div className="text-xs ink-subtle">
                          {asset.type} | {asset.seedId.slice(0, 12)}...
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset Details */}
                <div className="space-y-4">
                  <h3 className="font-medium ink-strong">Asset Details</h3>
                  {selectedAsset ? (
                    <div className="space-y-3 p-4 border border-white/10 rounded-lg bg-white/5">
                      <div>
                        <h4 className="font-medium ink-strong">{selectedAsset.name}</h4>
                        <p className="text-xs ink-subtle">
                          Type: {selectedAsset.type} | Seed: {selectedAsset.seedId}
                        </p>
                      </div>
                      
                      {selectedAsset.summary && (
                        <div>
                          <h5 className="text-sm font-medium ink-strong">Summary</h5>
                          <p className="text-sm ink-subtle p-2 bg-white/10 rounded">
                            {selectedAsset.summary}
                          </p>
                        </div>
                      )}

                      {
                        selectedAsset.content && (
                          <div>
                            <h5 className="text-sm font-medium ink-strong">Content</h5>
                            <div 
                              className="text-sm ink-subtle p-2 bg-white/10 rounded max-h-40 overflow-y-auto custom-scrollbar"
                              dangerouslySetInnerHTML={{
                                __html: selectedAsset.content
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\n/g, '<br />')
                              }}
                            />
                          </div>
                        )
                      }

                      {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium ink-strong">Tags</h5>
                          <div className="flex flex-wrap gap-1">
                            {selectedAsset.tags.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAsset.metadata && (
                        <div>
                          <h5 className="text-sm font-medium ink-strong">Configuration</h5>
                          <pre className="text-xs ink-subtle p-2 bg-white/10 rounded max-h-32 overflow-auto custom-scrollbar">
                            {JSON.stringify(selectedAsset.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm ink-subtle text-center py-8 border border-dashed border-white/20 rounded-lg">
                      Select an asset from the list to view details
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prompt Library Tab */}
          {activeTab === 'prompts' && (
            <div className="space-y-6 fade-in">
              <div className="p-4 border border-white/10 rounded-lg bg-white/5">
                <h3 className="font-medium ink-strong mb-2">Copy prompts into your favourite AI tools</h3>
                <p className="text-sm ink-subtle">
                  Each prompt packages scene intent, shot design, and stylistic notes so you can paste directly into Midjourney, Runway, Sora, or any creative AI surface.
                  Use the copy buttons to grab a structured prompt instantly.
                </p>
              </div>

              {promptGroups.map(group => (
                <section key={group.id} className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold ink-strong">{group.label}</h3>
                      <p className="text-sm ink-subtle">{group.description}</p>
                    </div>
                    <span className="text-xs uppercase tracking-wide ink-subtle">{group.entries.length} prompt{group.entries.length === 1 ? '' : 's'}</span>
                  </div>

                  {group.entries.length ? (
                    <div className="space-y-4">
                      {group.entries.map(({ asset, prompt }) => {
                        const truncatedSeed = asset.seedId.slice(0, 10);
                        const isCopied = copiedPromptId === asset.id;

                        return (
                          <article
                            key={asset.id}
                            className="p-4 border border-white/10 rounded-xl bg-black/30 backdrop-blur-sm hover:border-white/20 transition-shadow shadow-sm"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                <h4 className="font-medium ink-strong text-base">{asset.name}</h4>
                                <p className="text-xs uppercase tracking-[0.3em] text-green-300">
                                  {assetTypeDisplayName(asset.type)} • Seed {truncatedSeed}...
                                </p>
                                {asset.summary && (
                                  <p className="text-sm ink-subtle max-w-2xl">{stripHtml(asset.summary)}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyPrompt(asset.id, prompt)}
                                className={`self-start px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                  isCopied
                                    ? 'bg-green-500/80 text-black shadow-lg'
                                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:shadow-md'
                                }`}
                                aria-live="polite"
                              >
                                {isCopied ? 'Copied!' : 'Copy prompt'}
                              </button>
                            </div>

                            <pre className="mt-3 text-sm ink-subtle whitespace-pre-wrap bg-white/5 border border-white/10 rounded-lg p-4 max-h-72 overflow-y-auto custom-scrollbar">{prompt}</pre>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm ink-subtle border border-dashed border-white/20 rounded-lg p-4">
                      No {group.label.toLowerCase()} yet. Generate assets to unlock ready-to-copy prompts.
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}
          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium ink-strong mb-4">Export Final Assets</h3>
                <p className="text-sm ink-subtle mb-6">
                  Export your completed assets in various formats for use in other applications or for archival purposes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => onExport?.('json')}
                  className="p-4 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors text-left"
                >
                  <div className="text-blue-400 text-2xl mb-2">📄</div>
                  <h4 className="font-medium ink-strong">JSON Format</h4>
                  <p className="text-sm ink-subtle">
                    Complete asset data with all metadata, configurations, and relationships.
                  </p>
                </button>

                <button
                  onClick={() => onExport?.('txt')}
                  className="p-4 border border-green-500/30 rounded-lg hover:bg-green-500/10 transition-colors text-left"
                >
                  <div className="text-green-400 text-2xl mb-2">📝</div>
                  <h4 className="font-medium ink-strong">Text Format</h4>
                  <p className="text-sm ink-subtle">
                    Human-readable format with story content and shot descriptions.
                  </p>
                </button>

                <button
                  onClick={() => onExport?.('csv')}
                  className="p-4 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors text-left"
                >
                  <div className="text-purple-400 text-2xl mb-2">📊</div>
                  <h4 className="font-medium ink-strong">CSV Format</h4>
                  <p className="text-sm ink-subtle">
                    Spreadsheet format for analysis and project management tools.
                  </p>
                </button>
              </div>

              <div className="p-4 bg-yellow-50/10 rounded-lg border border-yellow-500/20">
                <h4 className="font-medium ink-strong text-yellow-400 mb-2">📋 Export Includes</h4>
                <ul className="text-sm ink-subtle space-y-1 ml-4">
                  <li>• All asset content and metadata</li>
                  <li>• Shot configurations and individual parameters</li>
                  <li>• Structured input data and key moments</li>
                  <li>• Visual style applications and batch configurations</li>
                  <li>• Asset lineage and creation timestamps</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="glass-modal__actions">
          <button
            className="modal-button modal-button--primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};