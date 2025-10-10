import React, { useMemo } from 'react';
import { Cog6ToothIcon } from './IconComponents';
import { PROMPT_CONVERSION_OPTIONS, getPromptConversion } from '../services/promptConversions';

export const ControlPanel = ({
  tagWeights: _tagWeights,
  onTagWeightChange: _onTagWeightChange,
  onGenerate,
  isGenerating,
  onSyncAssetsToMcp,
  isMcpLoading,
  onOpenReference,
  onOpenHelp,
  onOpenApi,
  onOpenOutput,
  isChromaEnabled,
  onToggleChroma,
  targetModel,
  onTargetModelChange,
  usageStats,
}: {
  tagWeights: Record<string, number>;
  onTagWeightChange: (tagId: string, weight: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSyncAssetsToMcp: () => void;
  isMcpLoading: boolean;
  onOpenReference: () => void;
  onOpenHelp: () => void;
  onOpenApi: () => void;
  onOpenOutput: () => void;
  isChromaEnabled: boolean;
  onToggleChroma: (enabled: boolean) => void;
  targetModel?: string | null;
  onTargetModelChange: (modelId: string | null) => void;
  usageStats?: {
    used: number;
    remaining: number;
    percent: number;
    limit: number;
  } | null;
}) => {
  const selectedConversion = getPromptConversion(targetModel ?? undefined);
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const handleModelSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onTargetModelChange(value ? value : null);
  };

  const usagePercentDisplay = usageStats ? Math.round(usageStats.percent) : null;
  const clampedPercent = usageStats
    ? Math.max(0, Math.min(100, usageStats.percent))
    : 0;
  const formattedUsed = usageStats
    ? numberFormatter.format(Math.round(Math.max(0, usageStats.used)))
    : '0';
  const formattedLimit = usageStats
    ? numberFormatter.format(Math.round(Math.max(0, usageStats.limit)))
    : '0';
  const remainingTokens = usageStats ? Math.round(Math.max(0, usageStats.remaining)) : null;
  const formattedRemaining =
    remainingTokens !== null ? numberFormatter.format(remainingTokens) : null;
  const overageTokens = usageStats ? Math.round(Math.max(0, usageStats.used - usageStats.limit)) : 0;
  const formattedOverage = overageTokens ? numberFormatter.format(overageTokens) : null;

  return (
    <aside className="glass-card w-full p-4 flex flex-col overflow-y-auto custom-scrollbar max-h-full flex-shrink-0 transition-all duration-300">
      <div className="flex items-center gap-2 px-2 mb-4">
        <Cog6ToothIcon className="w-8 h-8" title="Creative controls" />
        <h1 className="sr-only">Command Center</h1>
      </div>

      <div className="space-y-4">
        <button
          onClick={onSyncAssetsToMcp}
          disabled={isMcpLoading}
          className={`w-full cta-button py-3 px-4 shadow-lg transform hover:scale-105 transition-all duration-200 ${isMcpLoading ? 'is-disabled' : ''}`}
          style={{
            background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '2px solid #ccc'
          }}
        >
          Save Project
        </button>

        <div className="border-t border-white/20 pt-4 space-y-3">
          <h3 className="text-sm font-semibold ink-strong mb-3">Tools & References</h3>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-lg border border-white/10 bg-white/5">
            <div className="flex flex-col">
              <span className="font-medium ink-strong">ChromaDB Service</span>
              <span className="text-xs ink-subtle">
                {isChromaEnabled ? 'Enabled for vector memory sync.' : 'Disabled — no data will sync.'}
              </span>
            </div>
            <label className="inline-flex items-center gap-2">
              <span className="text-xs ink-strong">{isChromaEnabled ? 'On' : 'Off'}</span>
              <input
                type="checkbox"
                checked={isChromaEnabled}
                onChange={(event) => onToggleChroma(event.target.checked)}
                className="h-4 w-4 accent-blue-500"
                aria-label="Toggle ChromaDB service"
              />
            </label>
          </div>

          <button
            onClick={onOpenReference}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong hover:bg-white/10 rounded-lg transition-colors cta-button shadow-lg transform hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '2px solid #ccc'
            }}
          >
            Reference Library
          </button>

          <button
            onClick={onOpenHelp}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong hover:bg-white/10 rounded-lg transition-colors cta-button shadow-lg transform hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '2px solid #ccc'
            }}
          >
            Help & Guide
          </button>

          <button
            onClick={onOpenApi}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong hover:bg-white/10 rounded-lg transition-colors cta-button shadow-lg transform hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '2px solid #ccc'
            }}
          >
            API Configuration
          </button>

          <div className="flex flex-col gap-2 px-4 py-3 text-sm rounded-lg border border-white/10 bg-white/5">
            <label htmlFor="prompt-model-select" className="font-medium ink-strong">
              Prompt Output Model
            </label>
            <select
              id="prompt-model-select"
              value={targetModel ?? ''}
              onChange={handleModelSelect}
              className="w-full bg-white/90 text-gray-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Loop Standard (default)</option>
              {PROMPT_CONVERSION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs ink-subtle">
              {selectedConversion ? selectedConversion.summary : 'Use Loop’s default prompt formatting for visual outputs.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 px-4 py-3 text-sm rounded-lg border border-white/10 bg-white/5" aria-live="polite">
            <div className="flex items-center justify-between">
              <span className="font-medium ink-strong">Daily Token Usage</span>
              {usageStats ? (
                <span className="text-xs ink-subtle">{usagePercentDisplay}%</span>
              ) : null}
            </div>
            {usageStats ? (
              <>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${usageStats.percent >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${clampedPercent}%` }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={usageStats.limit}
                    aria-valuenow={Math.min(usageStats.limit, Math.max(0, usageStats.used))}
                    aria-label="Daily token consumption"
                  />
                </div>
                <p className="text-xs ink-subtle">
                  Used {formattedUsed} of {formattedLimit} tokens
                  {formattedRemaining !== null && usageStats.remaining >= 0
                    ? ` (${formattedRemaining} remaining)`
                    : ''}
                  {formattedOverage ? ` (Over by ${formattedOverage})` : ''}
                </p>
              </>
            ) : (
              <p className="text-xs ink-subtle">Usage data is not available for this project yet.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
