import React from 'react';

type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastState {
  id: string;
  message: string;
  allowUndo?: boolean;
  kind?: ToastKind;
}

interface ToastNotificationProps {
  toast: ToastState | null;
  onDismiss: () => void;
  onUndo?: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss, onUndo }) => {
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
