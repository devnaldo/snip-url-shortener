const API_BASE = '/api';

const UNAUTHORIZED_EVENT = 'snip:unauthorized';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseErrorBody(body: unknown, status: number): ApiError {
  if (isRecord(body) && isRecord(body.error)) {
    const error = body.error;
    const code = typeof error.code === 'string' ? error.code : 'UNKNOWN_ERROR';
    const message = typeof error.message === 'string' ? error.message : 'Something went wrong.';
    const fields = isRecord(error.fields)
      ? Object.fromEntries(
          Object.entries(error.fields).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : undefined;

    return new ApiError(status, code, message, fields);
  }

  return new ApiError(status, 'UNKNOWN_ERROR', defaultMessageFor(status));
}

function defaultMessageFor(status: number): string {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 404) return 'The requested resource could not be found.';
  if (status === 429) return 'Too many requests. Please try again later.';
  if (status >= 500) return 'The server could not complete the request. Please try again.';

  return 'Something went wrong. Please try again.';
}

/** A normalized API failure with the server's error code and field messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function readError(response: Response): Promise<ApiError> {
  let body: unknown;

  try {
    body = (await response.json()) as unknown;
  } catch {
    body = null;
  }

  return parseErrorBody(body, response.status);
}

function signalUnauthorized(status: number): void {
  if (status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

async function fetchWithCredentials(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: init.headers,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and try again.',
    );
  }
}

/** JSON request with cookies, consistent errors, and 204 support. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchWithCredentials(path, { ...init, headers });

  if (!response.ok) {
    const error = await readError(response);
    signalUnauthorized(response.status);
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Binary request (used for QR codes) that still surfaces JSON API errors. */
export async function apiRequestBlob(path: string): Promise<Blob> {
  const response = await fetchWithCredentials(path, { method: 'GET' });

  if (!response.ok) {
    const error = await readError(response);
    signalUnauthorized(response.status);
    throw error;
  }

  return response.blob();
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError && error.fields ? error.fields : {};
}

export { UNAUTHORIZED_EVENT };
