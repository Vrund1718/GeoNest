import React, { useState, forwardRef, InputHTMLAttributes } from 'react';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: React.ReactNode;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5.5 19 2 12 2 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, id, className = '', placeholder, disabled, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    const inputId = id || `pwd-${Math.random().toString(36).slice(2, 8)}`;
    const toggleId = `${inputId}-toggle`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
            {error && <span className="text-coral font-normal ml-2 text-xs">{error}</span>}
          </label>
        )}
        <div className="relative">
          <input
            {...rest}
            ref={ref}
            id={inputId}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`input pr-12 ${error ? 'border-coral/60 focus:ring-coral/30 focus:border-coral' : ''} ${className}`}
          />
          <button
            type="button"
            id={toggleId}
            tabIndex={disabled ? -1 : 0}
            disabled={disabled}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            aria-controls={inputId}
            className="absolute top-1/2 right-2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md text-ink/60 hover:text-ink hover:bg-sand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
          >
            <span className="sr-only">{show ? 'Hide password' : 'Show password'}</span>
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-coral">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-[11px] text-ink/50 leading-relaxed">{hint}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
