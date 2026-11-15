// Inline stroke icons (24×24). Decorative unless a `label` is given.
const PATHS = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c.7-3.1 3.2-5 7-5s6.3 1.9 7 5",
  lock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3",
  unlock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 7.5-2M12 14v3",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  chat: "M4 5h16v11H9l-5 4z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  play: "M8 5v14l11-7z",
  stop: "M7 7h10v10H7z",
  check: "m5 12 4.5 4.5L19 7",
  alert: "M12 3 2 20h20zM12 10v4M12 17v.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.01",
  wrench: "M14.5 6.5a4 4 0 0 0 5 5L13 18l-3 3-4-4 3-3 6.5-6.5a4 4 0 0 0-1-1ZM6 18l-2 2",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  download: "M12 4v11m-5-5 5 5 5-5M5 20h14",
  upload: "M12 20V9m-5 5 5-5 5 5M5 4h14",
  robot: "M7 9h10v9H7zM12 5v4M9.5 13v.01M14.5 13v.01M4 12v3M20 12v3",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  home: "M3 11l9-7 9 7M5 9v11h14V9",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  send: "M4 12l16-8-6 16-2-6z",
  chevronRight: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  tag: "M3 12V4h8l10 10-8 8zM7.5 7.5v.01",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  phone: "M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z",
  note: "M5 3h14v18H5zM9 8h6M9 12h6M9 16h3",
  wand: "M4 20 16 8M14 4v2M18 8h2M18 4l-1.5 1.5M20 12l-1.5-1.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
};

export function Icon({ name, size = 22, label, className = "", strokeWidth = 1.8 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={d} />
    </svg>
  );
}
