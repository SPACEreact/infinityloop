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
  onOpenOutput: () => {},
  isChromaEnabled: false,
  onToggleChroma: () => {},
  targetModel: null,
  onTargetModelChange: () => {},
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
});
