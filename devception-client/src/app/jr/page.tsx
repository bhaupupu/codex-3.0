import JrGame from '@/components/jr/JrGame';
import './jr.css';

export const metadata = {
  title: 'Devception Jr. — Robot Rescue',
  description: 'A playful, turn-based coding mission for young programmers.',
  alternates: { canonical: '/jr' },
};

export default function JrPage() {
  return <JrGame />;
}
