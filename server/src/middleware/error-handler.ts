import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import type { ErrorFields } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: ErrorFields;
  };
}

function sendError(res: Response, statusCode: number, body: ErrorBody): void {
  res.status(statusCode).json(body);
}

function fieldsFromZodError(error: ZodError): ErrorFields {
  const fields: ErrorFields = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    fields[key] ??= issue.message;
  }

  return fields;
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
}

// Express identifies error handlers by their four-argument signature.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    sendError(res, 400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid fields.',
        fields: fieldsFromZodError(error),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    sendError(res, error.statusCode, {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    sendError(res, 400, {
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    });
    return;
  }

  logger.error({ err: error }, 'Unhandled error');
  sendError(res, 500, {
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
}
