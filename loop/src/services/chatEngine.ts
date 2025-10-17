import type { Asset } from '../types';

export type ChatAction =
  | { type: 'assistantReply'; message: string }
  | { type: 'openScriptImportModal' }
  | { type: 'importScript'; script: string }
  | {
      type: 'updateAssetField';
      assetId: string;
      fieldKey: string;
      mode?: 'append' | 'replace';
      source: 'assistantResponse' | 'userMessage';
      fallbackValue?: string;
    };

export interface ChatEngineContext {
  selectedAsset: Asset | null;
}

const DEFAULT_FIELD_KEY = 'assistant_notes';

export const interpretUserMessage = (
  rawMessage: string,
  context: ChatEngineContext
): ChatAction[] => {
  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed === '/import') {
    return [{ type: 'openScriptImportModal' }];
  }

  if (trimmed.startsWith('/import ')) {
    const script = trimmed.slice('/import'.length).trim();
    if (!script) {
      return [
        {
          type: 'assistantReply',
          message: 'Provide script text after /import to ingest a screenplay.'
        }
      ];
    }
    return [{ type: 'importScript', script }];
  }

  const { selectedAsset } = context;
  if (!selectedAsset) {
    return [
      {
        type: 'assistantReply',
        message: 'Select an asset in the inspector to capture updates or use /import to ingest a script.'
      }
    ];
  }

  return [
    {
      type: 'updateAssetField',
      assetId: selectedAsset.id,
      fieldKey: DEFAULT_FIELD_KEY,
      mode: 'append',
      source: 'assistantResponse',
      fallbackValue: trimmed
    }
  ];
};
