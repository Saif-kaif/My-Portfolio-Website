/** Static, trusted SVG icon markup (never built from user data). */

const attrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const ICONS = {
  python: `<svg ${attrs}><path d="M12 2.8c-3.2 0-4.6 1.1-4.6 3V8.4H12v.9H5.9C3.9 9.3 2.8 10.8 2.8 13.4s1.1 4.1 3.1 4.1h1.5v-2.8c0-1.8 1.4-3.3 3.3-3.3h4.6c1.6 0 2.9-1.3 2.9-2.9V5.8c0-1.9-1.8-3-6.2-3Z"/><path d="M12 21.2c3.2 0 4.6-1.1 4.6-3v-2.6H12v-.9h6.1c2 0 3.1-1.5 3.1-4.1s-1.1-4.1-3.1-4.1h-1.5v2.8c0 1.8-1.4 3.3-3.3 3.3H8.7c-1.6 0-2.9 1.3-2.9 2.9v2.7c0 1.9 1.8 3 6.2 3Z"/><circle cx="9.8" cy="5.6" r=".7" fill="currentColor"/><circle cx="14.2" cy="18.4" r=".7" fill="currentColor"/></svg>`,
  java: `<svg ${attrs}><path d="M4.5 10h11.5v4a5 5 0 0 1-5 5H9.5a5 5 0 0 1-5-5v-4Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 2.8c-1 1.2 1 2 0 3.6M11.2 2.8c-1 1.2 1 2 0 3.6M14.4 2.8c-1 1.2 1 2 0 3.6"/><path d="M3.5 21.5h15"/></svg>`,
  html: `<svg ${attrs}><path d="M4 3h16l-1.5 16L12 21l-6.5-2L4 3Z"/><path d="m9.5 9-2 2.5 2 2.5M14.5 9l2 2.5-2 2.5M12.8 8l-1.6 7"/></svg>`,
  sql: `<svg ${attrs}><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/></svg>`,
  code: `<svg ${attrs}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>`,
  github: `<svg ${attrs}><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>`,
  external: `<svg ${attrs}><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  certificate: `<svg ${attrs}><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 9h10M7 12.5h6"/><circle cx="17" cy="17" r="2.5"/><path d="m15.8 19.2-.8 2.8 2-1 2 1-.8-2.8"/></svg>`,
};

/** Maps a skill name to an icon key; unknown skills get a generic code icon. */
export function skillIcon(name = '') {
  const key = name.trim().toLowerCase();
  if (key === 'python') return ICONS.python;
  if (key === 'java') return ICONS.java;
  if (key === 'html' || key === 'html5') return ICONS.html;
  if (key === 'sql' || key.includes('sql')) return ICONS.sql;
  return ICONS.code;
}

/** Medal SVG with unique gradient ids per instance. */
export function medalIcon(id) {
  return `<svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="bronze-grad-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6C99A"/><stop offset=".5" stop-color="#CD7F32"/><stop offset="1" stop-color="#7A4A1E"/></linearGradient>
      <linearGradient id="ribbon-grad-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D5A44"/><stop offset="1" stop-color="#12372A"/></linearGradient>
    </defs>
    <path d="M36 6h20l12 38H48L36 6Z" fill="url(#ribbon-grad-${id})"/>
    <path d="M84 6H64L52 44h20L84 6Z" fill="url(#ribbon-grad-${id})"/>
    <path d="M46 6h2l12 38h-2L46 6ZM74 6h-2L60 44h2L74 6Z" fill="#D7FC70" fill-opacity=".7"/>
    <circle cx="60" cy="76" r="34" fill="url(#bronze-grad-${id})"/>
    <circle cx="60" cy="76" r="26" stroke="#FBE3C6" stroke-opacity=".55" stroke-width="2"/>
    <path d="m60 60 4.9 10 11 1.6-8 7.8 1.9 11L60 85.2l-9.8 5.2 1.9-11-8-7.8 11-1.6L60 60Z" fill="#FBE3C6" fill-opacity=".92"/>
  </svg>`;
}
