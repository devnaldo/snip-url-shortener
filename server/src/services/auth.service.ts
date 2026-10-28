import bcrypt from 'bcrypt';
import type { User } from '../db/schema.js';
import { AppError } from '../errors/app-error.js';
import { signAuthToken } from '../lib/auth-token.js';
import { isUniqueViolation } from '../lib/db-errors.js';
import { findUserByEmail, findUserById, insertUser } from '../repositories/users.repository.js';

const BCRYPT_COST = 12;

// A valid hash of a throwaway value. Comparing against it when the email is
// unknown keeps the login timing roughly constant and slows down enumeration.
const DUMMY_PASSWORD_HASH = '$2b$12$F66rEmKhteuHuHdozsiWw.grWQe3azluRzBKEcV0x1uiMU4HhO6ay';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

function emailTakenError(): AppError {
  return new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', {
    email: 'Email is already registered',
  });
}

async function createUser(email: string, passwordHash: string): Promise<User> {
  try {
    return await insertUser({ email, passwordHash });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw emailTakenError();
    }

    throw error;
  }
}

export async function register(input: AuthCredentials): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);

  if (existing) {
    throw emailTakenError();
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await createUser(email, passwordHash);

  return { user: toPublicUser(user), token: signAuthToken(user.id) };
}

export async function login(input: AuthCredentials): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);
  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(input.password, passwordHash);

  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  return { user: toPublicUser(user), token: signAuthToken(user.id) };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Your session is no longer valid.');
  }

  return toPublicUser(user);
}
