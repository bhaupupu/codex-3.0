import { logger } from '../utils/logger';
import { runTestCases, TestCase, RunResult } from './taskRunner.service';

export interface Judge0ExecutionRequest {
  language: string; // 'javascript' | 'python' | 'cpp'
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimit?: number; // seconds
  memoryLimitKb?: number;
}

export interface Judge0ExecutionResponse {
  success: boolean;
  sandbox: 'judge0' | 'local-dev-fallback';
  statusId: number;
  statusDescription: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeSeconds: number;
  memoryKb: number;
  passed?: boolean;
}

// ─── Judge0 Language Mapping ──────────────────────────────────────────────────
// Default mapped to standard Judge0 CE / RapidAPI language IDs
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, // JavaScript (Node.js 12.14.0 or modern)
  js: 63,
  python: 71,     // Python (3.8.1 / 3.11)
  py: 71,
  cpp: 54,        // C++ (GCC 9.2.0 / GCC 14)
  'c++': 54,
};

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || '';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

export function isJudge0Configured(): boolean {
  return Boolean(JUDGE0_API_URL && (JUDGE0_API_KEY || JUDGE0_API_URL.includes('localhost') || JUDGE0_API_URL.includes('127.0.0.1')));
}

// ─── Direct Judge0 API Execution ──────────────────────────────────────────────
export async function executeInJudge0(req: Judge0ExecutionRequest): Promise<Judge0ExecutionResponse> {
  const languageId = JUDGE0_LANGUAGE_IDS[req.language.toLowerCase()] ?? 63;

  if (!isJudge0Configured()) {
    logger.debug('[Judge0] Credentials not configured — running through local dev fallback');
    return runLocalFallback(req);
  }

  const endpoint = `${JUDGE0_API_URL.replace(/\/+$/, '')}/submissions?base64_encoded=false&wait=true`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (JUDGE0_API_KEY) {
    if (JUDGE0_API_HOST) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = JUDGE0_API_HOST;
    } else {
      headers['X-Auth-Token'] = JUDGE0_API_KEY;
    }
  }

  const payload = {
    source_code: req.sourceCode,
    language_id: languageId,
    stdin: req.stdin || '',
    expected_output: req.expectedOutput || undefined,
    cpu_time_limit: req.cpuTimeLimit || 5,
    memory_limit: req.memoryLimitKb || 128000,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      logger.warn('[Judge0] Submission failed with status ' + res.status, { details: errText.slice(0, 200) });
      return runLocalFallback(req);
    }

    const data = await res.json() as {
      status?: { id: number; description: string };
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      time?: string | null;
      memory?: number | null;
    };

    const statusId = data.status?.id ?? 0;
    const statusDescription = data.status?.description ?? 'Unknown';
    const stdout = data.stdout ?? '';
    const stderr = data.stderr ?? '';
    const compileOutput = data.compile_output ?? '';
    const timeSeconds = data.time ? parseFloat(data.time) : 0;
    const memoryKb = data.memory ?? 0;

    const passed = statusId === 3; // 3 = Accepted in Judge0

    return {
      success: true,
      sandbox: 'judge0',
      statusId,
      statusDescription,
      stdout,
      stderr,
      compileOutput,
      timeSeconds,
      memoryKb,
      passed,
    };
  } catch (err) {
    logger.warn('[Judge0] API request error, falling back to local sandbox', {
      error: (err as Error).message,
    });
    return runLocalFallback(req);
  }
}

// ─── Local Dev Sandbox Fallback ───────────────────────────────────────────────
function runLocalFallback(req: Judge0ExecutionRequest): Judge0ExecutionResponse {
  // Use taskRunner for safe local sandbox execution
  const testCase: TestCase = {
    input: req.stdin || '',
    expectedOutput: req.expectedOutput || '',
  };

  const startTime = Date.now();
  const runRes: RunResult = runTestCases(req.language, req.sourceCode, [testCase]);
  const durationMs = Date.now() - startTime;

  const firstVerdict = runRes.verdicts[0];
  const passed = runRes.allPassed;

  return {
    success: true,
    sandbox: 'local-dev-fallback',
    statusId: passed ? 3 : (firstVerdict?.error ? 6 : 4),
    statusDescription: passed ? 'Accepted' : (firstVerdict?.error ? 'Runtime Error' : 'Wrong Answer'),
    stdout: firstVerdict?.actual || '',
    stderr: firstVerdict?.error || '',
    compileOutput: firstVerdict?.error || '',
    timeSeconds: durationMs / 1000,
    memoryKb: 24000,
    passed,
  };
}

// ─── Execute Challenge Test Suite in Sandbox ──────────────────────────────────
export interface ChallengeTestResult {
  id: string;
  description: string;
  passed: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export interface ChallengeSuiteVerdict {
  allPassed: boolean;
  sandbox: 'judge0' | 'local-dev-fallback';
  compileError?: string;
  verdicts: ChallengeTestResult[];
}

export async function evaluateCodeWithJudge0Sandbox(
  language: string,
  sourceCode: string,
  testCases: Array<{ id: string; description: string; input?: string; expectedOutput?: string }>
): Promise<ChallengeSuiteVerdict> {
  const verdicts: ChallengeTestResult[] = [];
  const sandboxType = isJudge0Configured() ? 'judge0' : 'local-dev-fallback';

  for (const tc of testCases) {
    const res = await executeInJudge0({
      language,
      sourceCode,
      stdin: tc.input || '',
      expectedOutput: tc.expectedOutput || '',
    });

    if (res.compileOutput && res.statusId === 6) {
      return {
        allPassed: false,
        sandbox: sandboxType,
        compileError: res.compileOutput,
        verdicts: testCases.map((t) => ({
          id: t.id,
          description: t.description,
          passed: false,
          error: res.compileOutput,
        })),
      };
    }

    verdicts.push({
      id: tc.id,
      description: tc.description,
      passed: Boolean(res.passed),
      output: res.stdout || undefined,
      error: res.stderr || undefined,
      executionTime: res.timeSeconds,
    });
  }

  return {
    allPassed: verdicts.length > 0 && verdicts.every((v) => v.passed),
    sandbox: sandboxType,
    verdicts,
  };
}
