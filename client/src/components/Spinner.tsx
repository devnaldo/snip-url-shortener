import { cn } from '../lib/styles';
import { LogoMark } from './Logo';

interface SpinnerProps {
  className?: string;
}

/** Pixel loading indicator: four blocks cycling in a two-by-two grid. */
export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid h-4 w-4 shrink-0 grid-cols-2 grid-rows-2 gap-[2px] text-current',
        className,
      )}
    >
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="block animate-block-blink bg-current"
          style={{ animationDelay: `${index * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4">
      <LogoMark className="h-9 w-9" />
      <div className="flex items-center gap-2.5" role="status">
        <Spinner className="h-3 w-3 text-accent" />
        <p className="eyebrow">{label}</p>
      </div>
    </div>
  );
}
