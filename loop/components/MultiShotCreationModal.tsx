import React, { useState } from 'react';
import { Asset } from '../types';

interface MultiShotModalProps {
  isOpen: boolean;
  assets: Asset[];
  selectedAssets: string[];
  onToggleAsset: (assetId: string) => void;
  onConfirm: (numberOfShots: number, shotType: string) => void;
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
        style={{ maxWidth: '700px', maxHeight: '85vh' }}
      >
        <div className="glass-modal__header">
          <h2 id={titleId} className="glass-modal__title ink-strong">Create Multi-Shot Asset</h2>
        </div>
        <p id={descriptionId} className="glass-modal__description">
          Select master story assets to break down into multiple shots. Configure shot count and type below.
        </p>
        
        {/* Shot Configuration */}
        <div className="p-4 space-y-4" style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}>
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

          <div>
            <label className="block text-sm font-medium ink-strong mb-2">
              Shot Type
            </label>
            <select
              value={shotType}
              onChange={(e) => setShotType(e.target.value)}
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 ink-strong focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mixed">Mixed (Wide, Medium, Close-up)</option>
              <option value="establishing">Establishing Shots</option>
              <option value="wide">Wide Shots</option>
              <option value="medium">Medium Shots</option>
              <option value="closeup">Close-up Shots</option>
              <option value="extreme_closeup">Extreme Close-up Shots</option>
              <option value="over_shoulder">Over-the-Shoulder Shots</option>
              <option value="pov">POV (Point of View) Shots</option>
              <option value="dutch">Dutch Angle Shots</option>
              <option value="aerial">Aerial Shots</option>
            </select>
            <p className="text-xs ink-subtle mt-1">The type of shots to generate for cinematographic consistency</p>
          </div>
        </div>

        {/* Asset Selection */}
        <div className="max-h-64 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <h3 className="font-medium ink-strong mb-2">Select Master Story Assets</h3>
          {masterStoryAssets.length === 0 ? (
            <p className="text-sm ink-subtle text-center py-4">No master story assets available. Create master story assets first.</p>
          ) : (
            masterStoryAssets.map(asset => (
              <label key={asset.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors border border-white/10">
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={() => onToggleAsset(asset.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium ink-strong">{asset.name}</div>
                  <div className="text-xs ink-subtle mt-1">
                    Seed: {asset.seedId.slice(0, 8)}...
                  </div>
                  {asset.content && (
                    <div className="text-xs ink-subtle mt-2 p-2 bg-white/5 rounded">
                      {asset.content.substring(0, 150)}...
                    </div>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        {/* Summary Section */}
        {selectedMasterStories.length > 0 && (
          <div className="p-4 bg-blue-50/50 border-t border-white/20">
            <h3 className="font-medium ink-strong mb-2">Multi-Shot Configuration Summary</h3>
            <div className="text-sm ink-subtle space-y-1">
              <p>• Selected Scenes: {selectedMasterStories.length}</p>
              <p>• Shots per Scene: {numberOfShots}</p>
              <p>• Shot Type: {shotType.replace('_', ' ')}</p>
              <p>• Total Shots to Generate: {selectedMasterStories.length * numberOfShots}</p>
            </div>
            <div className="mt-3 p-3 bg-white/20 rounded text-xs ink-subtle">
              <strong>Selected Stories:</strong>
              <ul className="mt-1 space-y-1">
                {selectedMasterStories.map(asset => (
                  <li key={asset.id}>• {asset.name}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="glass-modal__actions">
          <button
            ref={confirmButtonRef}
            className="modal-button modal-button--primary"
            onClick={() => onConfirm(numberOfShots, shotType)}
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
