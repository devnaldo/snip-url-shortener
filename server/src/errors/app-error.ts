export type ErrorFields = Record<string, string>;

/**
 * An expected, client-facing error. Anything that is not an AppError is treated
 * as an internal failure and never exposed to the client.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fields: ErrorFields | undefined;

  constructor(statusCode: number, code: string, message: string, fields?: ErrorFields) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}
