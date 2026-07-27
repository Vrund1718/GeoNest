import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const inputBaseClasses = `w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent transition-all duration-150 ease-out hover:border-indigo hover:shadow-sm motion-reduce:transition-none`;

export const FormField = ({
  label,
  error,
  className = '',
  type = 'text',
  value,
  onChange,
  ...props
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleTelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      const newValue = e.target.value.replace(/\D/g, '').slice(0, 10);
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: newValue,
        },
      };
      onChange(syntheticEvent);
    }
  };

  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={type === 'tel' ? handleTelChange : onChange}
          className={`${inputBaseClasses} ${
            error ? 'border-coral' : 'border-ink/20'
          } ${className} ${type === 'password' ? 'pr-12' : ''}`}
          {...props}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink focus:outline-none focus:ring-2 focus:ring-indigo rounded"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-coral text-xs mt-1" role="alert">{error}</p>}
    </div>
  );
};

export const SelectField = ({ label, error, className = '', ...props }: SelectFieldProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-ink mb-1">
      {label}
    </label>
    <select
      className={`${inputBaseClasses} ${
        error ? 'border-coral' : 'border-ink/20'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-coral text-xs mt-1" role="alert">{error}</p>}
  </div>
);

export const TextareaField = ({ label, error, className = '', ...props }: TextareaFieldProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-ink mb-1">
      {label}
    </label>
    <textarea
      className={`${inputBaseClasses} resize-y min-h-[100px] ${
        error ? 'border-coral' : 'border-ink/20'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-coral text-xs mt-1" role="alert">{error}</p>}
  </div>
);
