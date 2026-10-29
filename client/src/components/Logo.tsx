import { Link } from 'react-router-dom';
import { cn } from '../lib/styles';

/** Pixel "S" monogram drawn on a 5x7 grid at 4px per cell inside a 32px tile. */
const MONOGRAM_PIXELS: ReadonlyArray<readonly [number, number, number, number]> = [
  [10, 2, 12, 4],
  [6, 6, 4, 4],
  [22, 6, 4, 4],
  [6, 10, 4, 4],
  [10, 14, 12, 4],
  [22, 18, 4, 4],
  [6, 22, 4, 4],
  [22, 22, 4, 4],
  [10, 26, 12, 4],
];

interface LogoMarkProps {
  className?: string;
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('shrink-0', className ?? 'h-7 w-7')}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="2" className="fill-accent" />
      <g className="fill-accent-ink" shapeRendering="crispEdges">
        {MONOGRAM_PIXELS.map(([x, y, width, height]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} />
        ))}
      </g>
    </svg>
  );
}

interface LogoProps {
  to?: string;
  className?: string;
  markClassName?: string;
}

export function Logo({ to = '/', className, markClassName }: LogoProps) {
  return (
    <Link
      to={to}
      aria-label="Snip — home"
      className={cn('group inline-flex items-center gap-2.5 rounded-sm no-underline', className)}
    >
      <LogoMark className={cn('h-7 w-7 transition-opacity duration-150', markClassName)} />
      <span className="font-display text-[1.0625rem] leading-none tracking-tight text-ink">
        snip
      </span>
      <span
        aria-hidden="true"
        className="mb-[3px] h-1.5 w-1.5 self-end bg-accent transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
