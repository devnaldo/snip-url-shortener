import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { clearAuthCookie, setAuthCookie } from '../lib/auth-cookie.js';
import { parseInput } from '../lib/validation.js';
import * as authService from '../services/auth.service.js';
import { loginSchema, registerSchema } from '../validation/auth.schema.js';

export async function register(req: Request, res: Response): Promise<void> {
  const input = parseInput(registerSchema, req.body as unknown);
  const result = await authService.register(input);

  setAuthCookie(res, result.token);
  res.status(201).json({ user: result.user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = parseInput(loginSchema, req.body as unknown);
  const result = await authService.login(input);

  setAuthCookie(res, result.token);
  res.status(200).json({ user: result.user });
}

export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }

  const user = await authService.getCurrentUser(req.auth.userId);
  res.status(200).json({ user });
}
