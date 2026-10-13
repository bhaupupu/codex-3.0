import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Schema Definitions ────────────────────────────────────────────────────────

export const DetectiveAnalysisSchema = z.object({
  technicalSummary: z.string(),
  behaviorChanged: z.string(),
  testsAffected: z.array(z.string()),
  whyFailureOccurs: z.string(),
  supportingEvidence: z.string(),
  uncertainties: z.string(),
});
export type DetectiveAnalysis = z.infer<typeof DetectiveAnalysisSchema>;

export const ImpostorMissionSchema = z.object({
  missionId: z.string(),
  title: z.string(),
  strategicObjective: z.string(),
  suggestedSabotage: z.string(),
  restrictions: z.string(),
  successCondition: z.string(),
});
export type ImpostorMission = z.infer<typeof ImpostorMissionSchema>;

export const DeveloperReportSchema = z.object({
  profileTitle: z.string(),
  summary: z.string(),
  technicalStrengths: z.array(z.string()),
  growthAreas: z.array(z.string()),
  actionableAdvice: z.string(),
  collaborationInsight: z.string(),
});
export type DeveloperReport = z.infer<typeof DeveloperReportSchema>;

// ─── Cache & Rate Limiting ───────────────────────────────────────────────────

const analysisCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const item = analysisCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    analysisCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached(key: string, data: unknown): void {
  analysisCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── LLM Caller Helper ───────────────────────────────────────────────────────

async function callLLM(prompt: string, systemPrompt: string): Promise<string | null> {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openAiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        logger.warn('[Astra AI] OpenAI returned status ' + res.status);
        return null;
      }
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      logger.warn('[Astra AI] OpenAI fetch failed', { error: (err as Error).message });
      return null;
    }
  }

  if (geminiKey) {
    try {
      const model = process.env.AI_MODEL || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nRespond with strict JSON ONLY.\n\n${prompt}` }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      if (!res.ok) {
        logger.warn('[Astra AI] Gemini returned status ' + res.status);
        return null;
      }
      const data = await res.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch (err) {
      logger.warn('[Astra AI] Gemini fetch failed', { error: (err as Error).message });
      return null;
    }
  }

  return null;
}

// ─── Feature 1: AI Code Detective Analysis ───────────────────────────────────

export interface DetectiveEvidencePackage {
  codeBefore: string;
  codeAfter: string;
  diffSnippet: string;
  line: number;
  brokenTests: string[];
  passingTests: string[];
  challengeTitle?: string;
  language: string;
}

export async function analyzeEvidenceWithAstra(
  evidence: DetectiveEvidencePackage
): Promise<DetectiveAnalysis> {
  const cacheKey = `detective:${evidence.language}:${evidence.diffSnippet}:${evidence.brokenTests.join(',')}`;
  const cached = getCached<DetectiveAnalysis>(cacheKey);
  if (cached) return cached;

  const systemPrompt = `You are Astra, the neutral and rigorous AI Code Detective in the competitive multiplayer coding game "Code Slayer".
Your role is to analyze a code regression objectively.
IMPORTANT RULES:
1. Do NOT declare any player guilty or label anyone as the Impostor.
2. Focus exclusively on technical mechanics: what line changed, how logic shifted, which edge cases broke, and why tests failed.
3. Be concise and precise.
4. Output JSON strictly matching this schema:
{
  "technicalSummary": "A 1-2 sentence high-level description of the code diff.",
  "behaviorChanged": "Precise description of the algorithmic or data alteration.",
  "testsAffected": ["List of broken tests"],
  "whyFailureOccurs": "Technical root cause explanation (e.g. boundary condition, null dereference, off-by-one).",
  "supportingEvidence": "Exact code tokens or syntax diff showing the change.",
  "uncertainties": "What remains ambiguous or could be an innocent mistake."
}`;

  const prompt = `Challenge: ${evidence.challengeTitle || 'Algorithmic Task'} (${evidence.language})
Diff snippet at Line ${evidence.line}:
\`\`\`${evidence.language}
${evidence.diffSnippet}
\`\`\`
Failing/Broken Test Cases:
${evidence.brokenTests.length > 0 ? evidence.brokenTests.join('\n') : 'No specific regression reported'}
Code before change:
${evidence.codeBefore.slice(0, 500)}
Code after change:
${evidence.codeAfter.slice(0, 500)}`;

  const rawJson = await callLLM(prompt, systemPrompt);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const validated = DetectiveAnalysisSchema.parse(parsed);
      setCached(cacheKey, validated);
      return validated;
    } catch (parseErr) {
      logger.warn('[Astra AI] Failed to parse or validate LLM response', { error: (parseErr as Error).message });
    }
  }

  // High-fidelity deterministic fallback
  const fallback = generateDeterministicDetectiveAnalysis(evidence);
  setCached(cacheKey, fallback);
  return fallback;
}

function generateDeterministicDetectiveAnalysis(
  evidence: DetectiveEvidencePackage
): DetectiveAnalysis {
  const diff = evidence.diffSnippet;
  let why = 'The modification altered internal state or return values unexpectedly.';
  let behavior = 'Modified variable expression or control flow branch.';
  let uncertainties = 'Could be an accidental typo, an uncompleted refactor, or intentional sabotage.';

  if (/<=|<|>=|>|===|!==|==|!=/.test(diff)) {
    why = 'Comparison operator altered. Likely flipped a boundary condition or loop termination check.';
    behavior = 'Altered conditional branch evaluation logic.';
    uncertainties = 'Off-by-one errors are common in junior implementations, but timing is suspicious.';
  } else if (/null|undefined|None|nil/i.test(diff)) {
    why = 'Variable re-bound or shadowed with null/empty value, causing downstream operations to evaluate to empty.';
    behavior = 'Suppressed intermediate variable computation.';
  } else if (/\+|\-|\*|\//.test(diff)) {
    why = 'Arithmetic operator modification altered the accumulator or index computation.';
    behavior = 'Changed mathematical result of the calculation.';
  }

  return {
    technicalSummary: `Edit at Line ${evidence.line} modified code tokens: "${diff.slice(0, 60)}".`,
    behaviorChanged: behavior,
    testsAffected: evidence.brokenTests.length > 0 ? evidence.brokenTests : ['Current suite execution'],
    whyFailureOccurs: why,
    supportingEvidence: `Observed diff at Line ${evidence.line}: ${diff.slice(0, 80)}`,
    uncertainties,
  };
}

// ─── Feature 2: Impostor Co-Pilot Missions & Red Herrings ────────────────────

export async function getImpostorMission(
  language: string,
  challengeTitle: string,
  starterCode: string
): Promise<ImpostorMission> {
  const cacheKey = `mission:${language}:${challengeTitle}`;
  const cached = getCached<ImpostorMission>(cacheKey);
  if (cached) return cached;

  const systemPrompt = `You are Astra Impostor Co-Pilot. Design a subtle, balanced sabotage mission for the hidden Impostor in Code Slayer.
Output JSON strictly matching this schema:
{
  "missionId": "unique-id",
  "title": "Short catchy mission name",
  "strategicObjective": "Strategic goal to mislead teammates without instant detection",
  "suggestedSabotage": "Concrete, reversible code change suggestion",
  "restrictions": "Cooldown and safety rules",
  "successCondition": "Verifiable outcome (e.g. 1 edge case fails while public tests pass)"
}`;

  const prompt = `Language: ${language}\nChallenge: ${challengeTitle}\nStarter Code:\n${starterCode.slice(0, 400)}`;

  const rawJson = await callLLM(prompt, systemPrompt);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const validated = ImpostorMissionSchema.parse(parsed);
      setCached(cacheKey, validated);
      return validated;
    } catch { /* fallback */ }
  }

  // Predefined Curated Missions Library
  const missionsByLang: Record<string, ImpostorMission[]> = {
    javascript: [
      {
        missionId: 'js-boundary-infiltrate',
        title: 'Boundary Infiltration',
        strategicObjective: 'Flip a boundary condition (<= to <) so that array endpoints fail while common cases pass.',
        suggestedSabotage: 'Target loop boundaries or slice indices. Change `<=` to `<` or `index + 1` to `index`.',
        restrictions: 'Do not delete function signatures. Cooldown applies.',
        successCondition: 'Break edge-case tests while keeping sample tests passing.',
      },
      {
        missionId: 'js-shadow-variable',
        title: 'Variable Obfuscation',
        strategicObjective: 'Re-bind an internal accumulator variable to null or 0 immediately after initialization.',
        suggestedSabotage: 'Use Variable Shadow ability on the main accumulator.',
        restrictions: 'One variable per cooldown window.',
        successCondition: 'Cause tests expecting non-zero results to fail silently.',
      },
      {
        missionId: 'js-red-herring-divert',
        title: 'Red Herring Diversion',
        strategicObjective: 'Divert attention during meetings by arguing the bug is in input parsing rather than the algorithm.',
        suggestedSabotage: 'Use Red Herring ability to generate a plausible false theory.',
        restrictions: 'Must present argument persuasively in chat.',
        successCondition: 'Survive the emergency meeting without being eliminated.',
      },
    ],
    python: [
      {
        missionId: 'py-off-by-one',
        title: 'Off-By-One Ambush',
        strategicObjective: 'Shift range iteration from len(arr) to len(arr) - 1 to miss the last element.',
        suggestedSabotage: 'Subtly change range arguments or negative indices.',
        restrictions: 'Preserve indentation and function signatures.',
        successCondition: 'One edge case fails while general tests pass.',
      },
    ],
  };

  const pool = missionsByLang[language.toLowerCase()] || missionsByLang.javascript;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  setCached(cacheKey, selected);
  return selected;
}

export async function generateRedHerringHypothesis(
  language: string,
  challengeTitle: string,
  snippet: string
): Promise<{ hypothesis: string; argumentPoints: string[] }> {
  const systemPrompt = `You are Astra Impostor Co-Pilot. Generate a plausible, convincing, but technically misleading debugging hypothesis for an Impostor to argue in an emergency meeting.
Output JSON:
{
  "hypothesis": "Plausible false explanation of why tests are failing",
  "argumentPoints": ["3 short talking points to cite in discussion chat"]
}`;

  const prompt = `Challenge: ${challengeTitle} (${language})\nRecent code:\n${snippet.slice(0, 300)}`;

  const rawJson = await callLLM(prompt, systemPrompt);
  if (rawJson) {
    try {
      return JSON.parse(rawJson);
    } catch { /* fallback */ }
  }

  // High-fidelity fallback
  return {
    hypothesis: 'The issue appears to be an unhandled type coercion or whitespace parsing glitch on empty input, rather than the core logic.',
    argumentPoints: [
      'Look at the input format: empty or negative values might be bypassing the initial check.',
      'The loop logic looks standard — the discrepancy is likely in the return format expectation.',
      'Let us double check if the test case expects a stringified output instead of an array.',
    ],
  };
}

// ─── Feature 3: Post-Match Developer Intelligence ───────────────────────────

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

export async function generateDeveloperReport(
  metrics: PlayerMatchMetrics
): Promise<DeveloperReport> {
  const cacheKey = `report:${metrics.displayName}:${metrics.role}:${metrics.tasksCompleted}:${metrics.testsPassed}`;
  const cached = getCached<DeveloperReport>(cacheKey);
  if (cached) return cached;

  const systemPrompt = `You are Astra Developer Intelligence. Generate a constructive, educational, and personalized post-match developer report for a player in Code Slayer.
RULES:
1. Distinguish gaming deception strategy from coding skill: an Impostor may play strategically without that reflecting poor software engineering skills.
2. Ground all observations in verified match metrics.
3. Be encouraging, actionable, and analytical.
Output JSON strictly matching this schema:
{
  "profileTitle": "A concise title (e.g. Strategic Bug Hunter, Resilient Systems Builder)",
  "summary": "2-3 sentence overview of player impact and gameplay style",
  "technicalStrengths": ["2-3 specific technical strengths demonstrated"],
  "growthAreas": ["1-2 actionable technical or debugging growth areas"],
  "actionableAdvice": "Specific actionable suggestion for their next match or coding session",
  "collaborationInsight": "Observation on how they worked with or challenged teammates"
}`;

  const prompt = `Player: ${metrics.displayName}
Role: ${metrics.role === 'imposter' ? 'Impostor' : 'Developer / Good Coder'}
Outcome: ${metrics.isWinner ? 'Victory' : 'Defeat'}
Tasks Completed: ${metrics.tasksCompleted} / ${metrics.totalTeamTasks}
Code Edits Recorded: ${metrics.codeEditsCount}
Tests Passed: ${metrics.testsPassed}
Bugs/Regressions Fixed: ${metrics.bugsFixed}
Regressions Introduced: ${metrics.bugsIntroduced}
Evidence Citations in Meetings: ${metrics.evidenceCitations}
Team Final Progress: ${metrics.finalTeamProgress}%
Language: ${metrics.language}`;

  const rawJson = await callLLM(prompt, systemPrompt);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const validated = DeveloperReportSchema.parse(parsed);
      setCached(cacheKey, validated);
      return validated;
    } catch { /* fallback */ }
  }

  // Deterministic Fallback Generator
  const fallback = generateDeterministicDeveloperReport(metrics);
  setCached(cacheKey, fallback);
  return fallback;
}

function generateDeterministicDeveloperReport(metrics: PlayerMatchMetrics): DeveloperReport {
  const isImposter = metrics.role === 'imposter';

  if (isImposter) {
    return {
      profileTitle: metrics.isWinner ? 'Master of Deception' : 'Undercover Tactician',
      summary: `${metrics.displayName} executed ${metrics.bugsIntroduced} strategic code changes while navigating team scrutiny. Sabotage attempts pushed the team to debug deeper.`,
      technicalStrengths: [
        'Nuanced understanding of code failure points and boundary vulnerabilities',
        'Ability to read and alter team code under active development',
      ],
      growthAreas: [
        'Time sabotage actions immediately after large commits to blend in with teammate edits',
      ],
      actionableAdvice: 'Focus on boundary operator swaps (e.g. <= to <); they are the hardest to detect during rapid code reviews.',
      collaborationInsight: `Cited evidence ${metrics.evidenceCitations} times in meetings, actively participating in team discourse.`,
    };
  }

  const title =
    metrics.tasksCompleted >= 3
      ? 'High-Velocity Builder'
      : metrics.bugsFixed > 0
        ? 'Relentless Debugger'
        : 'Collaborative Contributor';

  return {
    profileTitle: title,
    summary: `${metrics.displayName} completed ${metrics.tasksCompleted} mini-tasks and contributed ${metrics.codeEditsCount} verified code edits, advancing team progress to ${metrics.finalTeamProgress}%.`,
    technicalStrengths: [
      `Reliable implementation of core algorithmic tasks in ${metrics.language}`,
      metrics.bugsFixed > 0
        ? 'Active regression detection and rapid patch application'
        : 'Consistent task throughput and editor collaboration',
    ],
    growthAreas: [
      metrics.bugsIntroduced > 0
        ? 'Run localized test assertions before committing large multi-line rewrites'
        : 'Increase participation in emergency meeting evidence citations',
    ],
    actionableAdvice: 'Use the execution console early and frequently to test incremental progress before merging helper functions.',
    collaborationInsight: `Contributed steadily to the shared codebase and participated in ${metrics.evidenceCitations} evidence discussions.`,
  };
}
