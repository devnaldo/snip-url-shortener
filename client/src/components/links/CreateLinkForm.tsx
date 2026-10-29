import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, fieldErrors } from '../../api/client';
import { linksApi } from '../../api/links';
import type { CreateLinkInput, LinkDto } from '../../api/types';
import { fieldDescribedBy } from '../../lib/a11y';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/format';
import { inputClassName } from '../../lib/styles';
import { useToast } from '../../toast/useToast';
import { Button } from '../Button';
import { Field } from '../Field';
import { AlertIcon, PlusIcon } from '../Icons';

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
      aria-labelledby="create-link-heading"
      className="mx-auto w-full max-w-2xl rounded-lg border border-line bg-surface xl:sticky xl:top-20 xl:mx-0 xl:max-w-none"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2
          id="create-link-heading"
          className="font-display text-[0.75rem] uppercase tracking-[0.06em] text-ink"
        >
          New link
        </h2>
        <span aria-hidden="true" className="font-terminal text-sm leading-none text-subtle">
          01
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[0.6875rem] leading-relaxed text-muted">
          Paste a destination. Alias and expiry are optional.
        </p>

        <form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[0.6875rem] leading-relaxed text-danger"
            >
              <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
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
              aria-describedby={fieldDescribedBy('destinationUrl', {
                hint: true,
                error: Boolean(errors.destinationUrl),
              })}
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
              aria-describedby={fieldDescribedBy('alias', {
                hint: true,
                error: Boolean(errors.alias),
              })}
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
              aria-describedby={fieldDescribedBy('expiresAt', {
                hint: true,
                error: Boolean(errors.expiresAt),
              })}
              className={inputClassName(Boolean(errors.expiresAt))}
            />
          </Field>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <PlusIcon className="h-3.5 w-3.5" />
            Create short link
          </Button>
        </form>
      </div>
    </section>
  );
}
