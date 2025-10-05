import React from 'react';
import { Asset } from '../types';

interface MultiShotPanelProps {
  assets: Asset[];
  onCreateMultiShot: (assetId: string) => void;
}

export const MultiShotPanel: React.FC<MultiShotPanelProps> = ({ assets, onCreateMultiShot }) => {
  const multiShotAssets = assets.filter(asset => asset.type === 'multi_shot');

  // Determine selected multi-shot IDs based on current selection state
  const selectedIds = multiShotAssets.filter(asset => asset.isMaster).map(asset => asset.id);

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-lg border border-white/60 shadow-lg">
      <div className="flex items-center p-4 border-b border-white/60">
        <h2 className="text-lg font-semibold text-gray-800">Multi-Shot Assets</h2>
      </div>
      
      <div className="flex-1 p-4 space-y-3 custom-scrollbar">
        {multiShotAssets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No multi-shot assets yet.</p>
            <p className="text-xs mt-2">Use the timeline controls to generate multi-shots from master stories.</p>
          </div>
        ) : (
          multiShotAssets.map((asset) => (
            <label
              key={asset.id}
              className="flex items-center p-3 bg-white/60 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
            >
              <input
                type="radio"
                name="selectedMultiShot"
                value={asset.id}
                checked={selectedIds.includes(asset.id)}
                onChange={() => onCreateMultiShot(asset.id)}
                className="mr-3"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-sm">{asset.name}</h3>
                {asset.summary && (
                  <p className="text-xs text-gray-600 mt-1">{asset.summary}</p>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  <span>Seed: {asset.seedId.slice(0, 8)}...</span>
                  {asset.lineage && asset.lineage.length > 0 && (
                    <span className="ml-2">Sources: {asset.lineage.length}</span>
                  )}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
};
