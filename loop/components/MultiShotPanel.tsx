import React from 'react';
import { Asset } from '../types';

interface MultiShotPanelProps {
  assets: Asset[];
  onCreateMultiShot: () => void;
}

export const MultiShotPanel: React.FC<MultiShotPanelProps> = ({ assets, onCreateMultiShot }) => {
  const multiShotAssets = assets.filter(asset => asset.type === 'multi_shot');

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-lg border border-white/60 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-white/60">
        <h2 className="text-lg font-semibold text-gray-800">Multi-Shot Assets</h2>
        <button
          onClick={onCreateMultiShot}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          title="Create Multi-Shot from Master Story"
        >
          Create Multi-Shot
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {multiShotAssets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No multi-shot assets yet.</p>
            <p className="text-xs mt-2">Create one from master story assets.</p>
          </div>
        ) : (
          multiShotAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-3 bg-white/60 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm">{asset.name}</h3>
                {asset.isMaster && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    Master
                  </span>
                )}
              </div>
              {asset.summary && (
                <p className="text-xs text-gray-600 mb-2">{asset.summary}</p>
              )}
              <div className="text-xs text-gray-500">
                <p>Seed: {asset.seedId.slice(0, 8)}...</p>
                {asset.lineage && asset.lineage.length > 0 && (
                  <p className="mt-1">From {asset.lineage.length} source(s)</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
