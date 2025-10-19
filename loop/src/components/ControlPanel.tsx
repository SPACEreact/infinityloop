import React, { useMemo } from 'react';
import { Cog6ToothIcon } from './IconComponents';
import { PROMPT_CONVERSION_OPTIONS, getPromptConversion } from '../services/promptConversions';
import type { UsageUpdate } from '../types';

interface ControlPanelProps {
  tagWeights: Record<string, number>;
  onTagWeightChange: (tagId: string, weight: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSyncAssetsToMcp: () => void;
  isMcpLoading: boolean;
  onOpenReference: () => void;
  onOpenHelp: () => void;
  onOpenApi: () => void;
  onOpenScriptImport: () => void;
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
  lastUsageUpdate?: UsageUpdate | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  tagWeights: _tagWeights,
  onTagWeightChange: _onTagWeightChange,
  onGenerate,
  isGenerating,
  onSyncAssetsToMcp,
  isMcpLoading,
  onOpenReference,
  onOpenHelp,
  onOpenApi,
  onOpenScriptImport,
  onOpenOutput,
  isChromaEnabled,
  onToggleChroma,
  targetModel,
  onTargetModelChange,
  usageStats,
  lastUsageUpdate,
}) => {
  const selectedConversion = getPromptConversion(targetModel ?? undefined);
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  );

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

  const lastUsageSummary = useMemo(() => {
    if (!lastUsageUpdate) {
      return null;
    }

    const promptDelta = Math.max(0, Math.round(lastUsageUpdate.delta.promptTokens));
    const completionDelta = Math.max(0, Math.round(lastUsageUpdate.delta.completionTokens));
    const totalDelta = Math.max(0, Math.round(lastUsageUpdate.delta.totalTokens));

    const formattedPrompt = numberFormatter.format(promptDelta);
    const formattedCompletion = numberFormatter.format(completionDelta);
    const formattedTotal = numberFormatter.format(totalDelta);
    const formattedTime = timeFormatter.format(lastUsageUpdate.timestamp);

    return {
      formattedPrompt,
      formattedCompletion,
      formattedTotal,
      formattedTime,
    };
  }, [lastUsageUpdate, numberFormatter, timeFormatter]);

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
            background: 'radial-gradient(circle at 30% 25%, rgba(103, 92, 210, 0.9), rgba(28, 24, 43, 0.95))',
            boxShadow: '0 12px 28px rgba(18, 16, 32, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid rgba(162, 148, 255, 0.35)'
          }}
        >
          Save Project
        </button>

        <button
          onClick={onOpenScriptImport}
          className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong rounded-lg transition-all duration-200 cta-button shadow-lg transform hover:translate-y-[-2px]"
          style={{
            background: 'radial-gradient(circle at 30% 25%, rgba(103, 92, 210, 0.9), rgba(28, 24, 43, 0.95))',
            boxShadow: '0 12px 28px rgba(18, 16, 32, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid rgba(162, 148, 255, 0.35)'
          }}
        >
          Import Script to Timeline
        </button>

        <div className="border-t border-indigo-500/20 pt-4 space-y-3">
          <h3 className="text-sm font-semibold ink-strong mb-3">Tools & References</h3>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-lg border border-indigo-500/30 bg-slate-900/60 shadow-inner shadow-indigo-900/20">
            <div className="flex flex-col">
              <span className="font-medium ink-strong">ChromaDB Service</span>
              <span className="text-xs ink-subtle">
                {isChromaEnabled ? 'Enabled for vector memory sync.' : 'Disabled — no data will sync.'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                {isChromaEnabled ? 'Active' : 'Standby'}
              </span>
              <button
                type="button"
                onClick={() => onToggleChroma(!isChromaEnabled)}
                className={`chroma-toggle ${isChromaEnabled ? 'is-on' : 'is-off'}`}
                aria-pressed={isChromaEnabled}
                aria-label="Toggle ChromaDB service"
              >
                <span className="chroma-toggle__thumb" />
              </button>
            </div>
          </div>

          <button
            onClick={onOpenReference}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong rounded-lg transition-all duration-200 cta-button shadow-lg transform hover:translate-y-[-2px]"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(103, 92, 210, 0.9), rgba(28, 24, 43, 0.95))',
              boxShadow: '0 12px 28px rgba(18, 16, 32, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
              border: '1px solid rgba(162, 148, 255, 0.35)'
            }}
          >
            Reference Library
          </button>

          <button
            onClick={onOpenHelp}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong rounded-lg transition-all duration-200 cta-button shadow-lg transform hover:translate-y-[-2px]"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(103, 92, 210, 0.9), rgba(28, 24, 43, 0.95))',
              boxShadow: '0 12px 28px rgba(18, 16, 32, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
              border: '1px solid rgba(162, 148, 255, 0.35)'
            }}
          >
            Help & Guide
          </button>

          <button
            onClick={onOpenApi}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm ink-strong rounded-lg transition-all duration-200 cta-button shadow-lg transform hover:translate-y-[-2px]"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(103, 92, 210, 0.9), rgba(28, 24, 43, 0.95))',
              boxShadow: '0 12px 28px rgba(18, 16, 32, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
              border: '1px solid rgba(162, 148, 255, 0.35)'
            }}
          >
            API Configuration
          </button>

          <div className="flex flex-col gap-2 px-4 py-3 text-sm rounded-lg border border-indigo-500/30 bg-slate-900/60 shadow-inner shadow-indigo-900/20">
            <label htmlFor="prompt-model-select" className="font-medium ink-strong">
              Prompt Output Model
            </label>
            <select
              id="prompt-model-select"
              value={targetModel ?? ''}
              onChange={handleModelSelect}
              className="w-full rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-950/90 text-indigo-100 border border-indigo-500/30"
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

          <div className="flex flex-col gap-2 px-4 py-3 text-sm rounded-lg border border-indigo-500/30 bg-slate-900/60 shadow-inner shadow-indigo-900/20" aria-live="polite">
            <div className="flex items-center justify-between">
              <span className="font-medium ink-strong">Daily Token Usage</span>
              {usageStats ? (
                <span className="text-xs ink-subtle">{usagePercentDisplay}%</span>
              ) : null}
            </div>
            {usageStats ? (
              <>
                  <div className="h-2 rounded-full bg-slate-950/50 overflow-hidden">
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
              {lastUsageSummary ? (
                <div
                  className="text-xs ink-subtle border-t border-indigo-500/20 pt-2 mt-1"
                  data-testid="last-usage-summary"
                >
                  <p className="font-medium text-indigo-100/90">
                    Last request: {lastUsageSummary.formattedTotal} tokens
                  </p>
                  <p className="text-[11px]">
                    Prompt {lastUsageSummary.formattedPrompt} · Completion {lastUsageSummary.formattedCompletion}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-indigo-200/70">
                    Updated {lastUsageSummary.formattedTime}
                  </p>
                </div>
              ) : null}
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
