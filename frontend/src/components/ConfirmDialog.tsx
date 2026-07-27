import { ReactNode, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmVariant =
    variant === 'destructive'
      ? 'coral'
      : variant === 'warning'
      ? 'primary'
      : 'sage';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-ink/10">
        <div className="flex items-start justify-between p-5 border-b border-ink/10">
          <div className="flex items-start gap-3">
            {variant === 'destructive' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-coral/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-coral" aria-hidden="true" />
              </div>
            ) : variant === 'warning' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-marigold/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-marigold" aria-hidden="true" />
              </div>
            ) : null}
            <div>
              <h2 id="confirm-dialog-title" className="font-display text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-ink/60 mt-1">{description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-ink/40 hover:text-ink hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-indigo"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 bg-sand/40">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant as 'sage' | 'primary' | 'coral'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
