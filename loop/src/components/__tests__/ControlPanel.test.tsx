import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ControlPanel } from '../ControlPanel';

const baseProps = {
  tagWeights: {},
  onTagWeightChange: () => {},
  onGenerate: () => {},
  isGenerating: false,
  onSyncAssetsToMcp: () => {},
  isMcpLoading: false,
  onOpenReference: () => {},
  onOpenHelp: () => {},
  onOpenApi: () => {},
  onOpenScriptImport: () => {},
  onOpenOutput: () => {},
  isChromaEnabled: false,
  onToggleChroma: () => {},
  targetModel: null,
  onTargetModelChange: () => {},
  lastUsageUpdate: null,
} as const;

describe('ControlPanel usage display', () => {
  it('renders 0% progress when no tokens are used', () => {
    render(
      <ControlPanel
        {...baseProps}
        usageStats={{ used: 0, remaining: 1_000, percent: 0, limit: 1_000 }}
      />,
    );

    expect(screen.getByText('Daily Token Usage')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveStyle('width: 0%');
    expect(screen.getByText(/Used 0 of 1,000 tokens/)).toBeInTheDocument();
  });

  it('caps progress width at 100% when tokens exceed the limit', () => {
    render(
      <ControlPanel
        {...baseProps}
        usageStats={{ used: 1_500, remaining: -500, percent: 150, limit: 1_000 }}
      />,
    );

    expect(screen.getByText('150%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveStyle('width: 100%');
    expect(screen.getByText(/Over by 500/)).toBeInTheDocument();
  });

  it('shows a helpful fallback when usage stats are unavailable', () => {
    render(<ControlPanel {...baseProps} usageStats={null} />);

    expect(
      screen.getByText('Usage data is not available for this project yet.'),
    ).toBeInTheDocument();
  });

  it('summarizes the latest request when usage data is provided', () => {
    const timestamp = new Date('2024-05-01T12:34:00Z');

    render(
      <ControlPanel
        {...baseProps}
        usageStats={{ used: 600, remaining: 400, percent: 60, limit: 1_000 }}
        lastUsageUpdate={{
          totals: { promptTokens: 350, completionTokens: 250, totalTokens: 600 },
          delta: { promptTokens: 120, completionTokens: 80, totalTokens: 200 },
          timestamp,
        }}
      />,
    );

    const summary = screen.getByTestId('last-usage-summary');
    expect(summary.textContent).toContain('Last request: 200 tokens');
    expect(summary.textContent).toContain('Prompt 120');
    expect(summary.textContent).toContain('Completion 80');
  });
});
