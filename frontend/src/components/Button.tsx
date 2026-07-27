import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'sage' | 'coral';
}

export const Button = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) => {
  const baseClasses =
    'font-medium rounded-lg px-4 py-2 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-[2px] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none';
  const variantClasses: Record<string, string> = {
    primary:
      'bg-marigold text-ink hover:bg-marigold/90 focus:ring-marigold shadow-md hover:shadow-xl',
    secondary:
      'bg-white text-ink border border-indigo/30 hover:bg-sand focus:ring-indigo hover:border-indigo',
    sage:
      'bg-sage text-sand hover:bg-sage/90 focus:ring-sage shadow-md hover:shadow-xl',
    coral:
      'bg-coral text-sand hover:bg-coral/90 focus:ring-coral shadow-md hover:shadow-xl',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
