import React from 'react';
import { Asset } from '../types';

interface FinalInputsPanelProps {
  assets: Asset[];
}

export const FinalInputsPanel: React.FC<FinalInputsPanelProps> = ({ assets }) => {
  // Get all final processed assets (batch_style and video_prompt types)
  const batchStyleAssets = assets.filter(asset => asset.type === 'batch_style');
  const videoPromptAssets = assets.filter(asset => asset.type === 'video_prompt');
  
  const allFinalAssets = [...batchStyleAssets, ...videoPromptAssets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-sm rounded-lg border border-white/60 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-white/60">
        <h2 className="text-lg font-semibold text-gray-800">Final Outputs</h2>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          {allFinalAssets.length} Ready
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {allFinalAssets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm font-medium">No final outputs yet.</p>
            <p className="text-xs mt-2">Final outputs will appear here after batch style application.</p>
            <div className="mt-4 text-xs ink-subtle text-left bg-white/40 p-3 rounded-lg">
              <p className="font-medium mb-2">Workflow:</p>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Create story assets → Create master story</li>
                <li>Generate multi-shot from master story</li>
                <li>Create master image from visual assets</li>
                <li>Apply batch style (multi-shot + master image)</li>
                <li>Final styled outputs appear here</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            {/* Batch Style Assets */}
            {batchStyleAssets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                  Styled Shots ({batchStyleAssets.length})
                </h3>
                <div className="space-y-2">
                  {batchStyleAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3 bg-gradient-to-r from-purple-50/60 to-pink-50/60 rounded-lg border border-purple-200 hover:border-purple-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{asset.name}</h4>
                        <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          Styled
                        </span>
                      </div>
                      {asset.summary && (
                        <p className="text-xs text-gray-600 mb-2">{asset.summary}</p>
                      )}
                      {asset.content && (
                        <div className="text-xs text-gray-700 p-2 bg-white/40 rounded mt-2 max-h-24 overflow-y-auto custom-scrollbar">
                          {asset.content}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                        <span>Seed: {asset.seedId.slice(0, 8)}...</span>
                        {asset.lineage && asset.lineage.length > 0 && (
                          <span>Sources: {asset.lineage.length}</span>
                        )}
                        <span className="ml-auto">{new Date(asset.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Prompt Assets */}
            {videoPromptAssets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  Video Prompts ({videoPromptAssets.length})
                </h3>
                <div className="space-y-2">
                  {videoPromptAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3 bg-gradient-to-r from-green-50/60 to-teal-50/60 rounded-lg border border-green-200 hover:border-green-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{asset.name}</h4>
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Ready
                        </span>
                      </div>
                      {asset.summary && (
                        <p className="text-xs text-gray-600 mb-2">{asset.summary}</p>
                      )}
                      {asset.content && (
                        <div className="text-xs text-gray-700 p-2 bg-white/40 rounded mt-2 max-h-24 overflow-y-auto custom-scrollbar">
                          {asset.content}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                        <span>Seed: {asset.seedId.slice(0, 8)}...</span>
                        {asset.lineage && asset.lineage.length > 0 && (
                          <span>Sources: {asset.lineage.length}</span>
                        )}
                        <span className="ml-auto">{new Date(asset.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="pt-4 border-t border-white/60">
              <button 
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
                onClick={() => {
                  const data = JSON.stringify(allFinalAssets, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `final-outputs-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export All Final Outputs
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
