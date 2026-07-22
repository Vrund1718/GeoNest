import { InputHTMLAttributes, SelectHTMLAttributes, useState } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

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
      // Allow only digits
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
      <label className="block text-sm font-medium text-ink-black mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={type === 'tel' ? handleTelChange : onChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chai-cup focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className} ${type === 'password' ? 'pr-12' : ''}`}
          {...props}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-ink-black focus:outline-none"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

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
