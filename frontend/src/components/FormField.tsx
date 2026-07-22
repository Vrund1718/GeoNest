import { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const FormField = ({ label, error, className = '', ...props }: FormFieldProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-ink-black mb-1">
      {label}
    </label>
    <input
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chai-cup focus:border-transparent ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export const SelectField = ({ label, error, className = '', ...props }: SelectFieldProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-ink-black mb-1">
      {label}
    </label>
    <select
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chai-cup focus:border-transparent ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);
