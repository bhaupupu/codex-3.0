import type { Metadata } from 'next';
import AboutPageClient from '@/components/landing/AboutPageClient';

export const metadata: Metadata = {
  title: 'About — CodeSlayer | What is CodeSlayer & What Does It Do',
  description: 'CodeSlayer is a multiplayer social deduction coding game. Learn what CodeSlayer is, what it does, and how developers collaborate in real-time while unmasking hidden impostors.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About CodeSlayer — What is CodeSlayer & What Does It Do',
    description: 'CodeSlayer is an online multiplayer social deduction coding game where developers work together in a real-time collaborative code editor while hunting down hidden impostors.',
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
