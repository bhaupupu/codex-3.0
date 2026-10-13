'use client';
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useCinematic } from './CinematicProvider';

const FEATURES = [
  {
    icon: '💻',
    title: 'REAL-TIME COLLABORATIVE EDITOR',
    body: 'Powered by Monaco Editor and Yjs CRDTs, multiple players write and edit code in the exact same file simultaneously with live multi-cursor synchronization and zero merge conflicts.',
    color: '#2563eb',
  },
  {
    icon: '🕵️',
    title: 'HIDDEN IMPOSTOR SABOTAGE',
    body: 'Impostors receive covert sabotage abilities: inject sneaky syntax or logic bugs, trigger temporary screen blurs on teammates, send deceptive hints, and discreetly sabotage tests without blowing their cover.',
    color: '#dc2626',
  },
  {
    icon: '🚨',
    title: 'EMERGENCY MEETINGS & VOTING',
    body: 'When broken tests or suspicious code edits arise, any player can slam the Emergency Meeting button to halt the editor, open a real-time discussion chat, debate the evidence, and vote to eliminate suspects.',
    color: '#d97706',
  },
  {
    icon: '⚡',
    title: 'AUTOMATED CODE RUNNER',
    body: 'An isolated backend sandbox executes test suites against the team’s code in real-time, verifying whether the solution meets 100% passing tests before the countdown clock runs out.',
    color: '#16a34a',
  },
  {
    icon: '👥',
    title: 'CUSTOM MULTIPLAYER LOBBIES',
    body: 'Host public or private rooms for 4–8 players with custom match duration, meeting discussion and voting timers, sabotage cooldowns, and instant room code sharing with teammates.',
    color: '#7c3aed',
  },
  {
    icon: '🎯',
    title: 'TWO DISTINCT ROLES',
    body: 'Developers strive for flawless code completion and bug fixes. Impostors win by stalling progress until the timer expires or deceiving developers into ejecting innocent teammates.',
    color: '#0284c7',
  },
];

export default function AboutPageClient() {
  const { triggerCinematic } = useCinematic();

  const handlePlayNow = () => {
    triggerCinematic('/lobby');
  };

  return (
    <div style={{ background: '#f0ece2', minHeight: '100vh' }}>
      <Navbar />

      {/* ─── Hero: What is Devception ─── */}
      <section
        className="pixel-bg"
        style={{
          paddingTop: 120,
          paddingBottom: 70,
          textAlign: 'center',
          borderBottom: '3px solid rgba(28,25,23,0.1)',
        }}
      >
        <div className="section-container" style={{ maxWidth: 840 }}>
          <div className="section-label">▶ OVERVIEW</div>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(18px, 2.8vw, 30px)',
              color: '#1c1917',
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            WHAT IS DEVCEPTION?
          </h1>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              color: '#44403c',
              lineHeight: 1.9,
              maxWidth: 760,
              margin: '0 auto 32px',
            }}
          >
            <strong>Devception</strong> is an online multiplayer social deduction coding game built for developers. 
            It merges the fast-paced suspicion of social deception games like <em>Among Us</em> with the technical 
            excitement of real-time collaborative programming.
          </p>

          <div
            className="game-panel"
            style={{
              padding: 'clamp(20px, 4vw, 32px)',
              textAlign: 'left',
              borderLeft: '4px solid #2563eb',
              background: '#ffffff',
            }}
          >
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 14,
                color: '#1c1917',
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              4 to 8 players join a shared lobby and write code together in a single collaborative editor.
              While honest developers race against the clock to complete programming tasks and pass automated unit tests,
              secretly assigned Impostors work in the shadows to introduce subtle bugs, sabotage editor focus, and mislead the team.
            </p>
          </div>
        </div>
      </section>

      {/* ─── What Does It Do ─── */}
      <section style={{ padding: 'clamp(60px, 8vw, 84px) 0' }}>
        <div className="section-container" style={{ maxWidth: 960 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-label">⚙ MECHANICS & FEATURES</div>
            <h2
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 'clamp(14px, 2vw, 22px)',
                color: '#1c1917',
                lineHeight: 1.6,
              }}
            >
              WHAT DOES DEVCEPTION DO?
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {FEATURES.map((feat, i) => (
              <div
                key={i}
                className="game-panel"
                style={{
                  padding: 26,
                  borderColor: feat.color,
                  boxShadow: `4px 4px 0 ${feat.color}`,
                  background: '#ffffff',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 14 }}>{feat.icon}</div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9,
                    color: feat.color,
                    lineHeight: 1.7,
                    marginBottom: 12,
                  }}
                >
                  {feat.title}
                </div>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 12,
                    color: '#44403c',
                    lineHeight: 1.8,
                    margin: 0,
                  }}
                >
                  {feat.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How A Match Works ─── */}
      <section
        style={{
          padding: '70px 0',
          background: '#faf8f4',
          borderTop: '2px solid rgba(28,25,23,0.1)',
          borderBottom: '2px solid rgba(28,25,23,0.1)',
        }}
      >
        <div className="section-container" style={{ maxWidth: 840 }}>
          <div className="section-label">🎮 GAMEPLAY LOOP</div>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(13px, 1.8vw, 20px)',
              color: '#1c1917',
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            HOW A MATCH PLAYS OUT
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              {
                step: '01',
                title: 'ROLE ASSIGNMENT',
                desc: 'Players enter the lobby and receive secret role cards: Developer or Impostor. Only Impostors know each other’s identities.',
              },
              {
                step: '02',
                title: 'COLLABORATIVE SPRINT',
                desc: 'The game clock starts. Players work on the coding challenge in Monaco editor. Developers write logic and tests; Impostors covertly trigger bugs and cooldown sabotages.',
              },
              {
                step: '03',
                title: 'EMERGENCY MEETING',
                desc: 'Anyone can call an Emergency Meeting. The code editor freezes, test results are audited, and players engage in real-time text debates to accuse suspects.',
              },
              {
                step: '04',
                title: 'VOTING & RESOLUTION',
                desc: 'Players cast secret ballots. The player with the most votes is eliminated. Developers win by passing all tests or ejecting all Impostors; Impostors win if the timer expires.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="game-panel"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  gap: 20,
                  alignItems: 'flex-start',
                  background: '#ffffff',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 12,
                    color: '#2563eb',
                    background: '#e0edff',
                    padding: '8px 10px',
                    border: '2px solid #2563eb',
                    flexShrink: 0,
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 9,
                      color: '#1c1917',
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 13,
                      color: '#57534e',
                      lineHeight: 1.7,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ready to Play ─── */}
      <section style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="section-container" style={{ maxWidth: 700 }}>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(14px, 2vw, 22px)',
              color: '#1c1917',
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            READY TO JOIN A LOBBY?
          </h2>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 14,
              color: '#57534e',
              lineHeight: 1.8,
              marginBottom: 32,
            }}
          >
            Create a private room with friends or join a public match and test your coding and deduction skills.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handlePlayNow}
              className="pixel-btn pixel-btn-blue"
              style={{ fontSize: 10, cursor: 'pointer' }}
            >
              ▶ PLAY NOW
            </button>
            <a
              href="/#how-it-works"
              className="pixel-btn pixel-btn-light"
              style={{ fontSize: 10, textDecoration: 'none' }}
            >
              HOW TO PLAY
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
