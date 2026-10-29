import type { SVGProps } from 'react';

/**
 * One hand-drawn icon set, on a 24px grid with a consistent 1.75 stroke.
 * Keeping every icon here guarantees matching weight, sizing, and alignment.
 */
export type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

function iconProps(className: string | undefined, props: IconProps) {
  return { ...base, className: className ?? 'h-4 w-4', ...props };
}

export function SunIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5 8.6 8.6 0 1 0 20.5 14.8Z" />
    </svg>
  );
}

export function MonitorIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <rect x="2.75" y="4" width="18.5" height="12.5" rx="1.5" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </svg>
  );
}

export function ChevronDownIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function CheckIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function CloseIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function LinkIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M9.5 17H7.25a5 5 0 0 1 0-10H9.5M14.5 7h2.25a5 5 0 0 1 0 10H14.5M8 12h8" />
    </svg>
  );
}

export function QrIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h2.5v2.5h-2.5zM20.5 14.5v2.5M14.5 20.5h3M20.5 20.5h.01" />
    </svg>
  );
}

export function CopyIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" />
    </svg>
  );
}

export function PencilIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function TrashIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12M10 11v6M14 11v6" />
    </svg>
  );
}

export function ChartIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 19.5h16M7.5 16.5V10M12 16.5V5.5M16.5 16.5v-4" />
    </svg>
  );
}

export function ArrowLeftIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ExternalLinkIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4.5" />
    </svg>
  );
}

export function PlusIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function RefreshIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5" />
      <path d="M3.5 20v-4.5H8" />
      <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9l2.4 2.4" />
      <path d="M20.5 4v4.5H16" />
    </svg>
  );
}

export function AlertIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M12 4.5 2.8 20.5h18.4L12 4.5Z" />
      <path d="M12 10v4.5M12 17.8h.01" />
    </svg>
  );
}

export function InboxIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M6.4 5.5h11.2L20.5 13v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5l2.9-7.5Z" />
    </svg>
  );
}

export function DownloadIcon({ className, ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
    </svg>
  );
}
