import React, { useState } from 'react';
import { Asset, StructuredInputData, IndividualShot } from '../types';
import { FIELD_OPTIONS } from '../constants';

interface MultiShotModalProps {
  isOpen: boolean;
  assets: Asset[];
  selectedAssets: string[];
  onToggleAsset: (assetId: string) => void;
  onConfirm: (
    numberOfShots: number,
    shotType: string,
    shotDetails?: any,
    structuredData?: StructuredInputData,
    individualShots?: IndividualShot[]
  ) => boolean | void;
  onCancel: () => void;
}

export const MultiShotCreationModal: React.FC<MultiShotModalProps> = ({
  isOpen,
  assets,
  selectedAssets,
  onToggleAsset,
  onConfirm,
  onCancel
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  
  const [numberOfShots, setNumberOfShots] = useState<number>(3);
  const [shotType, setShotType] = useState<string>('mixed');
  const [activeTab, setActiveTab] = useState<'basic' | 'structured' | 'individual'>('basic');
  const [shotDetails, setShotDetails] = useState<{
    duration: string;
    cameraMovement: string;
    focusType: string;
    lightingStyle: string;
    shotDescription: string;
  }>({
    duration: '3-5 seconds',
    cameraMovement: 'static',
    focusType: 'sharp_focus',
    lightingStyle: 'natural',
    shotDescription: ''
  });

  // Structured input data for comprehensive shot planning
  const [structuredData, setStructuredData] = useState<StructuredInputData>({
    sceneDescription: '',
    characterDetails: '',
    locationDetails: '',
    moodAndTone: '',
    keyMoments: [],
    visualStyle: '',
    narrativePurpose: '',
    cinematicReferences: '',
    specificInstructions: ''
  });

  // Individual shot configurations
  const [individualShots, setIndividualShots] = useState<IndividualShot[]>([]);
  const [enablePerShotConfig, setEnablePerShotConfig] = useState<boolean>(false);

  // Update individual shots when numberOfShots changes
  React.useEffect(() => {
    if (enablePerShotConfig) {
      const newShots: IndividualShot[] = Array.from({ length: numberOfShots }, (_, index) => ({
        id: `shot-${index + 1}`,
        shotNumber: index + 1,
        shotType: shotType === 'mixed' ? 
          ['wide', 'medium', 'closeup'][index % 3] : shotType,
        description: '',
        duration: shotDetails.duration,
        cameraMovement: shotDetails.cameraMovement,
        cameraAngle: 'eye_level',
        lensType: '50mm',
        lightingStyle: shotDetails.lightingStyle,
        framing: 'medium_shot',
        colorGrading: 'natural',
        notes: ''
      }));
      setIndividualShots(newShots);
    }
  }, [numberOfShots, shotType, shotDetails, enablePerShotConfig]);

  const updateIndividualShot = (shotIndex: number, updates: Partial<IndividualShot>) => {
    setIndividualShots(prev => prev.map((shot, index) => 
      index === shotIndex ? { ...shot, ...updates } : shot
    ));
  };

  const addKeyMoment = () => {
    setStructuredData(prev => ({
      ...prev,
      keyMoments: [...prev.keyMoments, '']
    }));
  };

  const updateKeyMoment = (index: number, value: string) => {
    setStructuredData(prev => ({
      ...prev,
      keyMoments: prev.keyMoments.map((moment, i) => i === index ? value : moment)
    }));
  };

  const removeKeyMoment = (index: number) => {
    setStructuredData(prev => ({
      ...prev,
      keyMoments: prev.keyMoments.filter((_, i) => i !== index)
    }));
  };

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
        onCancel();
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
      (confirmButtonRef.current || focusableElements[0])?.focus();
    }, 0);

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  // Only show master_story assets
  const masterStoryAssets = assets.filter(asset => asset.type === 'master_story' && asset.isMaster);
  
  const selectedMasterStories = assets.filter(asset => selectedAssets.includes(asset.id));

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
        style={{ maxWidth: '95vw', width: '1400px', maxHeight: '95vh', minHeight: '720px' }}
      >
        <div className="glass-modal__header">
          <h2 id={titleId} className="glass-modal__title ink-strong">Create Multi-Shot Asset</h2>
        </div>
        <p id={descriptionId} className="glass-modal__description">
          Create comprehensive multi-shot assets with detailed configuration and per-shot customization.
        </p>

        <div
          className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8"
          style={{ maxHeight: 'calc(95vh - 220px)' }}
        >
        
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
              activeTab === 'basic'
                ? 'bg-blue-500/20 text-blue-100 border border-blue-400/40'
                : 'text-gray-400 border border-transparent hover:text-gray-200 hover:border-white/20'
            }`}
          >
            📋 Basic Setup
          </button>
          <button
            onClick={() => setActiveTab('structured')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
              activeTab === 'structured'
                ? 'bg-blue-500/20 text-blue-100 border border-blue-400/40'
                : 'text-gray-400 border border-transparent hover:text-gray-200 hover:border-white/20'
            }`}
          >
            🎬 Structured Data
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
              activeTab === 'individual'
                ? 'bg-blue-500/20 text-blue-100 border border-blue-400/40'
                : 'text-gray-400 border border-transparent hover:text-gray-200 hover:border-white/20'
            }`}
          >
            🎯 Per-Shot Config
          </button>
        </div>

        {/* Tab Content */}
        <div
          className="p-6 space-y-6 max-h-[28rem] overflow-y-auto custom-scrollbar bg-white/5 border border-white/10 rounded-2xl"
        >
          {/* Basic Setup Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium ink-strong mb-2">
              Number of Shots per Scene
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={numberOfShots}
              onChange={(e) => setNumberOfShots(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs ink-subtle mt-1">How many shots should be generated for each selected scene (1-12)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium ink-strong mb-2">
                Shot Type
              </label>
              <select
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FIELD_OPTIONS.shot_types?.options?.map(option => (
                  <option key={option} value={option.toLowerCase().replace(/\s+/g, '_')}>
                    {option}
                  </option>
                )) || [
                  <option key="mixed" value="mixed">Mixed (Wide, Medium, Close-up)</option>,
                  <option key="establishing" value="establishing">Establishing Shots</option>,
                  <option key="wide" value="wide">Wide Shots</option>,
                  <option key="medium" value="medium">Medium Shots</option>,
                  <option key="closeup" value="closeup">Close-up Shots</option>
                ]}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium ink-strong mb-2">
                Duration per Shot
              </label>
              <select
                value={shotDetails.duration}
                onChange={(e) => setShotDetails(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1-2 seconds">1-2 seconds</option>
                <option value="3-5 seconds">3-5 seconds</option>
                <option value="5-8 seconds">5-8 seconds</option>
                <option value="8-12 seconds">8-12 seconds</option>
                <option value="15+ seconds">15+ seconds</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium ink-strong mb-2">
                Camera Movement
              </label>
              <select
                value={shotDetails.cameraMovement}
                onChange={(e) => setShotDetails(prev => ({ ...prev, cameraMovement: e.target.value }))}
                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FIELD_OPTIONS.camera_movements?.options?.map(option => (
                  <option key={option} value={option.toLowerCase().replace(/\s+/g, '_')}>
                    {option}
                  </option>
                )) || [
                  <option value="static">Static</option>,
                  <option value="pan">Pan</option>,
                  <option value="tilt">Tilt</option>,
                  <option value="zoom">Zoom</option>,
                  <option value="dolly">Dolly</option>
                ]}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium ink-strong mb-2">
                Lighting Style
              </label>
              <select
                value={shotDetails.lightingStyle}
                onChange={(e) => setShotDetails(prev => ({ ...prev, lightingStyle: e.target.value }))}
                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FIELD_OPTIONS.lighting_styles?.options?.map(option => (
                  <option key={option} value={option.toLowerCase().replace(/\s+/g, '_')}>
                    {option}
                  </option>
                )) || [
                  <option value="natural">Natural</option>,
                  <option value="dramatic">Dramatic</option>,
                  <option value="soft">Soft</option>,
                  <option value="hard">Hard</option>
                ]}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium ink-strong mb-2">
              Shot Description (Optional)
            </label>
            <textarea
              value={shotDetails.shotDescription}
              onChange={(e) => setShotDetails(prev => ({ ...prev, shotDescription: e.target.value }))}
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Additional details or specific instructions for shot composition..."
            />
          </div>
        </div>
          )}

          {/* Structured Data Tab */}
          {activeTab === 'structured' && (
            <div className="space-y-6">
              <p className="text-sm ink-subtle mb-4">
                Create comprehensive structured data that will be included in all generated shots for better context and consistency.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium ink-strong mb-2">
                    Scene Description
                  </label>
                  <textarea
                    value={structuredData.sceneDescription}
                    onChange={(e) => setStructuredData(prev => ({ ...prev, sceneDescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe the overall scene setting, atmosphere, and key elements..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium ink-strong mb-2">
                    Character Details
                  </label>
                  <textarea
                    value={structuredData.characterDetails}
                    onChange={(e) => setStructuredData(prev => ({ ...prev, characterDetails: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Main characters, their appearance, emotions, and actions..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium ink-strong mb-2">
                    Location Details
                  </label>
                  <textarea
                    value={structuredData.locationDetails}
                    onChange={(e) => setStructuredData(prev => ({ ...prev, locationDetails: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Time of day, interior/exterior, specific location details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium ink-strong mb-2">
                    Mood & Tone
                  </label>
                  <textarea
                    value={structuredData.moodAndTone}
                    onChange={(e) => setStructuredData(prev => ({ ...prev, moodAndTone: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Emotional tone, atmosphere, genre feel..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-2">
                  Key Moments
                </label>
                <div className="space-y-2">
                  {structuredData.keyMoments.map((moment, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={moment}
                        onChange={(e) => updateKeyMoment(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Key moment ${index + 1}...`}
                      />
                      <button
                        type="button"
                        onClick={() => removeKeyMoment(index)}
                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addKeyMoment}
                    className="w-full px-3 py-2 border border-dashed border-white/30 rounded-lg text-sm ink-subtle hover:border-white/50 transition-colors"
                  >
                    + Add Key Moment
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium ink-strong mb-2">
                    Visual Style
                  </label>
                  <textarea
                    value={structuredData.visualStyle}
                    onChange={(e) => setStructuredData(prev => ({ ...prev, visualStyle: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Color palette, cinematography style, visual approach..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium ink-strong mb-2">
                    Narrative Purpose
                  </label>
                  <textarea
                    value={structuredData.narrativePurpose}
                    onChange={(e) => setStructuredData(prev => ({ ...prev, narrativePurpose: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="What this scene accomplishes in the story..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-2">
                  Cinematic References (Optional)
                </label>
                <input
                  type="text"
                  value={structuredData.cinematicReferences || ''}
                  onChange={(e) => setStructuredData(prev => ({ ...prev, cinematicReferences: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Similar scenes from films, visual references..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium ink-strong mb-2">
                  Specific Instructions (Optional)
                </label>
                <textarea
                  value={structuredData.specificInstructions || ''}
                  onChange={(e) => setStructuredData(prev => ({ ...prev, specificInstructions: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Any specific requirements or constraints..."
                />
              </div>
            </div>
          )}

          {/* Individual Shot Configuration Tab */}
          {activeTab === 'individual' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm ink-subtle">
                  Configure each shot individually with specific parameters.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePerShotConfig}
                    onChange={(e) => setEnablePerShotConfig(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium ink-strong">Enable Per-Shot Config</span>
                </label>
              </div>

              {enablePerShotConfig && individualShots.length > 0 && (
                <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                  {individualShots.map((shot, index) => (
                    <div key={shot.id} className="p-4 border border-white/20 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium ink-strong">Shot {shot.shotNumber}</h4>
                        <select
                          value={shot.shotType}
                          onChange={(e) => updateIndividualShot(index, { shotType: e.target.value })}
                          className="px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="wide">Wide Shot</option>
                          <option value="medium">Medium Shot</option>
                          <option value="closeup">Close-up</option>
                          <option value="establishing">Establishing</option>
                          <option value="detail">Detail Shot</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs ink-subtle mb-1">Duration</label>
                          <select
                            value={shot.duration}
                            onChange={(e) => updateIndividualShot(index, { duration: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="1-2 seconds">1-2s</option>
                            <option value="3-5 seconds">3-5s</option>
                            <option value="5-8 seconds">5-8s</option>
                            <option value="8-12 seconds">8-12s</option>
                            <option value="15+ seconds">15+s</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs ink-subtle mb-1">Camera Movement</label>
                          <select
                            value={shot.cameraMovement}
                            onChange={(e) => updateIndividualShot(index, { cameraMovement: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="static">Static</option>
                            <option value="pan">Pan</option>
                            <option value="tilt">Tilt</option>
                            <option value="zoom">Zoom</option>
                            <option value="dolly">Dolly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs ink-subtle mb-1">Camera Angle</label>
                          <select
                            value={shot.cameraAngle}
                            onChange={(e) => updateIndividualShot(index, { cameraAngle: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="eye_level">Eye Level</option>
                            <option value="low_angle">Low Angle</option>
                            <option value="high_angle">High Angle</option>
                            <option value="birds_eye">Bird's Eye</option>
                            <option value="worms_eye">Worm's Eye</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs ink-subtle mb-1">Lens Type</label>
                          <select
                            value={shot.lensType}
                            onChange={(e) => updateIndividualShot(index, { lensType: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="14mm">14mm (Ultra Wide)</option>
                            <option value="24mm">24mm (Wide)</option>
                            <option value="35mm">35mm (Standard)</option>
                            <option value="50mm">50mm (Normal)</option>
                            <option value="85mm">85mm (Portrait)</option>
                            <option value="135mm">135mm (Telephoto)</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs ink-subtle mb-1">Shot Description</label>
                        <textarea
                          value={shot.description}
                          onChange={(e) => updateIndividualShot(index, { description: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          rows={2}
                          placeholder="Specific details for this shot..."
                        />
                      </div>

                      {shot.notes !== undefined && (
                        <div>
                          <label className="block text-xs ink-subtle mb-1">Notes</label>
                          <input
                            type="text"
                            value={shot.notes}
                            onChange={(e) => updateIndividualShot(index, { notes: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-white/20 rounded bg-white/10 ink-strong focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Additional notes or reminders..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!enablePerShotConfig && (
                <div className="text-center py-8 ink-subtle">
                  <p className="mb-2">Enable per-shot configuration to customize each shot individually.</p>
                  <p className="text-xs">This will create {numberOfShots} individual shot configurations based on your basic setup.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold ink-strong">Generation Overview</h3>
            <span className="text-xs ink-subtle">{selectedAssets.length} scene{selectedAssets.length === 1 ? '' : 's'} selected</span>
          </div>
          <div className="grid gap-4 text-sm ink-subtle sm:grid-cols-2">
            <div className="space-y-1">
              <p><strong>Total shots planned:</strong> {selectedAssets.length * numberOfShots}</p>
              <p><strong>Shot emphasis:</strong> {shotType.replace('_', ' ')}</p>
              <p><strong>Duration:</strong> {shotDetails.duration}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Camera movement:</strong> {shotDetails.cameraMovement.replace('_', ' ')}</p>
              <p><strong>Lighting:</strong> {shotDetails.lightingStyle.replace('_', ' ')}</p>
              {structuredData.sceneDescription && (
                <p>
                  <strong>Scene focus:</strong> {structuredData.sceneDescription.substring(0, 120)}
                  {structuredData.sceneDescription.length > 120 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
          {enablePerShotConfig && individualShots.length > 0 && (
            <div className="text-xs ink-subtle p-3 bg-white/10 rounded-lg">
              <strong>Per-shot configuration enabled.</strong> Customize each shot below.
            </div>
          )}
        </div>

        {/* Asset Selection - moved outside of tab content */}
        <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium ink-strong">Select Master Story Assets</h3>
            <span className="text-xs ink-subtle">{selectedAssets.length} selected</span>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {masterStoryAssets.length === 0 ? (
              <p className="text-sm ink-subtle text-center py-6 bg-white/5 rounded-xl">
                No master story assets available. Create master story assets first.
              </p>
            ) : (
              masterStoryAssets.map(asset => {
                const truncatedSeed = asset.seedId?.slice(0, 8);
                return (
                  <label
                    key={asset.id}
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/10 rounded-xl transition-colors border border-white/10"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={() => onToggleAsset(asset.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium ink-strong">{asset.name}</div>
                      <div className="text-xs ink-subtle mt-1">
                        Seed: {truncatedSeed ? `${truncatedSeed}...` : 'Not provided'}
                      </div>
                      {asset.content && (
                        <div className="text-xs ink-subtle mt-2 p-3 bg-white/5 rounded-lg">
                          {asset.content.substring(0, 180)}...
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Summary Section */}
        {selectedMasterStories.length > 0 && (
          <div className="p-6 bg-blue-500/10 border border-blue-300/30 rounded-2xl space-y-3">
            <h3 className="font-medium ink-strong">Multi-Shot Configuration Summary</h3>
            <div className="grid gap-2 sm:grid-cols-2 text-sm ink-subtle">
              <p>• Selected Scenes: {selectedMasterStories.length}</p>
              <p>• Shots per Scene: {numberOfShots}</p>
              <p>• Shot Type: {shotType.replace('_', ' ')}</p>
              <p>• Duration: {shotDetails.duration}</p>
              <p>• Camera Movement: {shotDetails.cameraMovement.replace('_', ' ')}</p>
              <p>• Lighting: {shotDetails.lightingStyle.replace('_', ' ')}</p>
              {shotDetails.shotDescription && (
                <p className="sm:col-span-2">
                  • Custom Notes: {shotDetails.shotDescription.substring(0, 160)}
                  {shotDetails.shotDescription.length > 160 ? '...' : ''}
                </p>
              )}
              <p>• Total Shots to Generate: {selectedMasterStories.length * numberOfShots}</p>
            </div>
            <div className="p-4 bg-white/10 rounded-xl text-xs ink-subtle space-y-1">
              <strong className="block text-sm ink-strong">Selected Stories:</strong>
              <ul className="space-y-1">
                {selectedMasterStories.map(asset => (
                  <li key={asset.id}>• {asset.name}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        </div>

        <div className="glass-modal__actions px-8 pb-8">
          <button
            ref={confirmButtonRef}
            className="modal-button modal-button--primary"
            onClick={() => onConfirm(numberOfShots, shotType, shotDetails, structuredData, enablePerShotConfig ? individualShots : undefined)}
            disabled={selectedAssets.length === 0}
          >
            Create Multi-Shot ({selectedAssets.length} scenes)
          </button>
          <button
            className="modal-button modal-button--ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
