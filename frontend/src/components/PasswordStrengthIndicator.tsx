interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const evaluateStrength = (pwd: string) => {
    let score = 0;

    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    let label: string;
    let color: string;

    if (score <= 2) {
      label = 'Weak';
      color = 'bg-coral';
    } else if (score === 3) {
      label = 'Medium';
      color = 'bg-marigold';
    } else if (score === 4) {
      label = 'Strong';
      color = 'bg-indigo';
    } else {
      label = 'Very Strong';
      color = 'bg-sage';
    }

    const width = `${(score / 5) * 100}%`;

    return { label, color, width };
  };

  const { label, color, width } = evaluateStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium ${
          label === 'Weak' ? 'text-coral' :
          label === 'Medium' ? 'text-marigold' :
          label === 'Strong' ? 'text-indigo' : 'text-sage'
        }`}>
          {label}
        </span>
      </div>
      <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${color}`}
          style={{ width }}
        />
      </div>
    </div>
  );
};
