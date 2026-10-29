import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, fieldErrors } from '../../api/client';
import { linksApi } from '../../api/links';
import type { LinkDto } from '../../api/types';
import { fieldDescribedBy } from '../../lib/a11y';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/format';
import { inputClassName } from '../../lib/styles';
import { useToast } from '../../toast/useToast';
import { Button } from '../Button';
import { Field } from '../Field';
import { AlertIcon } from '../Icons';
import { Modal } from '../Modal';

interface EditLinkModalProps {
  link: LinkDto;
  onClose: () => void;
  onSaved: (link: LinkDto) => void;
}

export function EditLinkModal({ link, onClose, onSaved }: EditLinkModalProps) {
  const { showToast } = useToast();
  const [destinationUrl, setDestinationUrl] = useState(link.destinationUrl);
  const [expiresAt, setExpiresAt] = useState(toDateTimeLocalValue(link.expiresAt));
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
      const updated = await linksApi.update(link.id, {
        destinationUrl: destinationUrl.trim(),
        expiresAt: fromDateTimeLocalValue(expiresAt),
      });
      showToast('Link updated.', 'success');
      onSaved(updated);
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      setFormError(Object.keys(fields).length === 0 ? errorMessage(error) : (fields._root ?? null));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${link.alias}`}
      description="Update the destination or expiry. The short link itself does not change."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-link-form" size="sm" isLoading={isSubmitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-link-form"
        className="space-y-4"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[0.6875rem] leading-relaxed text-danger"
          >
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <Field id="edit-destinationUrl" label="Destination URL" error={errors.destinationUrl}>
          <input
            id="edit-destinationUrl"
            name="destinationUrl"
            type="text"
            inputMode="url"
            value={destinationUrl}
            onChange={(event) => {
              setDestinationUrl(event.target.value);
              clearFieldError('destinationUrl');
            }}
            aria-invalid={errors.destinationUrl ? true : undefined}
            aria-describedby={fieldDescribedBy('edit-destinationUrl', {
              error: Boolean(errors.destinationUrl),
            })}
            className={inputClassName(Boolean(errors.destinationUrl))}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          id="edit-expiresAt"
          label="Expires"
          error={errors.expiresAt}
          optional
          hint="Clear the field to remove the expiry."
        >
          <div className="space-y-2">
            <input
              id="edit-expiresAt"
              name="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => {
                setExpiresAt(event.target.value);
                clearFieldError('expiresAt');
              }}
              aria-invalid={errors.expiresAt ? true : undefined}
              aria-describedby={fieldDescribedBy('edit-expiresAt', {
                hint: true,
                error: Boolean(errors.expiresAt),
              })}
              className={inputClassName(Boolean(errors.expiresAt))}
            />
            {expiresAt ? (
              <button
                type="button"
                className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                onClick={() => {
                  setExpiresAt('');
                  clearFieldError('expiresAt');
                }}
              >
                Clear expiry
              </button>
            ) : null}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
