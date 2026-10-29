import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, fieldErrors } from '../../api/client';
import { linksApi } from '../../api/links';
import type { CreateLinkInput, LinkDto } from '../../api/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/format';
import { inputClassName } from '../../lib/styles';
import { useToast } from '../../toast/useToast';
import { Button } from '../Button';
import { Field } from '../Field';

interface CreateLinkFormProps {
  onCreated: (link: LinkDto) => void;
}

export function CreateLinkForm({ onCreated }: CreateLinkFormProps) {
  const { showToast } = useToast();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
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

    const payload: CreateLinkInput = { destinationUrl: destinationUrl.trim() };

    if (alias.trim()) {
      payload.alias = alias.trim();
    }

    if (expiresAt) {
      const iso = fromDateTimeLocalValue(expiresAt);

      if (iso) {
        payload.expiresAt = iso;
      }
    }

    try {
      const link = await linksApi.create(payload);
      setDestinationUrl('');
      setAlias('');
      setExpiresAt('');
      showToast('Short link created.', 'success');
      onCreated(link);
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
    <section
      id="create-link"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-20"
    >
      <h2 className="text-base font-semibold text-slate-900">Create a link</h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste a destination and optionally choose your own alias and expiry.
      </p>

      <form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {formError}
          </div>
        ) : null}

        <Field
          id="destinationUrl"
          label="Destination URL"
          error={errors.destinationUrl}
          hint="Only http:// and https:// links are allowed."
        >
          <input
            id="destinationUrl"
            name="destinationUrl"
            type="text"
            inputMode="url"
            value={destinationUrl}
            onChange={(event) => {
              setDestinationUrl(event.target.value);
              clearFieldError('destinationUrl');
            }}
            aria-invalid={errors.destinationUrl ? true : undefined}
            aria-describedby={errors.destinationUrl ? 'destinationUrl-error' : undefined}
            className={inputClassName(Boolean(errors.destinationUrl))}
            placeholder="https://example.com/very/long/url"
            autoComplete="off"
            required
          />
        </Field>

        <Field
          id="alias"
          label="Custom alias"
          error={errors.alias}
          optional
          hint="3–32 letters, numbers, hyphens, or underscores."
        >
          <input
            id="alias"
            name="alias"
            type="text"
            value={alias}
            onChange={(event) => {
              setAlias(event.target.value);
              clearFieldError('alias');
            }}
            aria-invalid={errors.alias ? true : undefined}
            aria-describedby={errors.alias ? 'alias-error' : undefined}
            className={inputClassName(Boolean(errors.alias))}
            placeholder="launch-2026"
            autoComplete="off"
          />
        </Field>

        <Field
          id="expiresAt"
          label="Expires"
          error={errors.expiresAt}
          optional
          hint="Leave empty for a link that never expires."
        >
          <input
            id="expiresAt"
            name="expiresAt"
            type="datetime-local"
            value={expiresAt}
            min={toDateTimeLocalValue(new Date().toISOString())}
            onChange={(event) => {
              setExpiresAt(event.target.value);
              clearFieldError('expiresAt');
            }}
            aria-invalid={errors.expiresAt ? true : undefined}
            aria-describedby={errors.expiresAt ? 'expiresAt-error' : undefined}
            className={inputClassName(Boolean(errors.expiresAt))}
          />
        </Field>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create short link
        </Button>
      </form>
    </section>
  );
}
