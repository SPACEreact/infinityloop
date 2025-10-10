import { describe, expect, it } from 'vitest';
import { parseScriptScenes, hasImportableScript } from '../scriptParser';

describe('parseScriptScenes', () => {
  it('extracts scenes with content and characters', () => {
    const script = [
      'INT. LOOP HQ - NIGHT',
      'A sleek control room hums with holographic displays.',
      '',
      'LYRA',
      "We\'re moments away from launch.",
      '',
      'EXT. ROOFTOP OBSERVATORY - DAWN',
      'The skyline glows as drones glide overhead.',
      'ARIA',
      'Set the sequence to capture the first light.'
    ].join('\n');

    const scenes = parseScriptScenes(script);

    expect(scenes).toHaveLength(2);
    const [first, second] = scenes;

    expect(first.slugline).toBe('INT. LOOP HQ - NIGHT');
    expect(first.content).toContain('LYRA');
    expect(first.summary).toContain('A sleek control room');
    expect(first.characters).toContain('LYRA');
    expect(first.order).toBe(0);

    expect(second.slugline).toBe('EXT. ROOFTOP OBSERVATORY - DAWN');
    expect(second.content).toContain('Set the sequence');
    expect(second.characters).toContain('ARIA');
    expect(second.order).toBe(1);
  });

  it('returns empty array when no sluglines are present', () => {
    const script = 'This is a single line without any screenplay formatting.';
    expect(parseScriptScenes(script)).toHaveLength(0);
  });
});

describe('hasImportableScript', () => {
  it('identifies messages with screenplay structure', () => {
    const script = ['INT. STATION PLATFORM - EVENING', 'Crowds surge past the arrivals board.'].join('\n');
    expect(hasImportableScript(script)).toBe(true);
  });

  it('ignores short or unstructured messages', () => {
    expect(hasImportableScript('INT. Just a quick note')).toBe(false);
  });
});
