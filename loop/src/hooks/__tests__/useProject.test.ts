import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Project } from '../../types';
import { useProject } from '../useProject';

const mockGenerateDirectorAdvice = vi.fn();

vi.mock('../../services/geminiService', () => ({
  generateDirectorAdvice: (...args: unknown[]) => mockGenerateDirectorAdvice(...args),
  generateFromWorkspace: vi.fn(),
}));

vi.mock('../../services/config', async () => {
  const actual = await vi.importActual<typeof import('../../services/config')>(
    '../../services/config',
  );
  return {
    ...actual,
    TOKEN_DAILY_LIMIT: 1_000,
    getTokenDailyLimit: () => 1_000,
  };
});

const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Director Advice Project',
  assets: [],
  primaryTimeline: {
    folders: {
      story: [],
      image: [],
      text_to_video: [],
    },
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  fourthTimeline: {
    suggestions: [],
    acceptedSuggestions: [],
  },
  ...overrides,
});

describe('useProject director advice handling', () => {
  beforeEach(() => {
    mockGenerateDirectorAdvice.mockReset();
  });

  it('preserves acceptance for regenerated suggestions with matching ids', async () => {
    mockGenerateDirectorAdvice
      .mockResolvedValueOnce({
        data: [
          {
            id: 'suggestion-1',
            type: 'addition',
            description: 'Initial director suggestion',
            advice: 'Try a wide establishing shot.',
          },
        ],
        error: null,
        isMock: false,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'suggestion-1',
            type: 'addition',
            description: 'Updated director suggestion',
            advice: 'Refine the establishing shot pacing.',
          },
        ],
        error: null,
        isMock: false,
      });

    const { result } = renderHook(() => useProject(createProject()));

    await act(async () => {
      await result.current.handleGenerateDirectorAdvice();
    });

    act(() => {
      result.current.handleAcceptSuggestion('suggestion-1');
    });

    await act(async () => {
      await result.current.handleGenerateDirectorAdvice();
    });

    const timeline = result.current.project.fourthTimeline;
    expect(timeline?.suggestions).toHaveLength(1);
    const [suggestion] = timeline!.suggestions;
    expect(suggestion.accepted).toBe(true);
    expect(timeline?.acceptedSuggestions).toHaveLength(1);
    expect(timeline?.acceptedSuggestions[0]).toBe(suggestion);
  });
});

describe('useProject usage stats', () => {
  it('computes usage stats from totals', () => {
    const project = createProject({
      usageTotals: {
        promptTokens: 200,
        completionTokens: 300,
        totalTokens: 600,
      },
    });

    const { result } = renderHook(() => useProject(project));

    expect(result.current.usageStats).toEqual({
      used: 600,
      remaining: 400,
      percent: 60,
      limit: 1_000,
    });
  });

  it('handles totals exceeding the daily limit', () => {
    const project = createProject({
      usageTotals: {
        promptTokens: 900,
        completionTokens: 400,
        totalTokens: 1_400,
      },
    });

    const { result } = renderHook(() => useProject(project));

    expect(result.current.usageStats).toEqual({
      used: 1_400,
      remaining: -400,
      percent: 140,
      limit: 1_000,
    });
  });

  it('returns null when usage totals are missing', () => {
    const project = createProject({ usageTotals: undefined });
    const { result } = renderHook(() => useProject(project));

    expect(result.current.usageStats).toBeNull();
  });
});
