import { apiRequest } from './client';
import type { User } from './types';

export interface AuthInput {
  email: string;
  password: string;
}

interface UserResponse {
  user: User;
}

export const authApi = {
  async register(input: AuthInput): Promise<User> {
    const result = await apiRequest<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return result.user;
  },

  async login(input: AuthInput): Promise<User> {
    const result = await apiRequest<UserResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return result.user;
  },

  async me(): Promise<User> {
    const result = await apiRequest<UserResponse>('/auth/me');
    return result.user;
  },

  async logout(): Promise<void> {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  },
};
