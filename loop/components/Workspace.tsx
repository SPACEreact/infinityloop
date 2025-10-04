import React, { useState, useCallback } from 'react';
import { ChatRole } from '../types';
import type { Project, Asset, Message, TimelineBlock } from '../types';
import { ASSET_TEMPLATES, FIELD_OPTIONS } from '../constants';
import { generateFromWorkspace, generateSandboxResponse, isMockMode } from '../services/geminiService';
import { FolderIcon, SparklesIcon, CubeTransparentIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, MagicWandIcon, QuestionMarkCircleIcon, DocumentTextIcon, TrashIcon, XMarkIcon, FracturedLoopLogo, PlusIcon } from './IconComponents';
import ChatAssistant from './ChatAssistant';
import UserGuide from './UserGuide';
import { MultiShotPanel } from './MultiShotPanel';
import { BatchStylePanel } from './BatchStylePanel';
import { MultiShotCreationModal } from './MultiShotCreationModal';
import { BatchStyleModal } from './BatchStyleModal';
import { FinalInputsPanel } from './FinalInputsPanel';

import { createCollection, addDocuments, queryDocuments } from '../services/mcpService';
import { apiConfig } from '../services/config';
import { ApiConfig } from './ApiConfig';

const ReferenceViewer = React.lazy(() => import('./ReferenceViewer'));

const getTimelineAssetColor = (asset: Asset) => {
  const template = ASSET_TEMPLATES[asset.type];
  if (template?.category === 'story') {
    return 'rgba(255, 250, 205, 0.3)'; // faded warm yellow
  } else if (template?.category === 'visual') {
    return 'rgba(224, 246, 255, 0.3)'; // faded cool blue
  }
  return undefined;
};

interface WorkspaceProps {
  appLabel: string;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  tagWeights: Record<string, number>;
  styleRigidity: number;
  isWeightingEnabled: boolean;
  onTagWeightChange: (tagId: string, weight: number) => void;
  onStyleRigidityChange: (value: number) => void;
  onWeightingToggle: (enabled: boolean) => void;
}

// Optimized Dropdown Component
const OptimizedDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  className = ""
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full dropdown-trigger px-3 py-2 flex items-center justify-between"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={selectedOption ? 'ink-strong' : 'dropdown-placeholder'}>
          {selectedOption || placeholder || 'Select option...'}
        </span>
        <span className="dropdown-icon ml-2">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 dropdown-menu max-h-60">
          {options.length > 5 && (
            <div className="p-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full dropdown-search px-2 py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 cursor-pointer dropdown-option ${
                    option === value ? 'is-active' : ''
                  }`}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm dropdown-empty">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
function AssetLibraryPanel({ 
  onAddAsset
}: { 
  onAddAsset: (templateType: string, folder?: string) => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    story: true,
    visual: true
  });

  const handleMouseEnter = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: true }));
  };

  const handleMouseLeave = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: false }));
  };

  const groupedTemplates = Object.values(ASSET_TEMPLATES).reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof ASSET_TEMPLATES[keyof typeof ASSET_TEMPLATES][]>);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, templateType: string) => {
    e.dataTransfer.setData('text/plain', templateType);
  };

  const getAssetCardColor = (templateType: string) => {
    const template = ASSET_TEMPLATES[templateType];
    if (template?.category === 'story') {
      return '#FFFACD'; // muted warm yellow
    } else if (template?.category === 'visual') {
      return '#E0F6FF'; // muted cool blue
    }
    return undefined;
  };

  return (
    <aside className="glass-card h-full w-full p-4 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between px-2 mb-4">
        <h1 className="text-xl font-bold ink-strong">Library</h1>
      </div>
      <div className="space-y-4">
        {Object.keys(groupedTemplates).map(folder => (
          <div key={folder} className="space-y-2">
            <div
              onClick={() => setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }))}
              className="w-full text-left font-medium folder-toggle cursor-pointer"
            >
              {folder.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              <span className="float-right transition-transform duration-200">
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${expandedFolders[folder] ? 'rotate-0' : '-rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            {expandedFolders[folder] && (
              <div className="space-y-1 ml-4">
                {groupedTemplates[folder].map(template => (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template.type)}
                    className="p-2 asset-card cursor-move group"
                    style={{ backgroundColor: getAssetCardColor(template.type) }}
                  >
                    <div className="font-medium ink-strong">{template.name}</div>
                    <div className="overflow-hidden max-h-0 group-hover:max-h-96 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs">
                      <div className="mt-2">
                        <div className="mb-1">{template.description}</div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags?.map((tag) => (
                            <span key={tag} className="badge-accent px-1 py-0.5 text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

type FolderKey = string;

interface UndoState {
  asset: Asset;
  blocks: TimelineBlock[];
  folderAssignments: { folder: FolderKey; block: TimelineBlock }[];
}

type ToastKind = 'info' | 'success' | 'warning';

interface ToastState {
  id: string;
  message: string;
  allowUndo?: boolean;
  kind?: ToastKind;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const focusableElements = Array.from(
      dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => !element.hasAttribute('disabled'));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }

      if (event.key === 'Tab' && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    const focusTimeout = window.setTimeout(() => {
      (confirmButtonRef.current || focusableElements[0])?.focus();
    }, 0);

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="glass-modal-backdrop"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="glass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="glass-modal__header">
          <h2 id={titleId} className="glass-modal__title ink-strong">{title}</h2>
        </div>
        <p id={descriptionId} className="glass-modal__description">
          {description}
        </p>
        <div className="glass-modal__actions">
          <button
            ref={confirmButtonRef}
            className="modal-button modal-button--destructive"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            className="modal-button modal-button--ghost"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastNotificationProps {
  toast: ToastState | null;
  onDismiss: () => void;
  onUndo?: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss, onUndo }) => {
  if (!toast) return null;

  return (
    <div className="toast-container">
      <div
        className="toast-notification"
        data-kind={toast.kind || 'info'}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={0}
      >
        <span className="toast-message">{toast.message}</span>
        <div className="toast-actions">
          {toast.allowUndo && onUndo && (
            <button className="toast-action" onClick={onUndo}>
              Undo
            </button>
          )}
          <button
            className="toast-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const reindexBlocks = (blocks: TimelineBlock[]) =>
  blocks.map((block, index) => ({ ...block, position: index }));

const restoreBlocksWithPositions = (
  existingBlocks: TimelineBlock[],
  restoredBlocks: TimelineBlock[]
) => {
  const sortedRestored = [...restoredBlocks].sort((a, b) => a.position - b.position);
  const mergedBlocks = [...existingBlocks];

  sortedRestored.forEach(block => {
    const insertIndex = Math.min(block.position, mergedBlocks.length);
    mergedBlocks.splice(insertIndex, 0, { ...block });
  });

  return reindexBlocks(mergedBlocks);
};

const ASSET_NAME_SUGGESTION_KEY = 'asset_name';

const AssetDetailsPanel = ({
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

  React.useEffect(() => {
    setSuggestionStates({});
  }, [selectedAssetId]);

  if (!selectedAssetId) return null;

  const asset = project.assets.find(a => a.id === selectedAssetId);
  if (!asset) return null;

  const handleDelete = () => {
    onDeleteAsset(asset);
  };

  // Parse content into fields and values
  const parseContent = (content: string) => {
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
  };

  // Update content when a field changes
  const updateField = (fieldName: string, value: string) => {
    const fields = parseContent(asset.content);
    fields[fieldName] = value;

    // Reconstruct content
    const newContent = Object.entries(fields)
      .map(([key, val]) => `${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${val}`)
      .join('\n');

    onUpdateAsset(asset.id, { content: newContent });
  };

  const parsedFields = parseContent(asset.content);

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

        <div className="text-xs ink-subtle">
          Created: {asset.createdAt.toLocaleDateString()}
        </div>
      </div>
    </aside>
  );
};



const ControlPanel = ({
  tagWeights: _tagWeights,
  onTagWeightChange: _onTagWeightChange,
  onGenerate,
  isGenerating,
  onSyncAssetsToMcp,
  isMcpLoading
}: {
  tagWeights: Record<string, number>;
  onTagWeightChange: (tagId: string, weight: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSyncAssetsToMcp: () => void;
  isMcpLoading: boolean;
}) => {
  return (
    <aside className="glass-card w-full p-4 flex flex-col overflow-y-auto custom-scrollbar max-h-full flex-shrink-0 transition-all duration-300">
      <div className="flex items-center gap-2 px-2 mb-4">
        <Cog6ToothIcon className="w-8 h-8" title="Creative controls" />
        <h1 className="text-xl font-bold ink-strong">Controls</h1>
      </div>

      <div className="space-y-4">
        <button
          onClick={onSyncAssetsToMcp}
          disabled={isMcpLoading}
          className={`w-full cta-button py-3 px-4 ${isMcpLoading ? 'is-disabled' : ''}`}
        >
          Save
        </button>
      </div>
    </aside>
  );
};

type TimelineVariant = 'story' | 'image' | 'master' | 'style' | 'director';

// Simple Timeline View Component
const SimpleTimelineView = ({
  project,
  selectedAssetId,
  setSelectedAssetId,
  onAssetDrop,
  onGenerateOutput,
  onGenerate,
  activeTimeline,
  setActiveTimeline,
  onCreateShots,
  isWeightingEnabled,
  onWeightingToggle,
  styleRigidity,
  onStyleRigidityChange,
  selectedAssetIdForShots,
  setSelectedAssetIdForShots,
  isCreateShotsModalOpen,
  setIsCreateShotsModalOpen
}: {
  project: Project;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  onAssetDrop: (assetId: string, timelineId: string) => void;
  onGenerateOutput: (folder: string) => void;
  onGenerate: () => void;
  activeTimeline: 'primary' | 'secondary' | 'third' | 'fourth';
  setActiveTimeline: (timeline: 'primary' | 'secondary' | 'third' | 'fourth') => void;
  onCreateShots: (assetId: string) => void;
  isWeightingEnabled: boolean;
  onWeightingToggle: (enabled: boolean) => void;
  styleRigidity: number;
  onStyleRigidityChange: (value: number) => void;
  selectedAssetIdForShots: string | null;
  setSelectedAssetIdForShots: (id: string | null) => void;
  isCreateShotsModalOpen: boolean;
  setIsCreateShotsModalOpen: (open: boolean) => void;
}) => {

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, folder?: string) => {
    e.preventDefault();
    const templateType = e.dataTransfer.getData('text/plain');
    if (templateType) {
      onAssetDrop(templateType, folder || 'combined');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

const renderAssetBlock = (block: TimelineBlock, index: number, assetTypeCounts?: Record<string, number>) => {
    const asset = project.assets.find(a => a.id === block.assetId);
    if (!asset) return null;

    const template = ASSET_TEMPLATES[asset.type];
    const hoverClass = template?.category === 'story' ? '!hover:bg-[rgba(255,250,205,0.8)]' : template?.category === 'visual' ? '!hover:bg-[rgba(224,240,255,0.8)]' : '';
    const count = assetTypeCounts ? assetTypeCounts[asset.type] : 0;
    const hasMultipleSameType = count > 1;

    // Determine main dot color based on category
    const mainDotColor = template?.category === 'story' ? 'bg-yellow-400' : template?.category === 'visual' ? 'bg-blue-400' : 'bg-purple-400';

    // Limit max orbiting dots to 8 for visual clarity
    const maxOrbitDots = 8;
    const orbitDotsCount = Math.min(count - 1, maxOrbitDots);

    // Calculate positions for orbiting dots in a circle
    const orbitDots = [];
    const radius = 10; // radius in px for orbit circle
    for (let i = 0; i < orbitDotsCount; i++) {
      const angle = (2 * Math.PI / orbitDotsCount) * i;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      orbitDots.push({ x, y });
    }

    return (
      <div
        key={block.id}
        className={`p-5 cursor-pointer timeline-card group ${
          selectedAssetId === asset.id ? 'timeline-card--active' : ''
        } ${hoverClass}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setSelectedAssetId(asset.id);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index relative">
              {/* Main dot */}
              <div className={`w-4 h-4 rounded-full ${mainDotColor} opacity-0 group-hover:opacity-100`}></div>
              {/* Orbiting dots */}
              {hasMultipleSameType && orbitDots.map((pos, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full bg-pink-300 absolute opacity-0 group-hover:opacity-100"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginTop: pos.y - 8,
                    marginLeft: pos.x - 8,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
            </div>
            <div>
              <h3 className="font-semibold ink-strong">{asset.name}</h3>
              <p className="text-sm ink-subtle">{asset.type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="text-xs ink-subtle">
            {asset.createdAt.toLocaleDateString()}
          </div>
        </div>
        {asset.summary && (
          <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
        )}
      </div>
    );
  };

  const renderPrimaryTimeline = () => {
    // Combine all blocks from story and image folders, sorted by category (story first, then visual)
    const allBlocks = [
      ...project.primaryTimeline.folders.story.map(block => ({ ...block, category: 'story' as const })),
      ...project.primaryTimeline.folders.image.map(block => ({ ...block, category: 'visual' as const }))
    ].sort((a, b) => {
      // Sort by category first (story before visual), then by position
      if (a.category !== b.category) {
        return a.category === 'story' ? -1 : 1;
      }
      return a.position - b.position;
    });

    // Count assets by type to determine if we need notification dots
    const assetTypeCounts = allBlocks.reduce((acc, block) => {
      const asset = project.assets.find(a => a.id === block.assetId);
      if (asset) {
        acc[asset.type] = (acc[asset.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-8" style={{ background: 'rgba(255, 182, 193, 0.05)' }}>
        <div className="flex justify-center md:justify-center relative">
          <div className="group inline-flex items-center gap-2">
            {/* Left dropdown for Story */}
            <div className="relative">
              <button
                className="timeline-action px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 flex items-center gap-2"
                style={{ backgroundColor: '#FFFACD', color: '#8B7355' }}
                onClick={() => onGenerateOutput('story')}
              >
                <MagicWandIcon className="w-5 h-5" />
                Story
              </button>
            </div>

            {/* Center button - 3D effect */}
            <button
              className="timeline-action px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-200"
              style={{
                background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                border: '2px solid #ccc'
              }}
            >
              <MagicWandIcon className="w-5 h-5" />
              Generate
            </button>

            {/* Right dropdown for Image */}
            <div className="relative">
              <button
                className="timeline-action px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 flex items-center gap-2"
                style={{ backgroundColor: '#E0F6FF', color: '#4682B4' }}
                onClick={() => onGenerateOutput('image')}
              >
                <MagicWandIcon className="w-5 h-5" />
                Image
              </button>
            </div>
          </div>
        </div>

        {/* Style Controls */}
        <div className="flex justify-center">
          <div className="panel-section p-4 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <label htmlFor="weighting-enabled-timeline" className="font-bold ink-strong">Enable Tag Weighting</label>
              <button
                role="switch"
                aria-checked={isWeightingEnabled}
                onClick={() => onWeightingToggle(!isWeightingEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full toggle-track ${isWeightingEnabled ? 'switch-on' : ''}`}
                id="weighting-enabled-timeline"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full toggle-thumb ${isWeightingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className={`transition-opacity duration-300 ${isWeightingEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <label htmlFor="style-rigidity-timeline" className="block font-bold ink-strong mb-2">Style Rigidity</label>
              <input
                id="style-rigidity-timeline"
                type="range"
                min="0"
                max="100"
                value={styleRigidity}
                onChange={(e) => onStyleRigidityChange(parseInt(e.target.value, 10))}
                className="w-full"
                disabled={!isWeightingEnabled}
              />
              <div className="text-xs ink-subtle flex justify-between">
                <span>More AI Freedom</span>
                <span>Strict Adherence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Single Drop Zone */}
        <div className="space-y-3">
          <div
            className="min-h-32 p-6 timeline-placeholder"
            onDrop={(e) => handleDrop(e)}
            onDragOver={handleDragOver}
          >
            {allBlocks.length > 0 ? (
              <div className="space-y-3">
                {allBlocks.map((block, index) => renderAssetBlock(block, index, assetTypeCounts))}
              </div>
            ) : (
              <p className="ink-subtle text-center py-8">start building - drag and drop blocks</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSecondaryTimeline = () => (
    <div className="space-y-8" style={{ background: 'rgba(230, 230, 250, 0.05)' }}>

{project.secondaryTimeline ? (
  <div className="space-y-5">
    {project.secondaryTimeline.masterAssets.map((asset, index) => (
      <div
        key={asset.id}
        className="p-5 timeline-card cursor-pointer"
        onClick={() => setSelectedAssetId(asset.id)}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index secondary">
            {index + 1}
          </div>
          <div>
            <h3 className="font-semibold ink-strong">{asset.name}</h3>
            <p className="text-sm ink-subtle">{asset.type.replace('_', ' ')}</p>
          </div>
        </div>
        {asset.summary && (
          <p className="text-sm ink-subtle mt-3">{asset.summary}</p>
        )}
        <div className="flex justify-end mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAssetIdForShots(asset.id);
              setIsCreateShotsModalOpen(true);
            }}
            className="timeline-action px-3 py-1.5 text-sm"
            style={{ backgroundColor: '#98FB98', color: '#2E8B57' }}
          >
            <MagicWandIcon className="w-4 h-4 mr-1" />
            Create Shots
          </button>
        </div>
      </div>
    ))}
  </div>
) : (
  <p className="ink-subtle">No multi-shots yet. Generate from primary timeline first.</p>
)}
    </div>
  );

  const renderThirdTimeline = () => (
    <div className="space-y-8" style={{ background: 'rgba(152, 251, 152, 0.05)' }}>

      {project.thirdTimeline ? (
        <div className="space-y-5">
          {project.thirdTimeline.styledShots.map((shot, index) => (
            <div key={shot.id} className="p-5 timeline-card">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center font-bold timeline-index secondary">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold ink-strong">{shot.name}</h3>
                  <p className="text-sm ink-subtle">{shot.type.replace('_', ' ')}</p>
                </div>
              </div>
              {shot.summary && (
                <p className="text-sm ink-subtle mt-3">{shot.summary}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="ink-subtle">No styled shots yet. Generate from secondary timeline first.</p>
      )}
    </div>
  );

  const renderFourthTimeline = () => (
    <div className="space-y-8" style={{ background: 'rgba(255, 218, 185, 0.05)' }}>

      {project.fourthTimeline ? (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold ink-strong">Suggestions</h3>
          {project.fourthTimeline.suggestions.map((suggestion, index) => (
            <div key={suggestion.id} className="p-5 timeline-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold ink-strong">{suggestion.type.toUpperCase()}</h4>
                  <p className="text-sm ink-subtle">{suggestion.description}</p>
                </div>
                <div className={`timeline-chip ${suggestion.accepted ? 'is-affirmative' : ''}`}>
                  {suggestion.accepted ? 'Accepted' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ink-subtle">No director suggestions yet.</p>
      )}
    </div>
  );

  return (
    <div className="h-full w-full">
      <div className="flex w-full flex-col gap-8 px-0">
        {/* Timeline Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={() => setActiveTimeline('primary')}
            className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'primary' ? 'timeline-tab--active' : ''}`}
            style={{
              background: activeTimeline === 'primary' ? 'linear-gradient(135deg, #FFB6C1, #FF8FA3)' : undefined,
              boxShadow: activeTimeline === 'primary' ? '0 4px 8px rgba(255, 182, 193, 0.3)' : undefined
            }}
          >
            Scene
          </button>
          <button
            onClick={() => setActiveTimeline('secondary')}
            className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'secondary' ? 'timeline-tab--active' : ''}`}
            style={{
        background: activeTimeline === 'secondary' ? 'linear-gradient(135deg, #E6E6FA, #D1D1F0)' : undefined,
        boxShadow: activeTimeline === 'secondary' ? '0 4px 8px rgba(230, 230, 250, 0.3)' : undefined
      }}
    >
      Multi-Shot
    </button>
    <button
      onClick={() => setActiveTimeline('third')}
      className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'third' ? 'timeline-tab--active' : ''}`}
      style={{
        background: activeTimeline === 'third' ? 'linear-gradient(135deg, #98FB98, #7AE67A)' : undefined,
        boxShadow: activeTimeline === 'third' ? '0 4px 8px rgba(152, 251, 152, 0.3)' : undefined
      }}
    >
      Batch Style
    </button>
          <button
            onClick={() => setActiveTimeline('fourth')}
            className={`px-4 py-2.5 text-sm font-semibold md:text-base md:px-5 md:py-3 timeline-tab ${activeTimeline === 'fourth' ? 'timeline-tab--active' : ''}`}
            style={{
              background: activeTimeline === 'fourth' ? 'linear-gradient(135deg, #FFDAB9, #FFCBA4)' : undefined,
              boxShadow: activeTimeline === 'fourth' ? '0 4px 8px rgba(255, 218, 185, 0.3)' : undefined
            }}
          >
            Director’s Advice
          </button>
        </div>

        {/* Timeline Content */}
        {activeTimeline === 'primary' && renderPrimaryTimeline()}
        {activeTimeline === 'secondary' && renderSecondaryTimeline()}
        {activeTimeline === 'third' && renderThirdTimeline()}
        {activeTimeline === 'fourth' && renderFourthTimeline()}
      </div>
    </div>
  );
};

// @ts-ignore - tagWeights and onTagWeightChange are used in ControlPanel and generateFromWorkspace
const Workspace: React.FC<WorkspaceProps> = ({
  appLabel,
  project,
  setProject,
  tagWeights: _tagWeights,
  styleRigidity,
  isWeightingEnabled,
  onTagWeightChange: _onTagWeightChange,
  onStyleRigidityChange,
  onWeightingToggle
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'canvas' | 'chat' | 'timeline'>('timeline');
  const [activeTimeline, setActiveTimeline] = useState<'primary' | 'secondary' | 'third' | 'fourth'>('primary');
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [outputType] = useState<'text' | 'image'>('text');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [hasDismissedMockNotice, setHasDismissedMockNotice] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // New state for UserGuide modal
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isReferenceViewerOpen, setIsReferenceViewerOpen] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<Asset | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);

  // New state for multi-shot modal
  const [isMultiShotModalOpen, setIsMultiShotModalOpen] = useState(false);
  const [isBatchStyleModalOpen, setIsBatchStyleModalOpen] = useState(false);
  const [selectedStoryAssets, setSelectedStoryAssets] = useState<string[]>([]);
  // Batch style needs multi-shot assets and one master image
  const [selectedMultiShots, setSelectedMultiShots] = useState<string[]>([]);
  const [selectedMasterImage, setSelectedMasterImage] = useState<string | null>(null);

  // New state for create shots modal
  const [isCreateShotsModalOpen, setIsCreateShotsModalOpen] = useState(false);
  const [selectedAssetIdForShots, setSelectedAssetIdForShots] = useState<string | null>(null);
  const [numberOfShots, setNumberOfShots] = useState(3);

  // New state for MCP
  const [isMcpLoading, setIsMcpLoading] = useState(false);

  // New function to create multi-shot asset from selected master story assets
  const createMultiShotAsset = (numberOfShots: number, shotType: string) => {
    if (selectedStoryAssets.length === 0) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Please select at least one master story asset to create a multi-shot.',
        kind: 'warning'
      });
      return;
    }

    const masterStories = project.assets.filter(asset => selectedStoryAssets.includes(asset.id));
    
    // Create structured content with configuration
    const structuredContent = {
      configuration: {
        numberOfShots,
        shotType,
        totalScenes: masterStories.length,
        totalShots: masterStories.length * numberOfShots
      },
      scenes: masterStories.map((asset, index) => ({
        sceneNumber: index + 1,
        sceneName: asset.name,
        sceneContent: asset.content,
        seedId: asset.seedId,
        shotConfiguration: {
          count: numberOfShots,
          type: shotType
        }
      }))
    };

    const contentString = `MULTI-SHOT CONFIGURATION
=======================

Configuration:
- Number of Shots per Scene: ${numberOfShots}
- Shot Type: ${shotType.replace('_', ' ')}
- Total Scenes: ${masterStories.length}
- Total Shots to Generate: ${masterStories.length * numberOfShots}

Scenes:
${masterStories.map((asset, index) => `
Scene ${index + 1}: ${asset.name}
${'-'.repeat(50)}
${asset.content}
`).join('\n')}

Shot Configuration:
Each scene will be broken down into ${numberOfShots} ${shotType.replace('_', ' ')} shot(s).
`;

    const combinedTags = Array.from(new Set(masterStories.flatMap(a => a.tags)));

    const multiShotAsset: Asset = {
      id: crypto.randomUUID(),
      seedId: crypto.randomUUID(),
      type: 'multi_shot',
      name: `Multi-Shot (${masterStories.length} scenes, ${numberOfShots} shots each)`,
      content: contentString,
      tags: combinedTags,
      createdAt: new Date(),
      summary: `Multi-shot configuration: ${masterStories.length} scenes with ${numberOfShots} ${shotType.replace('_', ' ')} shots each (${masterStories.length * numberOfShots} total shots)`,
      isMaster: true,
      lineage: masterStories.map(a => a.id),
      metadata: structuredContent
    };

    setProject(prev => ({
      ...prev,
      assets: [...prev.assets, multiShotAsset],
      secondaryTimeline: {
        masterAssets: [...(prev.secondaryTimeline?.masterAssets || []), multiShotAsset],
        shotLists: prev.secondaryTimeline?.shotLists || [],
        appliedStyles: prev.secondaryTimeline?.appliedStyles || {}
      },
      updatedAt: new Date()
    }));

    setIsMultiShotModalOpen(false);
    setSelectedStoryAssets([]);
    setToastState({
      id: crypto.randomUUID(),
      message: `Multi-shot asset created: ${masterStories.length * numberOfShots} shots configured.`,
      kind: 'success'
    });
  };

  // New function to create batch style asset from multi-shot and master image
  const createBatchStyleAsset = () => {
    if (selectedMultiShots.length === 0 || !selectedMasterImage) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Please select at least one multi-shot asset and one master image.',
        kind: 'warning'
      });
      return;
    }

    const multiShotAssets = project.assets.filter(asset => selectedMultiShots.includes(asset.id));
    const masterImageAsset = project.assets.find(asset => asset.id === selectedMasterImage);

    if (!masterImageAsset) {
      setToastState({
        id: crypto.randomUUID(),
        message: 'Master image not found.',
        kind: 'error'
      });
      return;
    }

    // Create structured content combining multi-shots with visual style
    const structuredContent = {
      styleSource: {
        name: masterImageAsset.name,
        seedId: masterImageAsset.seedId,
        content: masterImageAsset.content
      },
      multiShots: multiShotAssets.map(asset => ({
        name: asset.name,
        seedId: asset.seedId,
        content: asset.content,
        metadata: asset.metadata
      }))
    };

    const contentString = `BATCH STYLE APPLICATION
=======================

Master Visual Style:
${masterImageAsset.name}
${'-'.repeat(50)}
${masterImageAsset.content}

${'-'.repeat(80)}

Multi-Shot Assets to Style:
${multiShotAssets.map((asset, index) => `
${index + 1}. ${asset.name}
${'-'.repeat(50)}
${asset.content}
`).join('\n')}

Style Application:
The visual style from "${masterImageAsset.name}" will be applied to all shots in the ${multiShotAssets.length} multi-shot asset(s) above, creating styled final outputs ready for video generation.
`;

    const combinedTags = Array.from(new Set([
      ...multiShotAssets.flatMap(a => a.tags),
      ...masterImageAsset.tags
    ]));

    const batchStyleAsset: Asset = {
      id: crypto.randomUUID(),
      seedId: crypto.randomUUID(),
      type: 'batch_style',
      name: `Batch Style (${multiShotAssets.length} multi-shot × ${masterImageAsset.name})`,
      content: contentString,
      tags: combinedTags,
      createdAt: new Date(),
      summary: `Applied "${masterImageAsset.name}" style to ${multiShotAssets.length} multi-shot asset(s)`,
      isMaster: true,
      lineage: [...multiShotAssets.map(a => a.id), masterImageAsset.id],
      metadata: structuredContent
    };

    setProject(prev => ({
      ...prev,
      assets: [...prev.assets, batchStyleAsset],
      thirdTimeline: {
        styledShots: [...(prev.thirdTimeline?.styledShots || []), batchStyleAsset],
        videoPrompts: prev.thirdTimeline?.videoPrompts || []
      },
      updatedAt: new Date()
    }));

    setIsBatchStyleModalOpen(false);
    setSelectedMultiShots([]);
    setSelectedMasterImage(null);
    setToastState({
      id: crypto.randomUUID(),
      message: 'Batch style asset created successfully.',
      kind: 'success'
    });
  };

  // Handlers for toggling asset selection
  const handleToggleStoryAsset = (assetId: string) => {
    setSelectedStoryAssets(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleToggleMultiShot = (assetId: string) => {
    setSelectedMultiShots(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectMasterImage = (assetId: string) => {
    setSelectedMasterImage(assetId);
  };

  React.useEffect(() => {
    if (!toastState) return;
    if (typeof window === 'undefined') return;

    const timeout = window.setTimeout(() => {
      setToastState(null);
    }, toastState.allowUndo ? 8000 : 4000);

    return () => window.clearTimeout(timeout);
  }, [toastState, setToastState]);

  const handleDismissToast = useCallback(() => {
    setToastState(null);
  }, [setToastState]);

  const handleRequestDeleteAsset = useCallback((asset: Asset) => {
    setPendingDeleteAsset(asset);
  }, [setPendingDeleteAsset]);

  const performAssetRemoval = useCallback((asset: Asset) => {
    let assetRemoved = false;

    setProject(prev => {
      const existingAsset = prev.assets.find(existing => existing.id === asset.id);
      if (!existingAsset) {
        return prev;
      }

      assetRemoved = true;

      const removedBlocks = prev.primaryTimeline.blocks
        .filter(block => block.assetId === asset.id)
        .map(block => ({ ...block }));

      const remainingBlocks = reindexBlocks(
        prev.primaryTimeline.blocks
          .filter(block => block.assetId !== asset.id)
          .map(block => ({ ...block }))
      );

      const removedFolderAssignments: UndoState['folderAssignments'] = [];
      const updatedFoldersEntries = Object.entries(prev.primaryTimeline.folders).map(([folderKey, blocks]) => {
        const keptBlocks: TimelineBlock[] = [];

        blocks.forEach(block => {
          if (block.assetId === asset.id) {
            removedFolderAssignments.push({ folder: folderKey, block: { ...block } });
          } else {
            keptBlocks.push({ ...block });
          }
        });

        return [folderKey, reindexBlocks(keptBlocks)] as [string, TimelineBlock[]];
      });

      const updatedFolders = Object.fromEntries(updatedFoldersEntries) as typeof prev.primaryTimeline.folders;

      setUndoState({
        asset,
        blocks: removedBlocks,
        folderAssignments: removedFolderAssignments
      });

      return {
        ...prev,
        assets: prev.assets.filter(existing => existing.id !== asset.id),
        primaryTimeline: {
          ...prev.primaryTimeline,
          blocks: remainingBlocks,
          folders: updatedFolders
        },
        updatedAt: new Date()
      };
    });

    if (assetRemoved) {
      setSelectedAssetId(prevSelected => (prevSelected === asset.id ? null : prevSelected));
      setToastState({
        id: crypto.randomUUID(),
        message: `Removed "${asset.name}"`,
        allowUndo: true,
        kind: 'warning'
      });
    }
  }, [setProject, setSelectedAssetId, setToastState, setUndoState]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteAsset) return;
    performAssetRemoval(pendingDeleteAsset);
    setPendingDeleteAsset(null);
  }, [pendingDeleteAsset, performAssetRemoval]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteAsset(null);
  }, [setPendingDeleteAsset]);

  const handleUndoDelete = useCallback(() => {
    if (!undoState) return;

    const stateToRestore = undoState;

    setProject(prev => {
      if (prev.assets.some(existing => existing.id === stateToRestore.asset.id)) {
        return prev;
      }

      const restoredBlocks = restoreBlocksWithPositions(
        prev.primaryTimeline.blocks.map(block => ({ ...block })),
        stateToRestore.blocks
      );

      const assignmentsByFolder = stateToRestore.folderAssignments.reduce((acc, assignment) => {
        if (!acc[assignment.folder]) {
          acc[assignment.folder] = [];
        }
        acc[assignment.folder].push({ ...assignment.block });
        return acc;
      }, {} as Record<string, TimelineBlock[]>);

      const restoredFoldersEntries = Object.entries(prev.primaryTimeline.folders).map(([folderKey, blocks]) => {
        const restoredForFolder = assignmentsByFolder[folderKey] || [];
        delete assignmentsByFolder[folderKey];
        return [
          folderKey,
          restoreBlocksWithPositions(blocks.map(block => ({ ...block })), restoredForFolder)
        ] as [string, TimelineBlock[]];
      });

      Object.entries(assignmentsByFolder).forEach(([folderKey, blocks]) => {
        restoredFoldersEntries.push([
          folderKey,
          restoreBlocksWithPositions([], blocks)
        ]);
      });

      const restoredFolders = Object.fromEntries(restoredFoldersEntries) as typeof prev.primaryTimeline.folders;

      return {
        ...prev,
        assets: [...prev.assets, stateToRestore.asset],
        primaryTimeline: {
          ...prev.primaryTimeline,
          blocks: restoredBlocks,
          folders: restoredFolders
        },
        updatedAt: new Date()
      };
    });

    setUndoState(null);
    setSelectedAssetId(stateToRestore.asset.id);
    setToastState({
      id: crypto.randomUUID(),
      message: `Restored "${stateToRestore.asset.name}"`,
      kind: 'success'
    });
  }, [undoState, setProject, setSelectedAssetId, setToastState]);


  const isDev = Boolean(import.meta.env?.DEV);
  const showMockNotice = isMockMode && !hasDismissedMockNotice;



  const handleGenerate = async () => {
    setGeneratedOutput('');
    setActivePanel('chat');
    setIsGenerating(true);

    try {
      const canvas = {
        nodes: project.primaryTimeline.blocks.map(block => ({
          id: block.id,
          assetId: block.assetId,
          position: { x: 0, y: 0 },
          size: 1
        })),
        connections: []
      };

      const response = await generateFromWorkspace({
        assets: project.assets,
        canvas
      }, _tagWeights, styleRigidity, outputType);

      const outputSections: string[] = [];
      if (response.data) {
        outputSections.push(response.data);
      }
      if (response.error) {
        outputSections.push(`⚠️ ${response.error}`);
      }
      if (!outputSections.length) {
        outputSections.push('No content was returned. Please try again in a moment.');
      }

      setGeneratedOutput(outputSections.join('\n\n---\n\n'));
    } catch (error) {
      if (isDev) {
        console.error('Generation error:', error);
      }
      setGeneratedOutput('An unexpected error occurred while generating content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!message.trim()) return null;

    // Add user message
    const userMessage: Message = {
      role: ChatRole.USER,
      content: message
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [...chatMessages, userMessage].map(msg => ({
        role: msg.role === ChatRole.USER ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      const response = await generateSandboxResponse(
        message,
        conversationHistory,
        _tagWeights,
        styleRigidity
      );

      setChatMessages(prev => {
        const next = [...prev];
        if (response.data) {
          next.push({ role: ChatRole.MODEL, content: response.data });
        }
        if (response.error) {
          next.push({ role: ChatRole.MODEL, content: `⚠️ ${response.error}` });
        }
        if (!response.data && !response.error) {
          next.push({
            role: ChatRole.MODEL,
            content: 'I did not receive a response from Gemini. Please try again.'
          });
        }
        return next;
      });

      if (response.error) {
        return null;
      }

      return response.data ?? null;
    } catch (error) {
      if (isDev) {
        console.error('Chat error:', error);
      }
      setChatMessages(prev => [...prev, {
        role: ChatRole.MODEL,
        content: 'Sorry, I encountered an unexpected error while processing your message.'
      }]);
      return null;
    } finally {
      setIsChatLoading(false);
    }
  }, [chatMessages, _tagWeights, styleRigidity, isDev]);

  const handleRequestFieldSuggestion = useCallback(async ({
    assetId,
    fieldKey,
    fieldLabel,
    currentValue
  }: {
    assetId: string;
    fieldKey: string;
    fieldLabel: string;
    currentValue: string;
  }) => {
    const asset = project.assets.find(existing => existing.id === assetId);
    const assetName = asset?.name || 'Unnamed asset';
    const assetType = asset?.type?.replace('_', ' ') || 'asset';

    const formattedValue = currentValue?.trim()
      ? currentValue.trim()
      : 'This field is currently empty.';

    const prompt = [
      'You are helping edit a creative project asset.',
      `Asset name: ${assetName}`,
      `Asset type: ${assetType}`,
      `Field key: ${fieldKey}`,
      `Field label: ${fieldLabel}`,
      'Current value:',
      formattedValue,
      '',
      'Suggest an improved replacement for this field that preserves intent, is concise, and formatted as plain text only. Do not include explanations or extra commentary.'
    ].join('\n');

    const suggestion = await handleSendMessage(prompt);
    return suggestion ? suggestion.trim() : null;
  }, [handleSendMessage, project.assets]);

  const handleUpdateAsset = useCallback((assetId: string, updates: Partial<Asset>) => {
    setProject(prev => ({
      ...prev,
      assets: prev.assets.map(asset =>
        asset.id === assetId ? { ...asset, ...updates } : asset
      ),
      updatedAt: new Date()
    }));
  }, [setProject]);

  const handleAssetDropOnTimeline = useCallback((templateType: string, folder?: string) => {
    // Create new asset from template
    const template = ASSET_TEMPLATES[templateType];
    if (!template) return;

    // Map template type to Asset type
    const typeMap: Record<string, Asset['type']> = {
      'character': 'master_story',
      'plot_point': 'master_story',
      'scene': 'master_story',
      'image_input': 'master_image',
      'camera_settings': 'shot',
      'depth_of_field': 'shot',
      'lighting_setup': 'shot',
      'color_grading': 'shot',
      'audio_design': 'shot',
      'vfx_compositing': 'shot'
    };

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      seedId: crypto.randomUUID(),
      type: typeMap[template.type] || 'shot',
      name: template.name,
      content: template.defaultContent || '',
      tags: template.tags || [],
      createdAt: new Date(),
      summary: template.description,
      isMaster: template.type.includes('master') || template.type.includes('output'),
      lineage: []
    };

    // Determine which folder the block should be added to.
    let actualTargetFolder: string;
    if (folder === 'combined') {
      actualTargetFolder = template.category === 'story' ? 'story' : 'image';
    } else {
      const requestedFolder = folder || 'story';
      const isTextToVideoRedirect = requestedFolder === 'text_to_video';
      actualTargetFolder = isTextToVideoRedirect ? 'image' : requestedFolder;
    }
    const foldersRecord = project.primaryTimeline.folders as Record<string, TimelineBlock[]>;
    const existingBlocks = foldersRecord[actualTargetFolder] || [];

    const newBlock: TimelineBlock = {
      id: crypto.randomUUID(),
      assetId: newAsset.id,
      position: existingBlocks.length,
      isExpanded: false,
      createdAt: new Date()
    };

    setProject(prev => {
      const prevFolders = prev.primaryTimeline.folders as Record<string, TimelineBlock[]>;
      const targetBlocks = prevFolders[actualTargetFolder] || [];
      const updatedFolders: Record<string, TimelineBlock[]> = {
        ...prevFolders,
        [actualTargetFolder]: [...targetBlocks, newBlock]
      };

      if (folder === 'text_to_video' && prevFolders.text_to_video) {
        // Preserve any existing text_to_video blocks instead of clearing them.
        updatedFolders.text_to_video = prevFolders.text_to_video;
      }

      return {
        ...prev,
        assets: [...prev.assets, newAsset],
        primaryTimeline: {
          ...prev.primaryTimeline,
          blocks: [...prev.primaryTimeline.blocks, newBlock],
          folders: updatedFolders as typeof prev.primaryTimeline.folders
        },
        updatedAt: new Date()
      };
    });
  }, [setProject, project.primaryTimeline.folders]);

  const handleGenerateOutput = useCallback((folder: string) => {
    // Generate output from the specified folder
    const folderBlocks = project.primaryTimeline.folders[folder as keyof typeof project.primaryTimeline.folders];
    if (folderBlocks.length === 0) return;

    // Only consider story folder blocks for master asset (multi-shot)
    if (folder !== 'story') {
      // For non-story folders, fallback to previous behavior (first asset)
      const firstAsset = project.assets.find(a => a.id === folderBlocks[0].assetId);
      if (!firstAsset) return;

      const masterAsset: Asset = {
        id: crypto.randomUUID(),
        seedId: crypto.randomUUID(),
        type: folder === 'image' ? 'master_image' : 'master_video',
        name: `Master ${folder.charAt(0).toUpperCase() + folder.slice(1)}`,
        content: firstAsset.content,
        tags: firstAsset.tags,
        createdAt: new Date(),
        summary: `Generated master ${folder} from user inputs`,
        isMaster: true,
        lineage: folderBlocks.map(b => b.assetId)
      };

      setProject(prev => ({
        ...prev,
        assets: [...prev.assets, masterAsset],
        secondaryTimeline: {
          masterAssets: [...(prev.secondaryTimeline?.masterAssets || []), masterAsset],
          shotLists: prev.secondaryTimeline?.shotLists || [],
          appliedStyles: prev.secondaryTimeline?.appliedStyles || {}
        },
        updatedAt: new Date()
      }));

      // Navigate to secondary timeline after generation
      setActivePanel('timeline');
      setActiveTimeline('secondary');
      return;
    }

    // For story folder, combine all story assets content and tags
    const storyAssets = folderBlocks
      .map(b => project.assets.find(a => a.id === b.assetId))
      .filter((a): a is Asset => a !== undefined);

    const combinedContent = storyAssets.map(a => a.content).join('\n\n');
    const combinedTags = Array.from(new Set(storyAssets.flatMap(a => a.tags)));

    const masterAsset: Asset = {
      id: crypto.randomUUID(),
      seedId: crypto.randomUUID(),
      type: 'master_story',
      name: 'Multi-Shot',
      content: combinedContent,
      tags: combinedTags,
      createdAt: new Date(),
      summary: 'Generated multi-shot from story assets',
      isMaster: true,
      lineage: storyAssets.map(a => a.id)
    };

    setProject(prev => ({
      ...prev,
      assets: [...prev.assets, masterAsset],
      secondaryTimeline: {
        masterAssets: [...(prev.secondaryTimeline?.masterAssets || []), masterAsset],
        shotLists: prev.secondaryTimeline?.shotLists || [],
        appliedStyles: prev.secondaryTimeline?.appliedStyles || {}
      },
      updatedAt: new Date()
    }));

    // Navigate to secondary timeline after generation
    setActivePanel('timeline');
    setActiveTimeline('secondary');
  }, [setProject, project.primaryTimeline.folders, project.assets, setActivePanel, setActiveTimeline]);

  const handleCreateShots = useCallback((assetId: string) => {
    // Create shots from the selected master asset
    const asset = project.assets.find(a => a.id === assetId);
    if (!asset) return;

    // For now, create a simple shot based on the master asset
    const shotAsset: Asset = {
      id: crypto.randomUUID(),
      seedId: crypto.randomUUID(),
      type: 'shot',
      name: `Shot from ${asset.name}`,
      content: asset.content,
      tags: asset.tags,
      createdAt: new Date(),
      summary: `Generated shot from ${asset.name}`,
      isMaster: false,
      lineage: [assetId]
    };

    setProject(prev => ({
      ...prev,
      assets: [...prev.assets, shotAsset],
      thirdTimeline: {
        styledShots: [...(prev.thirdTimeline?.styledShots || []), shotAsset],
        videoPrompts: prev.thirdTimeline?.videoPrompts || []
      },
      updatedAt: new Date()
    }));

    // Navigate to third timeline
    setActivePanel('timeline');
    setActiveTimeline('third');
  }, [project.assets, setProject, setActivePanel, setActiveTimeline]);

  const syncAssetsToMcp = async () => {
    setIsMcpLoading(true);
    try {
      await createCollection('project_assets');
      const documents = project.assets.map(asset => asset.content);
      const metadatas = project.assets.map(asset => ({ name: asset.name, type: asset.type, tags: asset.tags }));
      const ids = project.assets.map(asset => asset.id);
      await addDocuments('project_assets', documents, metadatas, ids);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Assets synced to MCP successfully',
        kind: 'success'
      });
    } catch (error) {
      console.error('Failed to sync assets to MCP:', error);
      setToastState({
        id: crypto.randomUUID(),
        message: 'Unable to save',
        kind: 'warning'
      });
    } finally {
      setIsMcpLoading(false);
    }
  };



  return (
    <div className="h-screen flex flex-col">
      <header className="workspace-header relative flex-shrink-0 z-10 px-6 py-6 md:px-10 md:py-8 overflow-hidden rounded-3xl">
        <div className="pointer-events-none absolute inset-0 bg-white/10 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.08)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <FracturedLoopLogo className="w-10 h-10" />
              <span className="text-3xl md:text-4xl font-black uppercase tracking-[0.45em] text-[hsl(var(--ink))]">
                {appLabel}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--foreground)/0.7)] md:text-sm">
              Idea · Prompt · Visualisation
            </p>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-center">
            <nav className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActivePanel('chat')}
                className={`glass-nav-button ${activePanel === 'chat' ? 'is-active' : ''}`}
                aria-pressed={activePanel === 'chat'}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                <span className="uppercase tracking-[0.2em] text-xs font-semibold md:text-sm">Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('timeline')}
                className={`glass-nav-button ${activePanel === 'timeline' ? 'is-active' : ''}`}
                aria-pressed={activePanel === 'timeline'}
              >
                <MagicWandIcon className="w-5 h-5" />
                <span className="uppercase tracking-[0.2em] text-xs font-semibold md:text-sm">Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReferenceViewerOpen(true)}
                className="glass-nav-button"
                aria-haspopup="dialog"
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span className="uppercase tracking-[0.2em] text-xs font-semibold md:text-sm">Reference</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUserGuideOpen(true)}
                className="glass-nav-button"
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
                <span className="uppercase tracking-[0.2em] text-xs font-semibold md:text-sm">Help</span>
              </button>
              <button
                type="button"
                onClick={() => setIsApiConfigOpen(true)}
                className="glass-nav-button"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="uppercase tracking-[0.2em] text-xs font-semibold md:text-sm">API</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
          <div className="flex-shrink-0 w-full lg:w-[19rem]">
            <div className="h-full min-h-0">
              <AssetLibraryPanel 
                onAddAsset={handleAssetDropOnTimeline}
              />
            </div>
          </div>

          <div className="min-h-0 h-full flex-1 flex flex-col overflow-y-auto custom-scrollbar lg:mr-[20rem]">
            <div className="flex h-full min-h-0 w-full">
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 min-h-0 flex flex-col">
                  {activePanel === 'timeline' && (
              <div className="flex-1 min-h-0 w-full overflow-y-auto">
                <SimpleTimelineView
                  project={project}
                  selectedAssetId={selectedAssetId}
                  setSelectedAssetId={setSelectedAssetId}
                  onAssetDrop={handleAssetDropOnTimeline}
                  onGenerateOutput={handleGenerateOutput}
                  onGenerate={handleGenerate}
                  isWeightingEnabled={isWeightingEnabled}
                  onWeightingToggle={onWeightingToggle}
                  styleRigidity={styleRigidity}
                  onStyleRigidityChange={onStyleRigidityChange}
                  activeTimeline={activeTimeline}
                  setActiveTimeline={setActiveTimeline}
                  onCreateShots={handleCreateShots}
                  selectedAssetIdForShots={selectedAssetIdForShots}
                  setSelectedAssetIdForShots={setSelectedAssetIdForShots}
                  isCreateShotsModalOpen={isCreateShotsModalOpen}
                  setIsCreateShotsModalOpen={setIsCreateShotsModalOpen}
                />
              </div>
            )}

            {activePanel === 'chat' && (
              <div className="flex-1 min-h-0 w-full overflow-y-auto">
                <ChatAssistant
                  messages={chatMessages}
                  isLoading={isChatLoading}
                  generatedOutput={generatedOutput}
                  onSendMessage={handleSendMessage}
                  project={project}
                  showMockNotice={showMockNotice}
                  onDismissMockNotice={() => setHasDismissedMockNotice(true)}
                  onCreateAsset={(asset) => {
                    setProject(prev => ({
                      ...prev,
                      assets: [...prev.assets, asset],
                      updatedAt: new Date()
                    }));
                  }}
                  onUpdateAsset={handleUpdateAsset}
                />
              </div>
            )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-full lg:fixed lg:right-6 lg:top-[14rem] lg:bottom-6 lg:w-[19rem] h-full flex flex-col gap-6">
            {selectedAssetId && (
              <div className="flex-shrink-0 max-h-128 overflow-hidden">
                <AssetDetailsPanel
                  selectedAssetId={selectedAssetId}
                  project={project}
                  onUpdateAsset={handleUpdateAsset}
                  onDeleteAsset={handleRequestDeleteAsset}
                  onClose={() => setSelectedAssetId(null)}
                  onRequestSuggestion={handleRequestFieldSuggestion}
                />
              </div>
            )}

            <div className="flex-shrink-0 h-64 overflow-hidden">
              <MultiShotPanel
                assets={project.assets}
                onCreateMultiShot={() => setIsMultiShotModalOpen(true)}
              />
            </div>

            <div className="flex-shrink-0 h-64 overflow-hidden">
              <BatchStylePanel
                assets={project.assets}
                onCreateBatchStyle={() => setIsBatchStyleModalOpen(true)}
              />
            </div>

            <div className="flex-shrink-0 h-80 overflow-hidden">
              <FinalInputsPanel assets={project.assets} />
            </div>

            <div className="min-h-0 flex-1">
              <ControlPanel
                tagWeights={_tagWeights}
                onTagWeightChange={_onTagWeightChange}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onSyncAssetsToMcp={syncAssetsToMcp}
                isMcpLoading={isMcpLoading}
              />
            </div>
          </div>
        </div>
      </main>

      {isReferenceViewerOpen && (
        <React.Suspense
          fallback={(
            <div className="fixed inset-0 z-[65] flex items-center justify-center bg-gray-950/70 backdrop-blur">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gray-900/90 px-6 py-4 text-sm text-gray-200">
                <SparklesIcon className="h-5 w-5 animate-pulse text-indigo-200" title="Loading" />
                <span>Loading reference library…</span>
              </div>
            </div>
          )}
        >
          <ReferenceViewer
            isOpen={isReferenceViewerOpen}
            onClose={() => setIsReferenceViewerOpen(false)}
          />
        </React.Suspense>
      )}

      {isUserGuideOpen && (
        <UserGuide
          isOpen={isUserGuideOpen}
          onClose={() => setIsUserGuideOpen(false)}
        />
      )}

      {isApiConfigOpen && (
        <ApiConfig
          isOpen={isApiConfigOpen}
          onClose={() => setIsApiConfigOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDeleteAsset)}
        title="Delete asset?"
        description={pendingDeleteAsset
          ? `Removing "${pendingDeleteAsset.name}" will clear it from all timelines. You can undo shortly after.`
          : 'Removing this asset will clear it from all timelines. You can undo shortly after.'}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <MultiShotCreationModal
        isOpen={isMultiShotModalOpen}
        assets={project.assets}
        selectedAssets={selectedStoryAssets}
        onToggleAsset={handleToggleStoryAsset}
        onConfirm={createMultiShotAsset}
        onCancel={() => {
          setIsMultiShotModalOpen(false);
          setSelectedStoryAssets([]);
        }}
      />

      <BatchStyleModal
        isOpen={isBatchStyleModalOpen}
        assets={project.assets}
        selectedMultiShots={selectedMultiShots}
        selectedMasterImage={selectedMasterImage}
        onToggleMultiShot={handleToggleMultiShot}
        onSelectMasterImage={handleSelectMasterImage}
        onConfirm={createBatchStyleAsset}
        onCancel={() => {
          setIsBatchStyleModalOpen(false);
          setSelectedMultiShots([]);
          setSelectedMasterImage(null);
        }}
      />

      <ToastNotification
        toast={toastState}
        onDismiss={handleDismissToast}
        onUndo={toastState?.allowUndo ? handleUndoDelete : undefined}
      />
    </div>
  );
};

export default Workspace;
