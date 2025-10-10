import { describe, expect, it } from 'vitest';
import type { Asset } from '../../types';
import { __testing } from '../geminiService';

const { truncateConversationHistory, formatAssetsForPrompt } = __testing;

describe('truncateConversationHistory', () => {
  it('preserves assistant labels across multi-line messages', () => {
    const history = [
      { role: 'user' as const, content: 'Hey there' },
      { role: 'assistant' as const, content: 'Line one\nLine two\nLine three' },
      { role: 'user' as const, content: 'Thanks!' }
    ];

    const result = truncateConversationHistory(history, 200);
    const combined = result.join('\n');

    expect(combined).toContain('Assistant: Line one');
    expect(combined).toContain('Line two');
    expect(result[result.length - 1].startsWith('User:')).toBeTruthy();
  });

  it('adds a trim indicator while respecting the max length budget', () => {
    const history = Array.from({ length: 12 }).map((_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `Message ${index} ${'x'.repeat(60)}`
    }));

    const maxLength = 160;
    const result = truncateConversationHistory(history, maxLength);
    const combined = result.join('\n');

    expect(result[0]).toBe('[Earlier conversation trimmed]');
    expect(combined.length).toBeLessThanOrEqual(maxLength);
  });
});

describe('formatAssetsForPrompt', () => {
  it('summarises assets with clipped previews and limited tags', () => {
    const asset: Asset = {
      id: 'asset-1',
      seedId: 'seed-123',
      type: 'master_story',
      name: 'Prologue',
      content: 'An extended description that should be trimmed down because it contains far more detail than needed for a prompt. '
        + 'Segment '.repeat(90)
        + 'Additional beats and moments continue in this paragraph to ensure the preview exceeds the truncation limit.',
      tags: ['opening', 'mood', 'mystery', 'noir', 'extra-tag'],
      createdAt: new Date(),
      summary: '',
      metadata: {},
      questions: undefined,
      chatContext: undefined,
      userSelections: undefined,
      outputs: undefined,
      isMaster: false,
      lineage: [],
    };

    const formatted = formatAssetsForPrompt([asset]);

    expect(formatted).toContain('MASTER_STORY: Prologue');
    expect(formatted).toContain('tags: opening, mood, mystery, noir');
    expect(formatted).not.toContain('extra-tag');
    expect(formatted).toContain('seed: seed-123');
    expect(formatted).toContain('preview:');
    expect(formatted.length).toBeLessThan(500);
    expect(formatted).toContain('…');
  });
});
