/**
 * Build the `aria-describedby` value for a field whose hint and error messages
 * are rendered by the shared <Field> component.
 */
export function fieldDescribedBy(
  id: string,
  state: { hint?: boolean; error?: boolean } = {},
): string | undefined {
  const ids = [state.hint ? `${id}-hint` : null, state.error ? `${id}-error` : null].filter(
    (value): value is string => value !== null,
  );

  return ids.length > 0 ? ids.join(' ') : undefined;
}
