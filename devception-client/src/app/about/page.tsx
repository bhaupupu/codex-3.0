import type { Metadata } from 'next';
import AboutPageClient from '@/components/landing/AboutPageClient';

export const metadata: Metadata = {
  title: 'About — Devception | What is Devception & What Does It Do',
  description: 'Devception is a multiplayer social deduction coding game. Learn what Devception is, what it does, and how developers collaborate in real-time while unmasking hidden impostors.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Devception — What is Devception & What Does It Do',
    description: 'Devception is an online multiplayer social deduction coding game where developers work together in a real-time collaborative code editor while hunting down hidden impostors.',
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
