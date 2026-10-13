import { GameState, PlayerState } from './game';

export interface EditorOp {
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

export interface TaskVerdict {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

export interface ServerToClientEvents {
  'room:state': (game: GameState) => void;
  'room:player-joined': (player: Partial<PlayerState> & { userId: string }) => void;
  'room:player-left': (data: { userId: string }) => void;
  'room:player-disconnected': (data: { userId: string }) => void;
  'room:ready-update': (data: { userId: string; readyToStart: boolean }) => void;
  'room:error': (data: { message: string }) => void;
  'room:settings-updated': (data: { settings: { imposterCount: number; tasksPerPlayer: number; impostorCooldownMs: number; discussionTimeMs: number; votingTimeMs: number } }) => void;

  'game:start': (data: { phase: string }) => void;
  'game:role-reveal': (data: { role: string; color: string }) => void;
  'game:phase-change': (data: { phase: string; timestamp?: number; game?: GameState }) => void;
  'game:timer-tick': (data: { remainingMs: number }) => void;
  'game:end': (data: { winner: 'good-coders' | 'imposters'; game?: GameState }) => void;


  'editor:ydoc-sync': (data: { roomCode: string; update: ArrayBuffer }) => void;
  'editor:op-apply': (data: { userId: string; ops: EditorOp[]; version: number }) => void;
  'editor:resync': (data: { fullContent: string; version: number }) => void;
  'editor:protected-violation': (data: { reason: 'protected-violation' | 'min-length'; violationName: string; message: string }) => void;
  'editor:cursor-update': (data: { userId: string; line: number; column: number; color: string; displayName: string }) => void;
  'editor:test-results': (data: { testCases: { id: string; description: string; passed: boolean }[] }) => void;
  'editor:execution-result': (data: {
    success: boolean;
    sandbox: string;
    compileError?: string;
    verdicts: Array<{ id: string; description: string; passed: boolean; output?: string; error?: string; executionTime?: number }>;
    allPassed: boolean;
    timestamp: number;
    error?: string;
  }) => void;
  'editor:submit-result': (data: { success: boolean; message: string }) => void;

  'task:result': (data: { taskId: string; passed: boolean; feedback: string; verdicts: TaskVerdict[]; supported: boolean }) => void;
  'task:completed': (data: { taskId: string; completedBy: string; completedByName: string; sharedProgress: number }) => void;
  'task:progress-update': (data: { sharedProgress: number }) => void;

  'imposter:bug-injected': (data: { affectedLine: number }) => void;
  'imposter:screen-blurred': (data: { durationMs: number }) => void;
  'imposter:cooldown-update': (data: { action: string; remainingMs: number; startCooldown?: boolean; cooldownMs?: number; applied?: boolean }) => void;
  'imposter:keyboard-locked': (data: { durationMs: number }) => void;

  'meeting:start': (data: {
    meetingId: string;
    calledBy: string;
    calledByName: string;
    phase: string;
    discussionMs: number;
    votingMs: number;
    evidence?: Array<{
      id: string;
      timestamp: number;
      userId: string;
      displayName: string;
      line: number;
      snippet: string;
      actionType: string;
      affectedDescription?: string;
      causedTestRegression?: boolean;
    }>;
  }) => void;
  'meeting:evidence': (data: {
    evidence: Array<{
      id: string;
      timestamp: number;
      userId: string;
      displayName: string;
      line: number;
      snippet: string;
      actionType: string;
      affectedDescription?: string;
      causedTestRegression?: boolean;
    }>;
  }) => void;
  'meeting:vote-cast': (data: { voterId: string; hasVoted: boolean }) => void;
  'meeting:phase-change': (data: { meetingId: string; phase: string }) => void;
  'meeting:results': (data: { meetingId: string; tally: Record<string, number>; ejected: { userId: string; displayName: string; role: string; wasImposter: boolean } | null; wasTie: boolean }) => void;
  'meeting:end': (data: { meetingId: string; phase: string }) => void;

  'chat:message': (data: { messageId: string; userId: string; displayName: string; message: string; color: string; timestamp: number }) => void;
  'chat:system': (data: { type: 'leave' | 'join' | 'system'; message: string; timestamp: number }) => void;
  'chat:clear': (data: { reason: string }) => void;
  'chat:error': (data: { message: string }) => void;

  'session:force-logout': (data: { reason: string; message: string }) => void;

  // Feature 1: AI Code Detective
  'detective:analysis-result': (data: { evidenceId: string; analysis?: DetectiveAnalysis; error?: string }) => void;

  // Feature 2: Impostor Co-Pilot
  'imposter:mission': (data: { mission: ImpostorMission }) => void;
  'imposter:red-herring': (data: { hypothesis: string; argumentPoints: string[] }) => void;

  // Feature 3: Post-Match Developer Intelligence
  'report:developer-intelligence': (data: { report: DeveloperReport; metrics: PlayerMatchMetrics }) => void;
}

export interface PlayerMatchMetrics {
  displayName: string;
  role: 'good-coder' | 'imposter';
  isWinner: boolean;
  tasksCompleted: number;
  totalTeamTasks: number;
  testsPassed: number;
  bugsIntroduced: number;
  bugsFixed: number;
  codeEditsCount: number;
  evidenceCitations: number;
  matchDurationMs: number;
  finalTeamProgress: number;
  language: string;
  challengeTitle?: string;
}

export interface DetectiveAnalysis {
  technicalSummary: string;
  behaviorChanged: string;
  testsAffected: string[];
  whyFailureOccurs: string;
  supportingEvidence: string;
  uncertainties: string;
}

export interface ImpostorMission {
  missionId: string;
  title: string;
  strategicObjective: string;
  suggestedSabotage: string;
  restrictions: string;
  successCondition: string;
}

export interface DeveloperReport {
  profileTitle: string;
  summary: string;
  technicalStrengths: string[];
  growthAreas: string[];
  actionableAdvice: string;
  collaborationInsight: string;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string }) => void;
  'room:leave': (data: { roomCode: string }) => void;
  'room:player-ready': (data: { roomCode: string }) => void;
  'room:force-start': (data: { roomCode: string }) => void;
  'room:update-settings': (data: { roomCode: string; settings: Partial<{ imposterCount: number; tasksPerPlayer: number; impostorCooldownMs: number; discussionTimeMs: number; votingTimeMs: number }> }) => void;
  'room:reset': (data: { roomCode: string }) => void;

  'editor:ydoc-sync': (data: { roomCode: string; update: ArrayBuffer }) => void;
  'editor:op': (data: { roomCode: string; ops: EditorOp[]; baseVersion: number }) => void;
  'editor:cursor-move': (data: { roomCode: string; line: number; column: number }) => void;
  'editor:request-state': (data: { roomCode: string }) => void;
  'editor:run-tests': (data: { roomCode: string }) => void;
  'editor:submit-code': (data: { roomCode: string }) => void;

  'task:submit': (data: { roomCode: string; taskId: string; submittedCode: string }) => void;


  'imposter:inject-bug': (data: { roomCode: string }) => void;
  'imposter:blur-screen': (data: { roomCode: string; targetUserId: string }) => void;
  'imposter:variable-shadow': (data: { roomCode: string }) => void;
  'imposter:lock-keyboard': (data: { roomCode: string; targetUserId: string }) => void;

  // Feature 2: Impostor Co-Pilot
  'imposter:get-mission': (data: { roomCode: string }) => void;
  'imposter:get-red-herring': (data: { roomCode: string }) => void;
  'imposter:deploy-red-herring': (data: { roomCode: string; text: string }) => void;

  'meeting:call': (data: { roomCode: string }) => void;
  'meeting:vote': (data: { roomCode: string; meetingId: string; targetId: string }) => void;
  'meeting:get-evidence': (data: { roomCode: string }) => void;
  'chat:present-evidence': (data: { roomCode: string; evidenceId: string }) => void;

  // Feature 1: AI Code Detective
  'detective:analyze-evidence': (data: { roomCode: string; evidenceId: string }) => void;
  'detective:cite-analysis': (data: { roomCode: string; evidenceId: string }) => void;

  // Feature 3: Post-Match Developer Intelligence
  'report:get-developer-intelligence': (data: { roomCode: string }) => void;

  'chat:send': (data: { roomCode: string; message: string }) => void;
}
