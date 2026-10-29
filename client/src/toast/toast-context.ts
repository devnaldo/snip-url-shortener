import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export type ShowToast = (message: string, variant?: ToastVariant) => void;

export interface ToastContextValue {
  showToast: ShowToast;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
