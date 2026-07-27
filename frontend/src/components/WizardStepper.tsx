interface WizardStepperProps {
  steps: number;
  currentStep: number;
  labels?: string[];
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  className?: string;
}

export const WizardStepper = ({
  steps,
  currentStep,
  labels,
  onPrev: _onPrev,
  onNext: _onNext,
  canPrev: _canPrev = true,
  canNext: _canNext = true,
  className = '',
}: WizardStepperProps) => {
  const stepNumbers = Array.from({ length: steps }, (_, i) => i + 1);

  const getStepClass = (step: number) => {
    if (step < currentStep) {
      return 'bg-sage text-sand border-sage';
    }
    if (step === currentStep) {
      return 'bg-marigold text-ink border-marigold ring-4 ring-marigold/20';
    }
    return 'bg-transparent text-indigo border-indigo/40';
  };

  const getConnectorClass = (step: number) => {
    if (step < currentStep) {
      return 'bg-sage';
    }
    return 'bg-indigo/20';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between w-full mb-2">
        {stepNumbers.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-display font-semibold transition-all duration-150 ease-out motion-reduce:transition-none ${getStepClass(step)}`}
                aria-current={step === currentStep ? 'step' : undefined}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {labels && labels[i] && (
                <span className={`mt-2 text-xs font-medium hidden sm:block max-w-[80px] text-center ${
                  step <= currentStep ? 'text-ink' : 'text-ink/50'
                }`}>
                  {labels[i]}
                </span>
              )}
            </div>
            {i < stepNumbers.length - 1 && (
              <div className={`flex-1 h-1 mx-2 -mt-6 rounded transition-all duration-150 ease-out motion-reduce:transition-none ${getConnectorClass(step)}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
