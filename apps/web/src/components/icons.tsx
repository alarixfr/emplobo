// Authored SVG icon set — one consistent stroke family (24×24, 1.8 weight,
// round caps/joins). Used everywhere the UI needs an icon; no emoji, no
// external icon dependency (offline store constraint).

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function base(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: props.strokeWidth ?? 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: props.className,
  };
}

export function BookOpenIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="M12 6.5c-1.8-1.4-4.2-2-7-2v13c2.8 0 5.2.6 7 2 1.8-1.4 4.2-2 7-2v-13c-2.8 0-5.2.6-7 2Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <path d="M12 8V4.5" />
      <circle cx="12" cy="4.5" r="1.4" />
      <path d="M9.5 14.5h.01M14.5 14.5h.01" />
      <path d="M8 11.5c1.1-1 6.9-1 8 0" />
    </svg>
  );
}

export function MessageCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="M7.5 19.2 4 21l1.1-3.8A8.2 8.2 0 1 1 12 20.2c-1.6 0-3.2-.5-4.5-1Z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="M12 4.5 13.6 9l4.4 1.6-4.4 1.6L12 16.7l-1.6-4.5L6 10.6 10.4 9 12 4.5Z" />
      <path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
    </svg>
  );
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="m2.5 9.5 9.5-4.5 9.5 4.5-9.5 4.5-9.5-4.5Z" />
      <path d="M6.5 11.8v4.2c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.2" />
      <path d="M21.5 9.5v5" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
      <path d="M17.8 14.9c1.8.7 2.9 2.3 3.2 4.6" />
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="M3 12h3.5l2.5-6 4 12 2.5-6H21" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m4.5 12.5 7.5 4 7.5-4" />
      <path d="m4.5 16.5 7.5 4 7.5-4" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)} width="1em" height="1em">
      <path d="m4 11.5 16-7-6.5 16-2.8-6.7L4 11.5Z" />
      <path d="m10.7 13.8 9.3-9.3" />
    </svg>
  );
}
