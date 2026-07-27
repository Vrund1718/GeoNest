import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import { PasswordStrengthIndicator } from '../../components/PasswordStrengthIndicator';
import { z } from 'zod';
import { ApiError } from '../../services/api';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setIsLoading(true);

    try {
      const data = signupSchema.parse({
        name,
        email,
        password,
        confirmPassword,
      });
      await register(data.name, data.email, data.password);
    } catch (err: any) {
      console.error('[Signup] Error:', err);
      if (err.name === 'ZodError') {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue: any) => {
          fieldErrors[issue.path[0]] = issue.message;
        });
        setErrors(fieldErrors);
      } else if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="h-2 bg-marigold"></div>
        <div className="p-8">
          <h1 className="font-display text-3xl font-bold text-ink mb-2 text-center">
            Create Account
          </h1>
          <p className="text-ink/60 text-center mb-8">
            Join GeoNest today
          </p>

          {generalError && (
            <div className="bg-coral/10 border border-coral/30 text-coral px-4 py-3 rounded mb-4">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FormField
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <FormField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <div>
              <FormField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <PasswordStrengthIndicator password={password} />
            </div>
            <FormField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-ink/60">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-indigo font-medium hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
