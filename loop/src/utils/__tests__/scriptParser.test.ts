import { describe, expect, it } from 'vitest';
import { parseScriptScenes, hasImportableScript, containsScreenplaySluglines } from '../scriptParser';

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

  it('falls back to paragraph-based scenes when sluglines are absent', () => {
    const script = [
      'This is a single line without any screenplay formatting.',
      '',
      'Jax: We improvise as we go.',
      'Nova watches the skyline ignite.'
    ].join('\n');

    const scenes = parseScriptScenes(script);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].slugline).toContain('SCENE 1');
    expect(scenes[0].characters).toContain('JAX');
  });

  it('separates multiple fallback scenes using blank lines', () => {
    const script = [
      'The crew assembles in the hangar and gathers supplies.',
      'LYRA: Ready to set things in motion?',
      '',
      '',
      'Two hours later, the transport lifts into the night.',
      'ARIA: We are clear of the launchpad.',
      '',
      '',
      'Back at base, the consoles glow with fresh telemetry.'
    ].join('\n');

    const scenes = parseScriptScenes(script);
    expect(scenes).toHaveLength(3);
    expect(scenes[0].slugline).toContain('SCENE 1');
    expect(scenes[1].slugline).toContain('SCENE 2');
    expect(scenes[0].characters).toContain('LYRA');
    expect(scenes[1].characters).toContain('ARIA');
  });
});

describe('hasImportableScript', () => {
  it('identifies messages with screenplay structure', () => {
    const script = ['INT. STATION PLATFORM - EVENING', 'Crowds surge past the arrivals board.'].join('\n');
    expect(hasImportableScript(script)).toBe(true);
  });

  it('recognizes unstructured but meaningful scripts', () => {
    expect(hasImportableScript('A single paragraph that still deserves its own scene.')).toBe(true);
  });
});

describe('containsScreenplaySluglines', () => {
  it('returns true when at least one slugline is present', () => {
    const script = ['INT. LOOP HQ - DAY', 'The control room glows with light.'].join('\n');
    expect(containsScreenplaySluglines(script)).toBe(true);
  });

  it('returns false for casual chat messages', () => {
    const message = 'Hey assistant, can you help me outline the next scene?';
    expect(containsScreenplaySluglines(message)).toBe(false);
  });
});
