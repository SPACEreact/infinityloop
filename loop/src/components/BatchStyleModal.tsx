import React from 'react';
import { Asset } from '../types';

interface BatchStyleModalProps {
  isOpen: boolean;
  assets: Asset[];
  selectedMultiShots: string[];
  selectedMasterImage: string | null;
  onToggleMultiShot: (assetId: string) => void;
  onSelectMasterImage: (assetId: string) => void;
  onConfirm: () => boolean | void;
  onCancel: () => void;
}

export const BatchStyleModal: React.FC<BatchStyleModalProps> = ({
  isOpen,
  assets,
  selectedMultiShots,
  selectedMasterImage,
  onToggleMultiShot,
  onSelectMasterImage,
  onConfirm,
  onCancel
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);
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

  // Filter for multi-shot assets (now using master_story with multi-shot tags) and master_image assets
  const multiShotAssets = assets.filter(asset => 
    (asset.type === 'master_story' && asset.tags?.includes('multi_shot')) || 
    asset.type === 'multi_shot'
  );
  const masterImageAssets = assets.filter(asset => asset.type === 'master_image' && asset.isMaster);

  const selectedMultiShotAssets = assets.filter(asset => selectedMultiShots.includes(asset.id));
  const selectedMasterImageAsset = selectedMasterImage ? assets.find(asset => asset.id === selectedMasterImage) : null;

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
          <h2 id={titleId} className="glass-modal__title ink-strong">Create Batch Style Application</h2>
        </div>
        <p id={descriptionId} className="glass-modal__description">
          Select multi-shot assets and a master image to apply consistent visual styling across all shots in one batch operation.
        </p>

        <div
          className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8"
          style={{ maxHeight: 'calc(95vh - 220px)' }}
        >
          {/* Multi-Shot Selection */}
          <div className="border border-blue-300/40 bg-blue-500/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-medium ink-strong flex items-center gap-3 text-base">
              <span className="inline-flex w-8 h-8 items-center justify-center bg-blue-500 text-white rounded-full text-sm">1</span>
              Select Multi-Shot Assets
            </h3>
            <p className="text-sm ink-subtle">Choose one or more multi-shot assets to apply styling to.</p>
            {multiShotAssets.length === 0 ? (
              <p className="text-sm ink-subtle text-center py-6 bg-white/10 rounded-xl">
                No multi-shot assets available. Create multi-shot assets first from the Multi-Shot panel.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {multiShotAssets.map(asset => {
                  const truncatedSeed = asset.seedId?.slice(0, 8);
                  return (
                    <label
                      key={asset.id}
                      className="flex items-start gap-4 p-4 cursor-pointer hover:bg-white/10 rounded-xl transition-colors border border-blue-200/60"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMultiShots.includes(asset.id)}
                        onChange={() => onToggleMultiShot(asset.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="font-medium ink-strong text-base">{asset.name}</div>
                        <div className="text-xs ink-subtle">
                          Seed: {truncatedSeed ? `${truncatedSeed}...` : 'Not provided'} • Shots: {asset.metadata?.configuration?.totalShots || 'N/A'}
                        </div>
                        {asset.summary && (
                          <div className="text-xs ink-subtle p-3 bg-white/10 rounded-lg">
                            {asset.summary}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Master Image Selection */}
          <div className="border border-purple-300/40 bg-purple-500/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-medium ink-strong flex items-center gap-3 text-base">
              <span className="inline-flex w-8 h-8 items-center justify-center bg-purple-500 text-white rounded-full text-sm">2</span>
              Select Master Visual Style
            </h3>
            <p className="text-sm ink-subtle">Choose one master image to provide the visual styling.</p>
            {masterImageAssets.length === 0 ? (
              <p className="text-sm ink-subtle text-center py-6 bg-white/10 rounded-xl">
                No master image assets available. Create master image assets first from visual assets.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {masterImageAssets.map(asset => {
                  const truncatedSeed = asset.seedId?.slice(0, 8);
                  return (
                    <label
                      key={asset.id}
                      className="flex items-start gap-4 p-4 cursor-pointer hover:bg-white/10 rounded-xl transition-colors border border-purple-200/60"
                    >
                      <input
                        type="radio"
                        name="masterImage"
                        checked={selectedMasterImage === asset.id}
                        onChange={() => onSelectMasterImage(asset.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="font-medium ink-strong text-base">{asset.name}</div>
                        <div className="text-xs ink-subtle">
                          Seed: {truncatedSeed ? `${truncatedSeed}...` : 'Not provided'} • Type: {asset.type}
                        </div>
                        {asset.content && (
                          <div className="text-xs ink-subtle p-3 bg-white/10 rounded-lg">
                            {asset.content.substring(0, 180)}...
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Section */}
          {(selectedMultiShotAssets.length > 0 || selectedMasterImageAsset) && (
            <div className="p-6 bg-purple-500/10 border border-purple-300/30 rounded-2xl space-y-4">
              <h3 className="font-medium ink-strong">Batch Style Application Summary</h3>
              <div className="grid gap-3 text-sm ink-subtle sm:grid-cols-2">
                <div className="space-y-2">
                  <strong className="block text-sm ink-strong">Multi-Shot Assets Selected</strong>
                  <p className="text-xs">{selectedMultiShotAssets.length} plan{selectedMultiShotAssets.length === 1 ? '' : 's'}</p>
                  {selectedMultiShotAssets.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {selectedMultiShotAssets.map(asset => {
                        const totalShots = asset.metadata?.configuration?.totalShots || asset.shotCount || 0;
                        return (
                          <li key={asset.id}>• {asset.name} ({totalShots} shots)</li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <strong className="block text-sm ink-strong">Master Visual Style</strong>
                  <p className="text-xs">
                    {selectedMasterImageAsset ? selectedMasterImageAsset.name : 'No master style selected yet'}
                  </p>
                  {selectedMasterImageAsset && (
                    <p className="text-xs p-3 bg-white/10 rounded-lg">
                      {selectedMasterImageAsset.content?.substring(0, 160)}...
                    </p>
                  )}
                  <div className="text-xs">
                    <strong>Total Shots Styled:</strong>{' '}
                    {selectedMultiShotAssets.reduce((total, asset) =>
                      total + (asset.metadata?.configuration?.totalShots || asset.shotCount || 0), 0)}
                  </div>
                </div>
              </div>
              {selectedMultiShotAssets.length > 0 && selectedMasterImageAsset && (
                <div className="p-3 bg-white/20 rounded-xl text-xs">
                  <strong>Result:</strong> The visual style from "{selectedMasterImageAsset.name}" will be applied to all shots in the {selectedMultiShotAssets.length} selected multi-shot asset{selectedMultiShotAssets.length === 1 ? '' : 's'}, creating styled batches ready for downstream workflows.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-modal__actions px-8 pb-8">
          <button
            ref={confirmButtonRef}
            className="modal-button modal-button--primary"
            onClick={onConfirm}
            disabled={selectedMultiShots.length === 0 || !selectedMasterImage}
          >
            Apply Style Batch
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
