import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { inputClassName } from '../lib/styles';
import { useToast } from '../toast/useToast';

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
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
      await register({ email, password });
      showToast('Account created. Welcome to Snip.', 'success');
      void navigate('/', { replace: true });
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
      title="Create your account"
      subtitle="Start shortening links and measuring every click."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:underline"
          >
            Sign in
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

        <Field
          id="password"
          label="Password"
          error={errors.password}
          hint="Use at least 8 characters."
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={inputClassName(Boolean(errors.password))}
            placeholder="Create a password"
            required
            minLength={8}
          />
        </Field>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
