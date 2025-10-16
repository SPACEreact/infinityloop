import { describe, expect, it } from 'vitest';
import {
  applyFieldUpdate,
  buildStructuredContent,
  formatFieldLabel,
  normalizeFieldKey,
  parseStructuredFields
} from '../../utils/contentFields';

describe('contentFields utilities', () => {
  it('normalizes field keys', () => {
    expect(normalizeFieldKey('Scene Title')).toBe('scene_title');
    expect(normalizeFieldKey('  Tone! ')).toBe('tone!');
  });

  it('formats field labels from keys', () => {
    expect(formatFieldLabel('scene_title')).toBe('Scene Title');
    expect(formatFieldLabel('tone')).toBe('Tone');
  });

  it('parses structured content into fields', () => {
    const content = 'Scene Title: Opening\nTone: Warm';
    expect(parseStructuredFields(content)).toEqual({
      scene_title: 'Opening',
      tone: 'Warm'
    });
  });

  it('ignores malformed lines when parsing', () => {
    const content = 'No colon here\nLabel: Value';
    expect(parseStructuredFields(content)).toEqual({
      label: 'Value'
    });
  });

  it('builds structured content from fields', () => {
    const fields = { scene_title: 'Opening', tone: 'Warm' };
    expect(buildStructuredContent(fields)).toBe('Scene Title: Opening\nTone: Warm');
  });

  it('applies field updates with append mode', () => {
    const content = 'Notes: First';
    const updated = applyFieldUpdate(content, 'notes', 'Second', 'append');
    expect(updated).toBe('Notes: First\nSecond');
    expect(parseStructuredFields(updated)).toEqual({
      notes: 'First\nSecond'
    });
  });
});
