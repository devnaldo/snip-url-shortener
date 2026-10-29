import type { ButtonHTMLAttributes } from 'react';
import { buttonClassName, cn } from '../lib/styles';
import type { ButtonSize, ButtonVariant } from '../lib/styles';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClassName(variant, size), className)}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}
