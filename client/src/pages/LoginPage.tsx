import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { inputClassName } from '../lib/styles';
import { useToast } from '../toast/useToast';

interface LocationState {
  from?: string;
}

function redirectTarget(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return '/';
  }

  const from = (state as LocationState).from;

  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }

  return '/';
}

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFieldError(field: string) {
    setErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      showToast('Welcome back.', 'success');
      void navigate(redirectTarget(location.state), { replace: true });
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);

      if (Object.keys(fields).length === 0) {
        setFormError(errorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your links and see how they perform."
      footer={
        <>
          New to Snip?{' '}
          <Link
            to="/register"
            className="font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {formError}
          </div>
        ) : null}

        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={inputClassName(Boolean(errors.email))}
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field id="password" label="Password" error={errors.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={inputClassName(Boolean(errors.password))}
            placeholder="Your password"
            required
          />
        </Field>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
