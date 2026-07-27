import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = genId();
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const isError = t.variant === 'error';
          const isSuccess = t.variant === 'success';
          const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;
          const accentColor = isSuccess
            ? 'sage'
            : isError
            ? 'coral'
            : 'indigo';
          return (
            <div
              key={t.id}
              role={isError ? 'alert' : 'status'}
              className="pointer-events-auto bg-white shadow-xl rounded-xl border border-ink/10 overflow-hidden"
              style={{
                borderLeft: `4px solid var(--tw-${accentColor})`,
              }}
            >
              <div
                className={`flex items-start gap-3 p-4 border-l-4 ${
                  isSuccess
                    ? 'border-l-sage'
                    : isError
                    ? 'border-l-coral'
                    : 'border-l-indigo'
                }`}
              >
                <div
                  className={`flex-shrink-0 mt-0.5 ${
                    isSuccess
                      ? 'text-sage'
                      : isError
                      ? 'text-coral'
                      : 'text-indigo'
                  }`}
                >
                  <Icon size={20} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-sm leading-snug">{t.title}</p>
                  {t.message && (
                    <p className="text-xs text-ink/60 mt-0.5 leading-relaxed">
                      {t.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="flex-shrink-0 p-1 rounded-md text-ink/30 hover:text-ink hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-indigo"
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
