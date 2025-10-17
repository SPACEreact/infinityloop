import { describe, expect, it } from 'vitest';
import { interpretUserMessage } from '../chatEngine';

const mockAsset = { id: 'asset-1' } as any;

describe('chatEngine', () => {
  it('opens import modal when /import command is used without payload', () => {
    expect(interpretUserMessage('/import', { selectedAsset: mockAsset })).toEqual([
      { type: 'openScriptImportModal' }
    ]);
  });

  it('returns import action when script text is provided', () => {
    expect(interpretUserMessage('/import EXT. PARK - DAY', { selectedAsset: mockAsset })).toEqual([
      { type: 'importScript', script: 'EXT. PARK - DAY' }
    ]);
  });

  it('asks user to select an asset when none is active', () => {
    expect(interpretUserMessage('Update the tone to hopeful.', { selectedAsset: null })).toEqual([
      {
        type: 'assistantReply',
        message: 'Select an asset in the inspector to capture updates or use /import to ingest a script.'
      }
    ]);
  });

  it('appends assistant response to the selected asset by default', () => {
    expect(interpretUserMessage('Describe the setting.', { selectedAsset: mockAsset })).toEqual([
      {
        type: 'updateAssetField',
        assetId: 'asset-1',
        fieldKey: 'assistant_notes',
        mode: 'append',
        source: 'assistantResponse',
        fallbackValue: 'Describe the setting.'
      }
    ]);
  });
});
