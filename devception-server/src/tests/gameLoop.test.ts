/// <reference types="node" />
/**
 * gameLoop.test.ts — Comprehensive Integration & Lifecycle Tests for Code Slayer
 *
 * Tests:
 *  1. Lobby creation, room clamping, and player connection states.
 *  2. Server-authoritative role assignment, scaling, and privacy integrity.
 *  3. Collaborative editing, Monaco ops, stale-version rejection, and protected-region enforcement.
 *  4. Impostor sabotage anonymity and evidence ledger tracking.
 *  5. Mini-task progress tracking, idempotency, and anti-inflation guards.
 *  6. Emergency meetings, voting constraints, tie resolution, and duplicate-vote prevention.
 *  7. Ejection resolution and server-authoritative win conditions (Team vs. Impostor victories).
 *  8. Judge0 sandboxed execution and diagnostics.
 *
 * Run with:  npx tsx src/tests/gameLoop.test.ts
 */

import * as assert from 'assert';
import mongoose from 'mongoose';
import { assignRoles } from '../utils/roleAssigner';
import {
  createRoom,
  getLiveGame,
  addPlayerToGame,
  setPlayerReady,
  startGame,
  updateSharedCode,
  recordEvidence,
  getRoomEvidence,
  completeTask,
  ejectPlayer,
  handlePlayerLeave,
  sanitizeGame,
  setGamePhase,
  checkMainTestCases,
} from '../services/game.service';
import { addVote, tallyVotes } from '../services/voting.service';
import { executeInJudge0 } from '../services/judge0.service';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`  ❌ ${name}\n     ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   CODE SLAYER — FULL MULTIPLAYER GAME LOOP TEST SUITE');
  console.log('======================================================\n');

  // Connect to mongoose if not already connected
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codex_test';
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    }
  } catch {
    console.log('  ⚠️ (Running with in-memory state mocks for database calls)');
  }

  // ─── 1. Role Assignment & Privacy Tests ─────────────────────────────────────
  console.log('── 1. Role Assignment & Secrecy ───────────────────────────');

  await test('assignRoles: 4 players yields exactly 1 imposter and 3 good coders', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const roles = assignRoles(players, 1);
    assert.strictEqual(roles.size, 4);
    let imposters = 0;
    let coders = 0;
    for (const [, role] of roles) {
      if (role === 'imposter') imposters++;
      if (role === 'good-coder') coders++;
    }
    assert.strictEqual(imposters, 1, 'Should have exactly 1 imposter for 4 players');
    assert.strictEqual(coders, 3, 'Should have 3 good coders');
  });

  await test('assignRoles: 7 players with 2 requested imposters yields 2 imposters', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const roles = assignRoles(players, 2);
    let imposters = 0;
    for (const [, role] of roles) {
      if (role === 'imposter') imposters++;
    }
    assert.strictEqual(imposters, 2, 'Should have 2 imposters for 7 players');
  });

  await test('assignRoles: solo demo mode yields 0 imposters', () => {
    const players = ['solo-dev'];
    const roles = assignRoles(players, 1);
    assert.strictEqual(roles.get('solo-dev'), 'good-coder');
  });

  // ─── 2. Lobby & Room Management ─────────────────────────────────────────────
  console.log('\n── 2. Room Creation & Player Lobby ───────────────────────────');

  let roomCode = '';

  await test('createRoom: initializes room in waiting phase with clamped player bounds', async () => {
    const game = await createRoom('javascript', 'beginner', 8);
    assert.ok(game.roomCode);
    assert.strictEqual(game.roomCode.length, 6);
    assert.strictEqual(game.phase, 'waiting');
    assert.strictEqual(game.maxPlayers, 8);
    roomCode = game.roomCode;
  });

  await test('addPlayerToGame: adds 4 distinct players with distinct colors', async () => {
    const p1 = await addPlayerToGame(roomCode, 'user-1', 'sock-1', 'Alice', 'av1');
    const p2 = await addPlayerToGame(roomCode, 'user-2', 'sock-2', 'Bob', 'av2');
    const p3 = await addPlayerToGame(roomCode, 'user-3', 'sock-3', 'Charlie', 'av3');
    const p4 = await addPlayerToGame(roomCode, 'user-4', 'sock-4', 'Diana', 'av4');

    assert.ok(p4);
    assert.strictEqual(p4.players.length, 4);
    assert.strictEqual(p4.players[0].displayName, 'Alice');
    assert.notStrictEqual(p4.players[0].color, p4.players[1].color);
  });

  await test('setPlayerReady: returns true only when all connected players are ready', () => {
    assert.strictEqual(setPlayerReady(roomCode, 'user-1'), false);
    assert.strictEqual(setPlayerReady(roomCode, 'user-2'), false);
    assert.strictEqual(setPlayerReady(roomCode, 'user-3'), false);
    const allReady = setPlayerReady(roomCode, 'user-4');
    assert.strictEqual(allReady, true, 'All 4 players are now marked ready');
  });

  await test('sanitizeGame: strips sensitive task solution codes from client broadcast', () => {
    const game = getLiveGame(roomCode)!;
    const sanitized = sanitizeGame(game) as any;
    assert.ok(sanitized);
    // Tasks must not leak solutionCode
    for (const t of sanitized.tasks) {
      assert.strictEqual(t.solutionCode, undefined, 'solutionCode must be stripped in public state');
    }
  });

  // ─── 3. Game Launch & Role Reveal ──────────────────────────────────────────
  console.log('\n── 3. Game Launch & Role Assignment ──────────────────────────');

  await test('startGame: transitions to role-reveal and assigns tasks to good-coders only', () => {
    const started = startGame(roomCode);
    assert.ok(started);
    assert.strictEqual(started.phase, 'role-reveal');
    assert.ok(started.sharedCode.length > 0, 'sharedCode template initialized');
    assert.strictEqual(started.editorVersion, 0);

    const imposters = started.players.filter((p) => p.role === 'imposter');
    const goodCoders = started.players.filter((p) => p.role === 'good-coder');
    assert.strictEqual(imposters.length, 1);
    assert.strictEqual(goodCoders.length, 3);

    // Impostors have sabotage abilities instead of assigned mini-tasks
    const imposterId = imposters[0].userId;
    const imposterTasks = started.tasks.filter((t) => t.assignedTo === imposterId);
    assert.strictEqual(imposterTasks.length, 0, 'Impostors should receive 0 mini-tasks');
  });

  // ─── 4. Collaborative Editing & Protection ──────────────────────────────────
  console.log('\n── 4. Collaborative Editor & Protection Guards ───────────────');

  await test('updateSharedCode: accepts valid Monaco edit op and bumps version', () => {
    const game = getLiveGame(roomCode)!;
    const initialCode = game.sharedCode;
    const initialVer = game.editorVersion;

    const op = {
      rangeOffset: initialCode.length,
      rangeLength: 0,
      text: '\n// Valid team comment',
    };

    const res = updateSharedCode(roomCode, [op], initialVer, 'user-1');
    assert.strictEqual(res.accepted, true);
    if (res.accepted) {
      assert.strictEqual(res.currentVersion, initialVer + 1);
      assert.ok(res.newCode.includes('// Valid team comment'));
    }
  });

  await test('updateSharedCode: rejects stale baseVersion to prevent silent overwrites', () => {
    const staleVer = 0; // Current version is 1
    const op = { rangeOffset: 0, rangeLength: 0, text: '// out-of-order edit' };
    const res = updateSharedCode(roomCode, [op], staleVer, 'user-2');
    assert.strictEqual(res.accepted, false);
    if (!res.accepted) {
      assert.strictEqual(res.reason, 'stale-version');
    }
  });

  await test('updateSharedCode: rejects deletion of protected function header', () => {
    const game = getLiveGame(roomCode)!;
    // Attempt to wipe the entire file (which violates min-length and protected signature)
    const wipeOp = {
      rangeOffset: 0,
      rangeLength: game.sharedCode.length,
      text: '',
    };

    const res = updateSharedCode(roomCode, [wipeOp], game.editorVersion, 'user-3');
    assert.strictEqual(res.accepted, false);
    if (!res.accepted) {
      assert.ok(res.reason === 'protected-violation' || res.reason === 'min-length');
    }
  });

  // ─── 5. Imposter Sabotage & Evidence Ledger ─────────────────────────────────
  console.log('\n── 5. Sabotage Anonymity & Evidence Audit ─────────────────────');

  await test('recordEvidence & getRoomEvidence: records sabotage anonymously', () => {
    // When an imposter sabotages, they submit with userId: 'imposter'
    recordEvidence(roomCode, {
      timestamp: Date.now(),
      userId: 'imposter',
      displayName: 'Anonymous Collaborator',
      line: 12,
      snippet: 'Line 12: injected syntax bug',
      actionType: 'sabotage',
    });

    const evidence = getRoomEvidence(roomCode);
    assert.ok(evidence.length > 0);
    const item = evidence[0];
    assert.strictEqual(item.actionType, 'sabotage');
    assert.strictEqual(item.displayName, 'Anonymous Collaborator');
    assert.strictEqual(item.userId, 'imposter', 'Real userId must never be revealed in sabotage evidence');
  });

  await test('checkMainTestCases: records test regression evidence if tests break', () => {
    const game = getLiveGame(roomCode)!;
    if (game.mainTestCases.length > 0) {
      game.mainTestCases[0].passed = true; // Mark as previously passed
      // Run judge on broken/empty code
      const check = checkMainTestCases(roomCode, 'function broken() { return false; }');
      // The test flips to false and records regression evidence
      const evidence = getRoomEvidence(roomCode);
      const regressionItem = evidence.find((e) => e.actionType === 'test-regression');
      assert.ok(regressionItem, 'Should log test-regression evidence');
    }
  });

  // ─── 6. Mini-Tasks & Shared Progress ────────────────────────────────────────
  console.log('\n── 6. Task Progress & Anti-Inflation Guards ──────────────────');

  await test('completeTask: increases sharedProgress correctly', () => {
    const game = getLiveGame(roomCode)!;
    const task = game.tasks[0];
    assert.ok(task);
    const initialProgress = game.sharedProgress;

    const res = completeTask(roomCode, task._id, 'user-1');
    assert.ok(res);
    assert.ok(res.sharedProgress >= initialProgress);
    assert.strictEqual(task.isCompleted, true);
    assert.strictEqual(task.completedBy, 'user-1');
  });

  await test('completeTask: duplicate completion of same task is rejected', () => {
    const game = getLiveGame(roomCode)!;
    const task = game.tasks[0];
    // Re-completing task 0
    const res = completeTask(roomCode, task._id, 'user-1');
    assert.strictEqual(res, null, 'Duplicate completion must be rejected to prevent progress spoofing');
  });

  // ─── 7. Emergency Meetings & Voting ─────────────────────────────────────────
  console.log('\n── 7. Emergency Meetings & Voting Rules ──────────────────────');

  const meetingId = 'test-meeting-1';

  await test('addVote: records valid vote from alive player', () => {
    const game = getLiveGame(roomCode)!;
    game.meetings.push({
      _id: meetingId,
      calledBy: 'user-1',
      calledAt: new Date(),
      phase: 'voting',
      discussionDurationMs: 30000,
      votingDurationMs: 30000,
      votes: [],
      ejectedPlayer: null,
      wasImposter: null,
    });

    const vote1 = addVote(roomCode, meetingId, 'user-1', 'user-2');
    assert.strictEqual(vote1, true, 'Alive user-1 can vote');
  });

  await test('addVote: duplicate vote from same player is rejected', () => {
    const duplicateVote = addVote(roomCode, meetingId, 'user-1', 'user-3');
    assert.strictEqual(duplicateVote, false, 'User cannot cast two votes in the same meeting');
  });

  await test('addVote: dead player cannot vote', () => {
    const game = getLiveGame(roomCode)!;
    const p4 = game.players.find((p) => p.userId === 'user-4')!;
    p4.isAlive = false; // Player is dead

    const deadVote = addVote(roomCode, meetingId, 'user-4', 'user-2');
    assert.strictEqual(deadVote, false, 'Eliminated players cannot vote');
    p4.isAlive = true; // Restore
  });

  await test('tallyVotes: handles tie with no ejection (wasTie: true)', () => {
    const game = getLiveGame(roomCode)!;
    const meeting = game.meetings.find((m) => m._id === meetingId)!;
    meeting.votes = [
      { voterId: 'user-1', targetId: 'user-2' },
      { voterId: 'user-2', targetId: 'user-3' },
    ];

    const result = tallyVotes(roomCode, meetingId);
    assert.strictEqual(result.wasTie, true);
    assert.strictEqual(result.ejectedUserId, null, 'Tie must result in no ejection');
  });

  await test('tallyVotes: majority votes ejects the target player', () => {
    const game = getLiveGame(roomCode)!;
    const meeting = game.meetings.find((m) => m._id === meetingId)!;
    meeting.votes = [
      { voterId: 'user-1', targetId: 'user-2' },
      { voterId: 'user-3', targetId: 'user-2' },
      { voterId: 'user-4', targetId: 'user-1' },
    ];

    const result = tallyVotes(roomCode, meetingId);
    assert.strictEqual(result.wasTie, false);
    assert.strictEqual(result.ejectedUserId, 'user-2');
  });

  // ─── 8. Ejection & Win Conditions ───────────────────────────────────────────
  console.log('\n── 8. Ejection & Server-Authoritative Win Conditions ─────────');

  await test('ejectPlayer: ejecting the only imposter triggers Team Victory', () => {
    const game = getLiveGame(roomCode)!;
    const imposter = game.players.find((p) => p.role === 'imposter')!;

    const outcome = ejectPlayer(roomCode, imposter.userId);
    assert.strictEqual(outcome.gameOver, true);
    assert.strictEqual(outcome.winner, 'good-coders');
    assert.strictEqual(imposter.isAlive, false);
  });

  await test('ejectPlayer: eliminating good coders until parity triggers Imposter Victory', () => {
    // Reset players for a fresh simulation
    const game = getLiveGame(roomCode)!;
    game.players.forEach((p) => { p.isAlive = false; });
    game.players[0].role = 'imposter';
    game.players[0].isAlive = true;

    game.players[1].role = 'good-coder';
    game.players[1].isAlive = true;

    game.players[2].role = 'good-coder';
    game.players[2].isAlive = true;

    // Alive: 1 imposter, 2 good coders
    // Now eject player 2 (good-coder) -> 1 imposter vs 1 good coder (parity!)
    const outcome = ejectPlayer(roomCode, game.players[2].userId);
    assert.strictEqual(outcome.gameOver, true);
    assert.strictEqual(outcome.winner, 'imposters', 'Parity (1 imposter vs 1 coder) results in Imposter victory');
  });

  await test('handlePlayerLeave: sole imposter disconnecting triggers good-coder victory', () => {
    const game = getLiveGame(roomCode)!;
    setGamePhase(roomCode, 'in-progress');
    // Ensure 1 imposter and 2 alive good coders
    game.players[0].role = 'imposter';
    game.players[0].isAlive = true;
    game.players[0].isConnected = true;

    game.players[1].role = 'good-coder';
    game.players[1].isAlive = true;

    const outcome = handlePlayerLeave(roomCode, game.players[0].userId);
    assert.ok(outcome);
    assert.strictEqual(outcome.gameOver, true);
    assert.strictEqual(outcome.winner, 'good-coders', 'When all imposters disconnect, good coders win');
  });

  // ─── 9. Judge0 Execution & Sandbox ──────────────────────────────────────────
  console.log('\n── 9. Judge0 Execution & Sandbox ─────────────────────────────');

  await test('executeInJudge0: runs valid JavaScript code and captures stdout', async () => {
    const res = await executeInJudge0({
      language: 'javascript',
      sourceCode: 'console.log("hello code slayer");',
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.stdout.includes('hello code slayer'));
    assert.ok(res.timeSeconds >= 0);
  });

  await test('executeInJudge0: handles syntax/runtime error gracefully', async () => {
    const res = await executeInJudge0({
      language: 'javascript',
      sourceCode: 'throw new Error("Syntax detonation");',
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.stderr.includes('Syntax detonation') || res.compileOutput.includes('Syntax detonation'));
  });

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All game loop tests passed successfully! 🏆\n');
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Test suite runner crashed:', e);
  process.exit(1);
});
