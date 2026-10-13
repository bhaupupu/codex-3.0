import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { SITE, AUTHOR } from '@/lib/site';
import { Press_Start_2P, Space_Mono } from 'next/font/google';

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CodeSlayer — Real-Time Multiplayer Social Deduction Coding Game',
  description:
    'CodeSlayer is a multiplayer social deduction coding game by Team Tarnished for CodeX 3.0. Collaborate on real programming challenges with 4–8 players while secretly hunting an imposter hidden among the team. Code together. Trust no one.',
  keywords: [
    'codeslayer',
    'multiplayer coding game',
    'social deduction coding game',
    'team tarnished',
    'codex 3.0',
    'collaborative code editor',
    'monaco editor multiplayer',
    'judge0 coding game',
    'programming party game',
  ],
  metadataBase: new URL(SITE.url),
  alternates: { canonical: '/' },
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: SITE.name,
  openGraph: {
    title: 'CodeSlayer — Code together. Trust no one.',
    description:
      'A real-time multiplayer social deduction coding game. Collaborate on code, experience sabotage, call meetings, and find the Impostor.',
    url: SITE.url,
    siteName: SITE.name,
    type: 'website',
    locale: 'en_US',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CodeSlayer — Code together. Trust no one.',
    description:
      'A real-time multiplayer social deduction coding game by Team Tarnished | CodeX 3.0.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${spaceMono.variable}`}
    >
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8046507549517323"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${SITE.url}/#organization`,
                  name: SITE.name,
                  url: SITE.url,
                  logo: { '@type': 'ImageObject', url: SITE.logo, width: 512, height: 512 },
                  foundingDate: SITE.founded,
                  founder: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE.url}/#website`,
                  name: SITE.name,
                  url: SITE.url,
                  publisher: { '@id': `${SITE.url}/#organization` },
                },
                {
                  '@type': 'WebApplication',
                  name: 'CodeSlayer',
                  alternateName: 'CodeSlayer Multiplayer Coding Game',
                  description: 'CodeSlayer is a real-time multiplayer social deduction coding game. Practice code review and collaborate on real programming challenges with 4–8 players while hunting a hidden imposter.',
                  url: SITE.url,
                  applicationCategory: 'GameApplication',
                  genre: ['Multiplayer', 'Social Deduction', 'Coding', 'Educational'],
                  operatingSystem: 'Web Browser',
                  browserRequirements: 'Requires a modern web browser and JavaScript enabled.',
                  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                  publisher: { '@id': `${SITE.url}/#organization` },
                  keywords: 'multiplayer coding game, social deduction game, coding game with friends, developer party game, improve programming skills, collaborative coding',
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
