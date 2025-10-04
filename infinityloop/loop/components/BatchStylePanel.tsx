import React from 'react';
import { Asset } from '../types';

interface BatchStylePanelProps {
  assets: Asset[];
  onCreateBatchStyle: () => void;
}

export const BatchStylePanel: React.FC<BatchStylePanelProps> = ({ assets, onCreateBatchStyle }) => {
  const batchStyleAssets = assets.filter(asset => asset.type === 'batch_style');

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-lg border border-white/60 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-white/60">
        <h2 className="text-lg font-semibold text-gray-800">Batch Style Assets</h2>
        <button
          onClick={onCreateBatchStyle}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          title="Apply Style to Multi-Shot"
        >
          Create Batch Style
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {batchStyleAssets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No batch style assets yet.</p>
            <p className="text-xs mt-2">Apply master image styles to multi-shot assets.</p>
          </div>
        ) : (
          batchStyleAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-3 bg-white/60 rounded-lg border border-purple-200 hover:border-purple-400 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm">{asset.name}</h3>
                {asset.isMaster && (
                  <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
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
