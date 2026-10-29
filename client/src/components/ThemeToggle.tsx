import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { cn } from '../lib/styles';
import type { ThemeMode } from '../theme/theme-context';
import { useTheme } from '../theme/useTheme';
import { CheckIcon, ChevronDownIcon, MonitorIcon, MoonIcon, SunIcon } from './Icons';
import type { IconProps } from './Icons';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  description: string;
  Icon: (props: IconProps) => ReactElement;
}

const THEME_OPTIONS: Record<ThemeMode, ThemeOption> = {
  light: { value: 'light', label: 'Light', description: 'Always light', Icon: SunIcon },
  dark: { value: 'dark', label: 'Dark', description: 'Always dark', Icon: MoonIcon },
  system: { value: 'system', label: 'System', description: 'Match device', Icon: MonitorIcon },
};

const OPTIONS: readonly ThemeOption[] = [
  THEME_OPTIONS.light,
  THEME_OPTIONS.dark,
  THEME_OPTIONS.system,
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = THEME_OPTIONS[mode];
  const CurrentIcon = current.Icon;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')
      ?.focus();
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [],
    );
    const index = items.findIndex((item) => item === document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRestoreFocus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Change theme`}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <CurrentIcon className="h-4 w-4" />
        <ChevronDownIcon
          className={cn(
            'hidden h-3 w-3 text-subtle transition-transform duration-150 sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Theme"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 animate-panel-in rounded-lg border border-line bg-surface p-1 shadow-overlay"
        >
          <p className="eyebrow px-2.5 py-2">Appearance</p>
          {OPTIONS.map(({ value, label, description, Icon }) => {
            const isActive = value === mode;

            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setMode(value);
                  closeAndRestoreFocus();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs transition-colors duration-150',
                  isActive
                    ? 'bg-surface-2 text-ink'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-[0.625rem] text-subtle">{description}</span>
                </span>
                {isActive ? <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
