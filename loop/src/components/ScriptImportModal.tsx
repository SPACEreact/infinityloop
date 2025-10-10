import React, { useEffect, useId, useRef, useState } from 'react';

interface ScriptImportResult {
  importedScenes: number;
  sceneTitles: string[];
}

interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (script: string) => ScriptImportResult | null;
}

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [scriptText, setScriptText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialogNode = dialogRef.current;
    if (!dialogNode) {
      return;
    }

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const focusableElements = Array.from(
      dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => !element.hasAttribute('disabled'));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
      (textareaRef.current || focusableElements[0])?.focus();
    }, 0);

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setScriptText('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = scriptText.trim();

    if (!trimmed) {
      setErrorMessage('Paste your screenplay text before importing.');
      return;
    }

    const result = onImport(trimmed);
    if (!result) {
      setErrorMessage('No scenes were detected. Ensure your script uses sluglines like "INT." or "EXT.".');
      return;
    }

    setErrorMessage(null);
    setScriptText('');
    onClose();
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
        style={{ maxWidth: '720px', width: '95vw', maxHeight: '90vh' }}
      >
        <div className="glass-modal__header">
          <h2 id={titleId} className="glass-modal__title ink-strong">
            Import Script to Timeline
          </h2>
          <p id={descriptionId} className="glass-modal__description">
            Paste a screenplay segment and Loop will create story timeline scenes using your sluglines, character names, and dialogue.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold ink-strong">Screenplay Text</span>
            <textarea
              ref={textareaRef}
              value={scriptText}
              onChange={event => setScriptText(event.target.value)}
              rows={12}
              className="w-full rounded-lg border border-indigo-500/40 bg-slate-950/80 p-3 text-sm text-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 custom-scrollbar"
              placeholder={'Example:\nINT. APARTMENT - NIGHT\nJANE paces the room...'}
            />
          </label>

          <div className="rounded-lg border border-indigo-500/30 bg-slate-900/60 p-3 text-xs leading-relaxed ink-subtle">
            <p className="font-semibold text-indigo-100 mb-2">Tips</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use standard sluglines (e.g., INT./EXT.) so scenes can be detected.</li>
              <li>Only the pasted text will be imported—perfect for incremental updates.</li>
              <li>Each detected scene becomes a story asset you can edit in the timeline.</li>
            </ul>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="glass-modal__actions">
            <button type="submit" className="modal-button modal-button--primary">
              Import Scenes
            </button>
            <button
              type="button"
              className="modal-button modal-button--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptImportModal;
