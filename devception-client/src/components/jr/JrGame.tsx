'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BlocklyWorkspace } from './BlocklyWorkspace';
import { JR_BLOCK_TYPES, ROBOT_RESCUE } from '@/lib/jr/mission-definitions';
import { blockLabel, executeMission } from '@/lib/jr/mission-engine';
import { validateProgram } from '@/lib/jr/program-validator';
import { applyLocalAction, LocalAction, LocalTeam } from '@/lib/jr/turn-manager';
import { Direction, MissionRun, ProgramBlock } from '@/lib/jr/types';

const PLAYERS = [
  { name: 'Blue', color: '#2563eb' },
  { name: 'Orange', color: '#c65310' },
  { name: 'Purple', color: '#7c3aed' },
];
const INITIAL_TEAM: LocalTeam = {
  program: [{ id: 'start', type: 'START' }, { id: 'finish', type: 'FINISH' }],
  version: 0, currentPlayerIndex: 0, turnNumber: 1, playerCount: 2,
};
const STORAGE_KEY = 'devception-jr:robot-rescue:v1';
const DIRECTION_ARROWS: Record<Direction, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const INTRO = { tone: 'tip', message: 'Let’s make a plan for Pip!', hint: 'Add Move Forward twice to reach the star. Then collect it.' };
type Edit = { id: string; mode: 'replace' | 'insert' } | null;

function makeBlockId() {
  return globalThis.crypto?.randomUUID?.() ?? `jr-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function JrGame() {
  const mission = ROBOT_RESCUE;
  const [team, setTeam] = useState(INITIAL_TEAM);
  const teamRef = useRef(team);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [edit, setEdit] = useState<Edit>(null);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [robot, setRobot] = useState(mission.start);
  const [collectedStars, setCollectedStars] = useState<string[]>([]);
  const [runState, setRunState] = useState<'ready' | 'running' | 'success' | 'failed'>('ready');
  const [feedback, setFeedback] = useState(INTRO);
  const [playback, setPlayback] = useState<{ result: MissionRun; index: number } | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [narration, setNarration] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const busy = useRef(false);
  const program = team.program;
  const currentPlayer = PLAYERS[team.currentPlayerIndex];
  const canEdit = loaded && !playback;
  const selectedBlock = program.find((block) => block.id === edit?.id);
  const programIsFull = program.length >= mission.maxBlocks;

  const updateTeam = useCallback((next: LocalTeam) => {
    teamRef.current = next;
    setTeam(next);
  }, []);

  useEffect(() => {
    setSpeechAvailable('speechSynthesis' in window);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value = JSON.parse(raw);
        const restored = value.team;
        if (restored && !validateProgram(ROBOT_RESCUE, restored.program) &&
          [1, 2, 3].includes(restored.playerCount) &&
          Number.isSafeInteger(restored.turnNumber) && restored.turnNumber > 0 &&
          Number.isSafeInteger(restored.version) && restored.version >= 0 &&
          Number.isInteger(restored.currentPlayerIndex) && restored.currentPlayerIndex >= 0 && restored.currentPlayerIndex < restored.playerCount) {
          updateTeam(restored);
          setCompleted(value.completed === true);
          setFeedback({ tone: 'tip', message: 'Welcome back! Your plan is here.', hint: 'Keep building, or run your plan to see where Pip goes.' });
        }
      }
    } catch { /* Storage is optional; the mission works without it. */ }
    setLoaded(true);
    return () => { window.speechSynthesis?.cancel(); };
  }, [updateTeam]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ team, completed }));
      setSaved(true);
    } catch { setSaved(false); }
  }, [team, completed, loaded]);

  useEffect(() => {
    if (!narration || !speechAvailable) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(`${feedback.message} ${feedback.hint}`);
    speech.rate = 0.85;
    window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [feedback, narration, speechAvailable]);

  useEffect(() => {
    if (!playback) return;
    const timer = setTimeout(() => {
      const nextIndex = playback.index + 1;
      if (nextIndex < playback.result.steps.length) {
        const step = playback.result.steps[nextIndex];
        setRobot(step.robot);
        setCollectedStars(step.collectedStars);
        setActiveBlockIndex(step.blockIndex);
        setPlayback({ ...playback, index: nextIndex });
      } else {
        const result = playback.result;
        setRunState(result.status);
        if (result.status === 'success') setCompleted(true);
        setFeedback({ tone: result.status === 'success' ? 'success' : 'error', message: result.message, hint: result.hint });
        setPlayback(null);
        busy.current = false;
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [playback, speed]);

  function resetBoard() {
    setRobot(mission.start);
    setCollectedStars([]);
    setActiveBlockIndex(null);
    setRunState('ready');
    setConfirmRun(false);
  }

  function submit(action: LocalAction, description: string) {
    if (busy.current || !canEdit) return;
    const next = applyLocalAction(teamRef.current, action, mission);
    if (!next) {
      setFeedback({ tone: 'tip', message: 'Let’s choose a different change.', hint: 'Keep Start first and Finish last. Choose one new block at a time.' });
      return;
    }
    updateTeam(next);
    setEdit(null);
    resetBoard();
    setFeedback({
      tone: 'tip', message: `${currentPlayer.name} ${description}.`,
      hint: next.playerCount === 1 ? 'What should Pip do next?' : `Pass the device to ${PLAYERS[next.currentPlayerIndex].name}. It’s their turn!`,
    });
  }

  function actionBase() {
    return { playerIndex: team.currentPlayerIndex, version: team.version, turnNumber: team.turnNumber };
  }

  function addBlock(type: ProgramBlock['type'], dropIndex?: number) {
    if (!JR_BLOCK_TYPES.some((block) => block.type === type)) return;
    if (dropIndex === undefined && edit?.mode === 'replace' && selectedBlock) {
      submit({ ...actionBase(), type: 'REPLACE', blockId: selectedBlock.id, blockType: type }, `changed a block to ${blockLabel(type)}`);
    } else {
      const index = dropIndex ?? (edit?.mode === 'insert' && selectedBlock ? program.indexOf(selectedBlock) : program.length - 1);
      submit({ ...actionBase(), type: 'ADD', index, block: { id: makeBlockId(), type } }, `added ${blockLabel(type)}`);
    }
  }

  function runProgram() {
    if (busy.current || !loaded) return;
    busy.current = true;
    resetBoard();
    setEdit(null);
    setRunState('running');
    setFeedback({ tone: 'running', message: 'Pip is following your plan.', hint: 'Watch the glowing block. What happens next?' });
    setPlayback({ result: executeMission(mission, teamRef.current.program), index: -1 });
  }

  function stopRun() {
    setPlayback(null);
    busy.current = false;
    resetBoard();
    setFeedback({ tone: 'tip', message: 'Pip is ready for another try.', hint: 'Your blocks are still here. Change one, then run again.' });
  }

  function chooseTeam(count: number) {
    if (!canEdit) return;
    updateTeam({ ...teamRef.current, playerCount: count, currentPlayerIndex: 0 });
    setConfirmRun(false);
    setFeedback({ tone: 'tip', message: count === 1 ? 'Let’s play!' : `${count} players, one device.`, hint: count === 1 ? 'Build a plan for Pip, one step at a time.' : 'Choose a color each. Blue starts, then pass the device after each change.' });
  }

  return (
    <main className="jr-shell">
      <header className="jr-topbar">
        <Link href="/" className="jr-logo" aria-label="Back to Devception home"><span className="jr-logo-mark">✦</span><span>DEVCEPTION <b>JR</b></span></Link>
        <div className="jr-topbar-center"><span className="jr-eyebrow">TEAM MISSION</span><strong>ROBOT RESCUE</strong></div>
        <div className="jr-top-actions">
          <span className="jr-progress-pill">{completed ? '★ Mission completed' : 'Ages 5–7 · Local play'}</span>
          <button className="jr-icon-button" aria-label={narration ? 'Turn narration off' : 'Turn narration on'} aria-pressed={narration} disabled={!speechAvailable} title={speechAvailable ? 'Read hints aloud' : 'Narration is unavailable in this browser'} onClick={() => setNarration(!narration)}>{narration ? '🔊' : '🔇'}</button>
        </div>
      </header>

      <div className="jr-content">
        <section className="jr-brief-row">
          <div><div className="jr-kicker"><span className="jr-pulse-dot" /> PLAY, PLAN, LEARN</div><h1>Help Pip get home.</h1><p>Get the star. Find home. Take turns making a plan!</p></div>
          <div className="jr-how-card"><span className="jr-how-number">{team.turnNumber}</span><div><b>{playback ? 'WATCH PIP' : `${currentPlayer.name.toUpperCase()}’S TURN`}</b><small>{team.playerCount > 1 ? 'One change, then pass the device.' : 'One small step at a time.'}</small></div></div>
        </section>

        <div className="jr-layout">
          <section className="jr-board-panel jr-card" aria-labelledby="mission-heading">
            <div className="jr-panel-heading"><div><span className="jr-panel-label">MISSION BOARD</span><h2 id="mission-heading">Robot Rescue</h2></div><span className="jr-board-status">★ {collectedStars.length} / 1</span></div>
            <div className="jr-board-wrap">
              <div className="jr-grid" role="img" aria-label={`5 by 5 maze. Pip is in column ${robot.x + 1}, row ${robot.y + 1}, facing ${robot.direction}. Star in column 3, row 5. Home in column 5, row 3.`} style={{ gridTemplateColumns: `repeat(${mission.grid.width}, 1fr)` }}>
                {Array.from({ length: 25 }, (_, index) => {
                  const x = index % 5;
                  const y = Math.floor(index / 5);
                  const wall = mission.grid.walls.some((cell) => cell.x === x && cell.y === y);
                  const goal = mission.goal.x === x && mission.goal.y === y;
                  const star = mission.stars.find((cell) => cell.x === x && cell.y === y);
                  return <div aria-hidden="true" key={index} className={`jr-grid-cell ${wall ? 'is-wall' : ''} ${goal ? 'is-goal' : ''}`}>
                    {goal && <span className="jr-home-icon">⌂</span>}
                    {star && !collectedStars.includes(star.id) && <span className="jr-star">★</span>}
                  </div>;
                })}
                <span aria-hidden="true" className="jr-robot-position" style={{ left: `${robot.x * 20}%`, top: `${robot.y * 20}%` }}><span className="jr-robot"><span>▰</span><b>{DIRECTION_ARROWS[robot.direction]}</b></span></span>
              </div>
              <div className="jr-map-legend"><span><i className="jr-legend-robot">→</i> Pip</span><span><i className="jr-legend-star">★</i> Star</span><span><i className="jr-legend-home">⌂</i> Home</span></div>
            </div>
            <div className={`jr-feedback jr-feedback-${feedback.tone}`} role="status" aria-live="polite"><span className="jr-feedback-icon" aria-hidden="true">{feedback.tone === 'success' ? '🎉' : feedback.tone === 'error' ? '💡' : playback ? '👀' : '💬'}</span><div><b>{feedback.message}</b><span>{feedback.hint}</span></div></div>
            <div className="jr-board-actions">
              <button className="jr-run-button" disabled={!canEdit || program.length <= 2} onClick={() => team.playerCount > 1 ? setConfirmRun(true) : runProgram()}><span>▶</span> {playback ? 'Watching Pip…' : 'Run program'}</button>
              {(runState !== 'ready') && <button className="jr-secondary-button" onClick={stopRun}>{playback ? '■ Stop' : '↻ Reset Pip'}</button>}
            </div>
            {confirmRun && <div className="jr-run-confirm"><b>Is everyone ready to watch?</b><button className="jr-secondary-button" onClick={runProgram}>Yes, let’s run!</button><button className="jr-secondary-button" onClick={() => setConfirmRun(false)}>Keep building</button></div>}
            <label className="jr-speed">Pip’s speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={1400}>Slow</option><option value={900}>Normal</option><option value={450}>Quick</option></select></label>
          </section>

          <aside className="jr-side-column">
            <section className="jr-card jr-turn-card" aria-labelledby="team-heading">
              <div className="jr-panel-heading"><h2 id="team-heading" className="jr-panel-label">Our team</h2><span className="jr-turn-counter">Turn {team.turnNumber}</span></div>
              <label className="jr-team-setting">Same-device players<select value={team.playerCount} disabled={!canEdit} onChange={(event) => chooseTeam(Number(event.target.value))}><option value={1}>Just me</option><option value={2}>2 players</option><option value={3}>3 players</option></select></label>
              <div className="jr-current-turn" style={{ borderColor: currentPlayer.color }}><span className="jr-player-avatar" style={{ background: currentPlayer.color }}>{team.currentPlayerIndex + 1}</span><div><small>{playback ? 'WATCH TOGETHER' : 'WHO’S NEXT?'}</small><b>{currentPlayer.name}’s turn</b></div></div>
              <div className="jr-player-list">{PLAYERS.slice(0, team.playerCount).map((player, index) => <div className={`jr-player-row ${index === team.currentPlayerIndex ? 'is-current' : ''}`} key={player.name}><span className="jr-mini-avatar" style={{ background: player.color }}>{index + 1}</span><span>{player.name}</span><i>{index === team.currentPlayerIndex ? '← Now' : 'Next'}</i></div>)}</div>
              <button className="jr-pass-button" disabled={!canEdit} onClick={() => submit({ ...actionBase(), type: 'PASS' }, 'passed the turn')}>Pass my turn →</button>
            </section>
            <section className="jr-card jr-next-card"><h2 className="jr-panel-label">How to play</h2><ol className="jr-how-list"><li>Add a block.</li><li>Pass to your friend.</li><li>Run and watch Pip!</li></ol><p>Found a bug? Change a block and try again.</p><p className="jr-save-note">{saved ? '✓ Plan saved on this device' : 'Your plan stays open in this tab'}</p></section>
          </aside>

          <section className="jr-editor-panel jr-card" aria-labelledby="program-heading">
            <div className="jr-editor-heading"><div><span className="jr-panel-label">OUR PROGRAM</span><h2 id="program-heading">Build the plan</h2></div><span className="jr-block-count">{program.length} / {mission.maxBlocks}</span></div>
            <p className="jr-editor-help">Drag one block from the tray. Or use the big buttons below. Start and Finish stay in place.</p>
            <BlocklyWorkspace program={program} activeBlockIndex={activeBlockIndex} disabled={!canEdit} maxBlocks={mission.maxBlocks} onAddBlock={addBlock} />
            <div className="jr-palette-heading"><span>Tap to add</span><small>{programIsFull ? 'Plan full — change or remove a block' : 'One block per turn'}</small></div>
            {edit && selectedBlock && <div className="jr-replace-note">{edit.mode === 'replace' ? 'Change' : 'Add before'} step {program.indexOf(selectedBlock) + 1}: <b>{blockLabel(selectedBlock.type)}</b><button onClick={() => setEdit(null)}>Cancel</button></div>}
            <div className="jr-palette">{JR_BLOCK_TYPES.map((block) => <button key={block.type} className="jr-palette-block" style={{ '--block-color': block.color } as React.CSSProperties} onClick={() => addBlock(block.type)} disabled={!canEdit || (programIsFull && edit?.mode !== 'replace')}><span className="jr-palette-icon" aria-hidden="true">{block.icon}</span><span><b>{block.label}</b><small>{edit?.mode === 'replace' ? 'Change selected block' : block.helper}</small></span></button>)}</div>
            <details className="jr-edit-details" open={runState === 'failed' || undefined}><summary>Change a step</summary><ol className="jr-program-controls">{program.map((block, index) => <li key={block.id} className={`jr-program-row ${activeBlockIndex === index ? 'is-active' : ''} ${edit?.id === block.id ? 'is-selected' : ''}`} aria-current={activeBlockIndex === index ? 'step' : undefined}><span className="jr-program-select"><span>{index + 1}</span><b>{blockLabel(block.type)}</b></span>{block.type !== 'START' && <button className="jr-row-action" disabled={!canEdit} aria-label={`Add before step ${index + 1}`} onClick={() => setEdit({ id: block.id, mode: 'insert' })}>＋</button>}{block.type !== 'START' && block.type !== 'FINISH' && <><button className="jr-row-action" disabled={!canEdit} aria-label={`Change step ${index + 1}`} onClick={() => setEdit(edit?.id === block.id && edit.mode === 'replace' ? null : { id: block.id, mode: 'replace' })}>↺</button><button className="jr-row-action" disabled={!canEdit} aria-label={`Remove step ${index + 1}`} onClick={() => submit({ ...actionBase(), type: 'REMOVE', blockId: block.id }, `removed ${blockLabel(block.type)}`)}>×</button></>}</li>)}</ol><p className="jr-editor-help">＋ Add before · ↺ Change · × Remove</p></details>
          </section>
        </div>
        <footer className="jr-footer-note"><span>♥</span> Mistakes are clues. Try one small change together.</footer>
      </div>
    </main>
  );
}
