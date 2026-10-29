import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, fieldErrors } from '../../api/client';
import { linksApi } from '../../api/links';
import type { LinkDto } from '../../api/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/format';
import { inputClassName } from '../../lib/styles';
import { useToast } from '../../toast/useToast';
import { Button } from '../Button';
import { Field } from '../Field';
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
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {formError}
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
            aria-describedby={errors.destinationUrl ? 'edit-destinationUrl-error' : undefined}
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
              aria-describedby={errors.expiresAt ? 'edit-expiresAt-error' : undefined}
              className={inputClassName(Boolean(errors.expiresAt))}
            />
            {expiresAt ? (
              <button
                type="button"
                className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
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
