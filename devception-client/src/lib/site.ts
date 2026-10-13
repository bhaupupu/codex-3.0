// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for site identity, SEO, and authorship.
// Devception by Team Tarnished | CodeX 3.0
// ─────────────────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Devception',
  url: 'https://devception.xyz',
  tagline: 'Code together. Trust no one.',
  team: 'Team Tarnished | CodeX 3.0',
  title: 'Devception — Real-Time Multiplayer Social Deduction Coding Game',
  description:
    'Devception is a browser-based, real-time multiplayer social-deduction coding game. Players collaborate to build a working program while hidden Impostors secretly sabotage the code. Code together. Trust no one.',
  logo: '/logo.svg',
  ogImage: '/opengraph-image',
  founded: '2026',
} as const;

export const AUTHOR = {
  name: 'Team Tarnished',
  role: 'Engineering & Game Design Team | CodeX 3.0',
  bio: 'Team Tarnished built Devception for CodeX 3.0 to fuse real collaborative engineering with social deduction gameplay.',
  url: '/about',
} as const;

export const SOCIAL: { label: string; href: string }[] = [];

export const CONTACT_URL = '/about';
