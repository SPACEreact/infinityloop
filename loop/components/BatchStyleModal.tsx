import React from 'react';
import { Asset } from '../types';

interface BatchStyleModalProps {
  isOpen: boolean;
  assets: Asset[];
  selectedMultiShots: string[];
  selectedMasterImage: string | null;
  onToggleMultiShot: (assetId: string) => void;
  onSelectMasterImage: (assetId: string) => void;
  onConfirm: () => void;
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

  // Filter for multi-shot assets and master_image assets
  const multiShotAssets = assets.filter(asset => asset.type === 'multi_shot');
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
        style={{ maxWidth: '800px', maxHeight: '90vh' }}
      >
        <div className="glass-modal__header">
          <h2 id={titleId} className="glass-modal__title ink-strong">Create Batch Style Application</h2>
        </div>
        <p id={descriptionId} className="glass-modal__description">
          Select multi-shot assets and a master image to apply consistent visual styling across all shots in one batch operation.
        </p>

        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          {/* Multi-Shot Selection */}
          <div className="p-4 border-b border-white/20">
            <h3 className="font-medium ink-strong mb-3 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-blue-500 text-white rounded-full text-center text-sm leading-6">1</span>
              Select Multi-Shot Assets
            </h3>
            <p className="text-xs ink-subtle mb-3">Choose one or more multi-shot assets to apply styling to.</p>
            {multiShotAssets.length === 0 ? (
              <p className="text-sm ink-subtle text-center py-4 bg-white/5 rounded-lg">
                No multi-shot assets available. Create multi-shot assets first from the Multi-Shot panel.
              </p>
            ) : (
              <div className="space-y-2">
                {multiShotAssets.map(asset => (
                  <label key={asset.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors border border-blue-200">
                    <input
                      type="checkbox"
                      checked={selectedMultiShots.includes(asset.id)}
                      onChange={() => onToggleMultiShot(asset.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium ink-strong">{asset.name}</div>
                      <div className="text-xs ink-subtle mt-1">
                        Seed: {asset.seedId.slice(0, 8)}... | Type: {asset.type}
                      </div>
                      {asset.summary && (
                        <div className="text-xs ink-subtle mt-2 p-2 bg-white/5 rounded">
                          {asset.summary}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Master Image Selection */}
          <div className="p-4 border-b border-white/20">
            <h3 className="font-medium ink-strong mb-3 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-purple-500 text-white rounded-full text-center text-sm leading-6">2</span>
              Select Master Visual Style
            </h3>
            <p className="text-xs ink-subtle mb-3">Choose one master image to provide the visual styling.</p>
            {masterImageAssets.length === 0 ? (
              <p className="text-sm ink-subtle text-center py-4 bg-white/5 rounded-lg">
                No master image assets available. Create master image assets first from visual assets.
              </p>
            ) : (
              <div className="space-y-2">
                {masterImageAssets.map(asset => (
                  <label key={asset.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors border border-purple-200">
                    <input
                      type="radio"
                      name="masterImage"
                      checked={selectedMasterImage === asset.id}
                      onChange={() => onSelectMasterImage(asset.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium ink-strong">{asset.name}</div>
                      <div className="text-xs ink-subtle mt-1">
                        Seed: {asset.seedId.slice(0, 8)}... | Type: {asset.type}
                      </div>
                      {asset.content && (
                        <div className="text-xs ink-subtle mt-2 p-2 bg-white/5 rounded">
                          {asset.content.substring(0, 150)}...
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Summary Section */}
          {(selectedMultiShotAssets.length > 0 || selectedMasterImageAsset) && (
            <div className="p-4 bg-purple-50/50">
              <h3 className="font-medium ink-strong mb-2">Batch Style Application Summary</h3>
              <div className="text-sm ink-subtle space-y-2">
                <div>
                  <strong>Multi-Shot Assets Selected:</strong> {selectedMultiShotAssets.length}
                  {selectedMultiShotAssets.length > 0 && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {selectedMultiShotAssets.map(asset => (
                        <li key={asset.id} className="text-xs">• {asset.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <strong>Master Visual Style:</strong> {selectedMasterImageAsset ? selectedMasterImageAsset.name : 'None selected'}
                  {selectedMasterImageAsset && (
                    <p className="text-xs mt-1 p-2 bg-white/20 rounded">
                      {selectedMasterImageAsset.content?.substring(0, 100)}...
                    </p>
                  )}
                </div>
                {selectedMultiShotAssets.length > 0 && selectedMasterImageAsset && (
                  <div className="mt-3 p-2 bg-white/30 rounded text-xs">
                    <strong>Result:</strong> The visual style from "{selectedMasterImageAsset.name}" will be applied to all shots in the {selectedMultiShotAssets.length} selected multi-shot asset(s), creating styled final outputs ready for video generation.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass-modal__actions">
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
