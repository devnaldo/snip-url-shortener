import { createContext } from 'react';
import type { AuthInput } from '../api/auth';
import type { User } from '../api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  login: (input: AuthInput) => Promise<void>;
  register: (input: AuthInput) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
