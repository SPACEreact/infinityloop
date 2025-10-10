import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project, Asset } from '../types';
import { FIELD_OPTIONS } from '../constants';
import { SparklesIcon, TrashIcon, XMarkIcon } from './IconComponents';
import { OptimizedDropdown } from './OptimizedDropdown';

const ASSET_NAME_SUGGESTION_KEY = 'asset_name';

export const AssetDetailsPanel = ({ 
  selectedAssetId,
  project,
  onUpdateAsset,
  onDeleteAsset,
  onClose,
  onRequestSuggestion
}: { 
  selectedAssetId: string | null;
  project: Project;
  onUpdateAsset: (assetId: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (asset: Asset) => void;
  onClose: () => void;
  onRequestSuggestion: (context: {
    assetId: string;
    fieldKey: string;
    fieldLabel: string;
    currentValue: string;
  }) => Promise<string | null>;
}) => {
  const [suggestionStates, setSuggestionStates] = useState<Record<string, {
    isLoading: boolean;
    proposal: string | null;
    error: string | null;
  }>>({});

  useEffect(() => {
    setSuggestionStates({});
  }, [selectedAssetId]);

  if (!selectedAssetId) return null;

  const asset = project.assets.find(a => a.id === selectedAssetId);
  if (!asset) return null;

  const handleDelete = useCallback(() => {
    onDeleteAsset(asset);
    onClose(); // Close the panel after deletion
  }, [asset, onDeleteAsset, onClose]);

  // Parse content into fields and values - memoized for performance
  const parseContent = useCallback((content: string) => {
    const lines = content.split('\n');
    const fields: Record<string, string> = {};

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const fieldName = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
        const fieldValue = line.substring(colonIndex + 1).trim();
        fields[fieldName] = fieldValue;
      }
    });

    return fields;
  }, []);

  // Memoize parsed fields to prevent unnecessary recalculations
  const parsedFields = useMemo(() => parseContent(asset.content), [asset.content, parseContent]);

  // Update content when a field changes - optimized
  const updateField = useCallback((fieldName: string, value: string) => {
    const fields = { ...parsedFields };
    fields[fieldName] = value;

    // Reconstruct content
    const newContent = Object.entries(fields)
      .map(([key, val]) => `${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${val}`)
      .join('\n');

    onUpdateAsset(asset.id, { content: newContent });
  }, [parsedFields, asset.id, onUpdateAsset]);

  const requestSuggestionForField = async (fieldKey: string, fieldLabel: string, currentValue: string) => {
    setSuggestionStates(prev => ({
      ...prev,
      [fieldKey]: {
        isLoading: true,
        proposal: prev[fieldKey]?.proposal ?? null,
        error: null
      }
    }));

    try {
      const suggestion = await onRequestSuggestion({
        assetId: asset.id,
        fieldKey,
        fieldLabel,
        currentValue
      });

      setSuggestionStates(prev => ({
        ...prev,
        [fieldKey]: {
          isLoading: false,
          proposal: suggestion ?? null,
          error: suggestion ? null : 'No suggestion received.'
        }
      }));
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Failed to fetch suggestion', error);
      }
      setSuggestionStates(prev => ({
        ...prev,
        [fieldKey]: {
          isLoading: false,
          proposal: null,
          error: 'Unable to fetch suggestion.'
        }
      }));
    }
  };

  const clearSuggestionForField = (fieldKey: string) => {
    setSuggestionStates(prev => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const renderSuggestionPreview = (fieldKey: string, onApply: (value: string) => void) => {
    const suggestionState = suggestionStates[fieldKey];
    if (!suggestionState) return null;

    if (suggestionState.isLoading) {
      return (
        <div className="mt-2 text-xs ink-subtle flex items-center gap-2">
          <SparklesIcon className="w-3 h-3 animate-spin" />
          Requesting suggestion...
        </div>
      );
    }

    if (suggestionState.error) {
      return (
        <div className="mt-2 text-xs text-red-500">
          {suggestionState.error}
        </div>
      );
    }

    if (!suggestionState.proposal) return null;

    return (
      <div className="mt-2 p-3 rounded-md border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.6)]">
        <div className="text-xs font-semibold uppercase tracking-wide ink-subtle mb-2">Suggested update</div>
        <div className="text-sm whitespace-pre-wrap ink-strong">{suggestionState.proposal}</div>
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            className="text-xs font-semibold px-3 py-1 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
            onClick={() => {
              onApply(suggestionState.proposal!); 
              clearSuggestionForField(fieldKey);
            }}
          >
            Apply suggestion
          </button>
          <button
            type="button"
            className="text-xs font-semibold px-3 py-1 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:opacity-90"
            onClick={() => clearSuggestionForField(fieldKey)}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  // Map field names to their dropdown options using FIELD_OPTIONS
  const getFieldOptions = (fieldKey: string): string[] => {
    // First, try if fieldKey is a key in FIELD_OPTIONS with options
    if (FIELD_OPTIONS[fieldKey] && FIELD_OPTIONS[fieldKey].options) {
      return FIELD_OPTIONS[fieldKey].options;
    }

    // Then, try to find fieldKey as subkey in nested FIELD_OPTIONS
    const options: string[] = [];
    for (const [_, value] of Object.entries(FIELD_OPTIONS)) {
      if (value && typeof value === 'object' && value[fieldKey] && Array.isArray(value[fieldKey])) {
        options.push(...value[fieldKey]);
      }
    }
    if (options.length > 0) {
      return [...new Set(options)];
    }

    // Fallback to special mappings for cases where fieldKey doesn't match
    const specialMappings: Record<string, string> = {
      'genre': 'story_genres',
      'tone': 'story_tones',
      'shot_type': 'shot_types',
      'style_reference': 'style_references',
      'camera_type': 'camera_types',
      'focal_length': 'camera_focal_lengths',
      'depth_of_field_/_aperture': 'camera_apertures',
      'film_stock_/_look': 'film_stocks',
      'camera_movement': 'camera_movements',
      'lighting': 'lighting_styles',
      'lighting_technical': 'lighting_technical_details',
      'color_grading_style': 'color_grading_styles',
      'color_technical': 'color_technical_details',
      'framing_&_composition': 'framing_composition',
      'character_blocking': 'character_blocking',
      'texture_/_atmosphere_/_effects': 'texture_atmosphere',
      'film_emulation_/_grain': 'film_emulation',
      'color_palette': 'color_palettes',
      'aperture': 'camera_apertures',
      'pacing': 'video_pacing',
      'duration': 'video_durations',
      'aspect_ratio': 'aspect_ratios',
      'layout': 'storyboard_output',
      'annotations': 'storyboard_output',
      'style': 'storyboard_output',
      'lut': 'color_grading',
      'contrast': 'color_grading',
      'saturation': 'color_grading',
      'key_light': 'lighting_setup',
      'color_temperature': 'lighting_setup',
      'intensity': 'lighting_setup',
      'shutter_speed': 'camera_settings',
      'iso': 'camera_settings',
      'quality': 'image_output',
      'color_space': 'image_output',
      'bitrate': 'video_output',
      'codec': 'video_output',
      'frame_rate': 'video_output',
      'format': 'video_output',
      'resolution': 'video_output' // but since it's handled above, but for special, but since it's handled above
    };

    const optionsKey = specialMappings[fieldKey];
    if (optionsKey) {
      const fieldOptions = FIELD_OPTIONS[optionsKey];
      if (fieldOptions) {
        if (fieldOptions.options) {
          return fieldOptions.options;
        } else if (fieldOptions[fieldKey] && Array.isArray(fieldOptions[fieldKey])) {
          return fieldOptions[fieldKey];
        }
      }
    }

    return [];
  };

  return (
    <aside className="glass-card h-full w-full p-4 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold ink-strong">Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="icon-button-destructive text-lg"
            title="Delete asset"
          >
            <TrashIcon className="w-5 h-5" title="Delete asset" />
          </button>
          <button
            onClick={onClose}
            className="icon-button-soft"
            title="Close panel"
          >
            <XMarkIcon className="w-5 h-5" title="Close panel" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="block font-bold ink-strong">Name</label>
            <button
              type="button"
              className="icon-button-soft shrink-0"
              onClick={() => requestSuggestionForField(ASSET_NAME_SUGGESTION_KEY, 'Name', asset.name)}
              disabled={suggestionStates[ASSET_NAME_SUGGESTION_KEY]?.isLoading}
              title="Ask AI to suggest a name"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={asset.name}
            onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
            className="panel-input w-full px-3 py-2"
            placeholder="Enter name..."
          />
          {renderSuggestionPreview(ASSET_NAME_SUGGESTION_KEY, (value) => onUpdateAsset(asset.id, { name: value }))}
        </div>

        <div>
          <label className="block font-bold ink-strong mb-2">Type</label>
          <div className="text-sm panel-surface-strong px-3 py-2 rounded">
            {asset.type.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div>
          <label className="block font-bold ink-strong mb-2">Fields</label>
          <div className="space-y-3">
            {Object.entries(parsedFields).map(([fieldKey, fieldValue]) => {
              const displayName = fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const options = getFieldOptions(fieldKey);

              if (options && options.length > 0) {
                // Render optimized dropdown for fields with predefined options
                return (
                  <div key={fieldKey}>
                    <label className="block font-medium ink-strong mb-1 text-sm">{displayName}</label>
                    <OptimizedDropdown
                      value={fieldValue}
                      options={options}
                      onChange={(value) => updateField(fieldKey, value)}
                      placeholder={`Select ${displayName.toLowerCase()}...`}
                      className="panel-input"
                    />
                  </div>
                );
              } else {
                // Render text input for free-form fields
                return (
                  <div key={fieldKey}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block font-medium ink-strong text-sm">{displayName}</label>
                      <button
                        type="button"
                        className="icon-button-soft shrink-0"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          requestSuggestionForField(fieldKey, displayName, fieldValue);
                        }}
                        disabled={suggestionStates[fieldKey]?.isLoading}
                        title={`Ask AI to suggest a ${displayName.toLowerCase()}`}
                      >
                        <SparklesIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => updateField(fieldKey, e.target.value)}
                      className="panel-input w-full px-3 py-2"
                      placeholder={`Enter ${displayName.toLowerCase()}...`}
                    />
                    {renderSuggestionPreview(fieldKey, (value) => updateField(fieldKey, value))}
                  </div>
                );
              }
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="block font-bold ink-strong">Raw Content</label>
            <button
              type="button"
              className="icon-button-soft shrink-0"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                requestSuggestionForField('raw_content', 'Raw Content', asset.content);
              }}
              disabled={suggestionStates.raw_content?.isLoading}
              title="Ask AI to suggest raw content"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={asset.content}
            onChange={(e) => onUpdateAsset(asset.id, { content: e.target.value })}
            className="panel-input w-full px-3 py-2 min-h-24 resize-y text-xs"
            placeholder="Raw content..."
          />
          {renderSuggestionPreview('raw_content', (value) => onUpdateAsset(asset.id, { content: value }))}
        </div>

        <div>
          <label className="block font-bold ink-strong mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {asset.tags?.map((tag) => (
              <span
                key={tag}
                className="badge-accent px-2 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="text-xs ink-subtle mt-1">
          Asset ID: {asset.seedId.slice(0, 12)}...
        </div>
      </div>
    </aside>
  );
};
