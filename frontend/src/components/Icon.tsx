/** Set de iconos outline (stroke ~2px) portado del prototipo. */
export const ICONS = {
  dash: 'M3 13h8V3H3zM13 21h8v-6h-8zM13 11h8V3h-8zM3 21h8v-6H3z',
  feria: 'M3 9l1-5h16l1 5 M4 9v11h16V9 M9 20v-6h6v6',
  empr: 'M9 7a4 4 0 100 0.01 M9 3a4 4 0 014 4 M3 21v-1a6 6 0 016-6 M17 11l2 2 4-4',
  postul: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9 13l2 2 4-4',
  eval: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  chart: 'M3 3v18h18 M7 14l3-3 3 3 5-6',
  bell: 'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 01-3.4 0',
  user: 'M12 8a4 4 0 100 0.01 M12 4a4 4 0 014 4 M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 0.01 M9 3a4 4 0 014 4 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  cap: 'M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5',
  money: 'M12 3a9 9 0 100 18 9 9 0 000-18 M12 7v10 M9.5 9.5a2.5 2 0 012.5-1.5c1.4 0 2.5.7 2.5 1.8 0 2.5-5 1.2-5 3.6 0 1.1 1.1 1.8 2.5 1.8a2.5 2 0 002.5-1.5',
  plus: 'M12 5v14M5 12h14',
  back: 'M19 12H5M12 19l-7-7 7-7',
  check: 'M20 6L9 17l-5-5',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
  lock: 'M5 11h14v11H5z M7 11V7a5 5 0 0110 0v4',
  doc: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z',
  cal: 'M3 4h18v18H3z M16 2v4M8 2v4M3 10h18',
  pin: 'M12 21s-7-5.2-7-11a7 7 0 0114 0c0 5.8-7 11-7 11z M12 10a2.5 2.5 0 100 0.01',
  shield: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  chevron: 'M6 9l6 6 6-6',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  award: 'M12 3a5 5 0 100 10 5 5 0 000-10 M8.2 12.5L7 22l5-3 5 3-1.2-9.5',
  compass: 'M12 2a10 10 0 100 20 10 10 0 000-20 M16.2 7.8l-2.9 6.4-6.4 2.9 2.9-6.4z',
  sparkle: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z',
  info: 'M12 2a10 10 0 100 20 10 10 0 000-20 M12 16v-4M12 8h.01',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6 M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H1a2 2 0 110-4h.1A1.6 1.6 0 002.6 5l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V1a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H23a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className, style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden>
      {ICONS[name].split(' M').map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : 'M' + seg)} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
