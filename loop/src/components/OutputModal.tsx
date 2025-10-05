import React, { useState } from 'react';
import { Asset } from '../types';
import { generateImageFromPrompt } from '../services/geminiService';

interface OutputModalProps {
  isOpen: boolean;
  finalAssets: Asset[];
  onClose: () => void;
  onExport?: (format: 'json' | 'txt' | 'csv') => void;
}

export const OutputModal: React.FC<OutputModalProps> = ({
  isOpen,
  finalAssets,
  onClose,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'export' | 'visualize'>('overview');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

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

  const generateImage = async () => {
    if (!selectedAsset) return;
    
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    
    try {
      const prompt = `Create a cinematic visual representation of: ${selectedAsset.content || selectedAsset.name}. ${selectedAsset.summary || ''}. Professional cinematography style.`;
      const result = await generateImageFromPrompt(prompt);
      
      if (result.data && !result.isMock) {
        setGeneratedImage(result.data);
      } else {
        // Handle mock or error case
        console.warn('Image generation failed or returned mock data');
      }
    } catch (error) {
      console.error('Image generation error:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

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
            onClick={() => setActiveTab('visualize')}
            className={`px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift ${
              activeTab === 'visualize' 
                ? 'border-b-2 border-green-500 text-green-600 ink-strong transform translateY(-1px)' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🎨 Visualize
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

                      {selectedAsset.content && (
                        <div>
                          <h5 className="text-sm font-medium ink-strong">Content</h5>
                          <div className="text-sm ink-subtle p-2 bg-white/10 rounded max-h-40 overflow-y-auto custom-scrollbar">
                            {selectedAsset.content}
                          </div>
                        </div>
                      )}

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

          {/* Visualize Tab */}
          {activeTab === 'visualize' && (
            <div className="space-y-4 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Selection for Visualization */}
                <div className="space-y-3">
                  <h3 className="font-medium ink-strong">Select Asset to Visualize</h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg">
                    {finalAssets.map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          setSelectedAsset(asset);
                          setGeneratedImage(null);
                        }}
                        className={`w-full text-left p-3 transition-all duration-200 hover-lift click-ripple ${
                          selectedAsset?.id === asset.id 
                            ? 'bg-green-500/20 border-l-4 border-green-500 transform translateX(2px)' 
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

                {/* Image Generation and Display */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium ink-strong">Visual Output</h3>
                    <button
                      onClick={generateImage}
                      disabled={!selectedAsset || isGeneratingImage}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 click-ripple ${
                        selectedAsset && !isGeneratingImage
                          ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white hover:from-purple-600/90 hover:to-pink-600/90 hover-lift'
                          : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isGeneratingImage ? (
                        <span className="flex items-center gap-2">
                          <div className="loading-pulse">🎨</div>
                          Generating...
                        </span>
                      ) : (
                        '🎨 Generate Visual'
                      )}
                    </button>
                  </div>
                  
                  <div className="border border-white/10 rounded-lg bg-white/5 min-h-64 flex items-center justify-center">
                    {isGeneratingImage ? (
                      <div className="text-center space-y-3 pulse-glow">
                        <div className="text-4xl loading-pulse">🎬</div>
                        <p className="text-sm ink-subtle">Creating cinematic visualization...</p>
                        <div className="flex justify-center space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full loading-pulse stagger-1"></div>
                          <div className="w-2 h-2 bg-pink-500 rounded-full loading-pulse stagger-2"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full loading-pulse stagger-3"></div>
                        </div>
                      </div>
                    ) : generatedImage ? (
                      <div className="w-full bounce-in">
                        <img 
                          src={`data:image/png;base64,${generatedImage}`}
                          alt={`Visual representation of ${selectedAsset?.name}`}
                          className="w-full h-auto rounded-lg shadow-lg hover-lift"
                        />
                        <p className="text-xs ink-subtle mt-2 text-center">
                          Visual representation of: {selectedAsset?.name}
                        </p>
                      </div>
                    ) : selectedAsset ? (
                      <div className="text-center space-y-3">
                        <div className="text-4xl">🖼️</div>
                        <p className="text-sm ink-subtle">Click "Generate Visual" to create an image</p>
                        <p className="text-xs ink-subtle">Asset: {selectedAsset.name}</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <div className="text-4xl">👈</div>
                        <p className="text-sm ink-subtle">Select an asset to visualize</p>
                      </div>
                    )}
                  </div>

                  {selectedAsset && (
                    <div className="p-3 bg-blue-50/10 rounded-lg border border-blue-500/20 fade-in-up">
                      <h4 className="font-medium ink-strong text-blue-400 mb-2">💡 About Visualization</h4>
                      <p className="text-xs ink-subtle">
                        Generate cinematic visual representations of your assets using AI image generation. 
                        Perfect for mood boards, concept visualization, and creative inspiration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
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