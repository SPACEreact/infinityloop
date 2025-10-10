import { describe, expect, it } from 'vitest';

import { __testables } from './geminiService';

const { truncateConversationHistory, MAX_CONVERSATION_CONTEXT } = __testables;

describe('truncateConversationHistory', () => {
  it('preserves assistant prefix for multi-paragraph replies when truncating', () => {
    const conversation = [
      { role: 'user' as const, content: 'Opening question with some details that build context.' },
      { role: 'assistant' as const, content: 'Early response that will be trimmed away.' },
      {
        role: 'user' as const,
        content: 'Another long user prompt that pads the conversation and should force truncation.' + 'x'.repeat(260)
      },
      {
        role: 'assistant' as const,
        content:
          'First paragraph explaining the scene setup.\n\nSecond paragraph diving deeper into emotional beats and pacing cues.'
      },
      { role: 'user' as const, content: 'Latest cue the user provides to the assistant with additional flavor.' + 'z'.repeat(10) }
    ];

    const blocks = truncateConversationHistory(conversation, 260);
    const transcript = blocks.join('\n');

    expect(blocks[0]).toBe('[Earlier context truncated]');
    expect(transcript.length).toBeLessThanOrEqual(260);

    const assistantBlock = blocks.find(block => block.startsWith('Assistant: First paragraph'));
    expect(assistantBlock).toBeDefined();
    expect(assistantBlock).toContain('\n\nSecond paragraph');
  });

  it('never exceeds MAX_CONVERSATION_CONTEXT', () => {
    const conversation = Array.from({ length: 80 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `Message ${index} ` + 'y'.repeat(90)
    }));

    const blocks = truncateConversationHistory(conversation, MAX_CONVERSATION_CONTEXT);
    const transcript = blocks.join('\n');

    expect(transcript.length).toBeLessThanOrEqual(MAX_CONVERSATION_CONTEXT);
  });
});
