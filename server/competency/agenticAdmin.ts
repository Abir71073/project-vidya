import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { Suggestion, SuggestionType, WeeklyDigest, DigestInsight, Enrolment } from './types';
import { getAnalyticsSnapshot, LearnerAnalyticsSnapshot, createEnrolment } from './store';
import { getCoursesForCompetency } from './catalogue';

// ============================================================================
// AGENTIC ADMIN ASSISTANT — explicitly NOT autonomous decision-making.
//
// This module's AI call only ever PROPOSES insights and Suggestion records.
// Nothing here writes to a learner's profile, scores, or enrolments. The only
// place a Suggestion can cause a real data change is approveSuggestion() below,
// and that only runs when a human administrator explicitly clicks Approve in
// the UI (server.ts's route requires an authenticated admin requesterId, same
// as the rest of the Admin Dashboard). A Suggestion record, once created, is
// never deleted — its status/reviewedAt/reviewedBy are updated in place, so
// the full suggestions list IS the permanent audit log (Section 4's hard
// requirement) — see listAllSuggestions() below.
//
// FAIRNESS CONSTRAINT: the prompt built here only ever reasons over the
// whitelisted LearnerAnalyticsSnapshot (competency scores, gaps, engagement/
// completion data, department-as-org-grouping) from store.ts's
// getAnalyticsSnapshot() — never any demographic field. See that function's
// own header comment for the enforcement detail.
// ============================================================================

const DATA_DIR = path.join(process.cwd(), 'generated', 'mospi');
const DIGESTS_PATH = path.join(DATA_DIR, 'digests.json');
const SUGGESTIONS_PATH = path.join(DATA_DIR, 'suggestions.json');

// A learner with no recorded activity in this many days is flagged as
// disengaged in the digest prompt.
const DISENGAGED_THRESHOLD_DAYS = 30;

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

interface RawSuggestion {
  learnerId: string;
  type: SuggestionType;
  reasoning: string;
  dataPoints: string[];
  /** Only meaningful when type === 'recommend-course' — resolved against the real catalogue below, never trusted as a literal course id from the model. */
  competencyId?: string;
}

interface RawDigestResponse {
  insights: DigestInsight[];
  suggestions: RawSuggestion[];
}

function buildPrompt(snapshot: LearnerAnalyticsSnapshot[]): string {
  // Only the whitelisted fields go into the prompt payload — see this file's
  // header comment and getAnalyticsSnapshot()'s. displayName is included so
  // the AI can write readable insight text, not because it's analyzed.
  const dataPayload = snapshot.map((s) => ({
    learnerId: s.learnerId,
    name: s.displayName,
    department: s.department,
    scores: s.competencyScores.map((c) => ({ competency: c.name, competencyId: c.competencyId, current: c.score, history: c.trend })),
    openGaps: s.gaps.filter((g) => g.gap > 0).map((g) => ({ competency: g.name, competencyId: g.competencyId, actual: g.actual, expected: g.expected, gap: g.gap })),
    daysSinceLastActivity: s.daysSinceLastActivity,
    completedCourseCount: s.completedCourseCount,
  }));

  return `You are an analytics assistant for an administrator overseeing officials' skill development on a government training platform. You do NOT make decisions — you only surface insights and propose suggestions that a human administrator will individually approve or dismiss.

Analyze ONLY the competency-score, gap, and engagement data below. Do not speculate about anything not present in this data (no demographic assumptions, no inferences beyond what the numbers show).

Data (one entry per learner):
${JSON.stringify(dataPayload, null, 2)}

A learner with daysSinceLastActivity >= ${DISENGAGED_THRESHOLD_DAYS} (or null, meaning no activity ever recorded) is considered disengaged.
A competency's "history" array is its score over successive assessments in order — a declining or flat trend across 2+ entries is stagnation/decline worth flagging.

Produce:
1. "insights": 4 to 6 plain-language bullet insights (short, specific, no jargon-dump), covering whichever of these categories actually apply to the data — don't force a category that has no real signal: stagnant/declining scores, growing department-level gaps, disengaged learners, standout high performers. Each insight must cite the specific learner(s)/competency/numbers behind it, not a vague generality.
2. "suggestions": one entry for each insight that implies a concrete possible action. type is exactly one of "recommend-course" (learner has an open gap worth training — include competencyId), "flag-checkin" (learner is disengaged and an admin should reach out), or "recognize-performer" (a standout performer worth acknowledging, no competencyId needed). Every suggestion must include specific dataPoints (short strings, e.g. "Survey Design score fell 72 -> 58 -> 45 across 3 assessments") backing its reasoning — never a suggestion with no data cited.

Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{
  "insights": [ { "summary": "...", "learnerIds": ["..."], "dataPoints": ["..."] } ],
  "suggestions": [ { "learnerId": "...", "type": "recommend-course", "reasoning": "...", "dataPoints": ["..."], "competencyId": "..." } ]
}`;
}

async function callGroq(prompt: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-120b',
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0]?.message?.content || '{}';
}

async function callGemini(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [{ text: prompt }],
    config: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' },
  });
  return response.text || '{}';
}

function parseAndValidate(raw: string, validLearnerIds: Set<string>): RawDigestResponse | null {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const insights: DigestInsight[] = (Array.isArray(parsed.insights) ? parsed.insights : [])
    .filter((i: any) => i && typeof i.summary === 'string' && i.summary.trim())
    .map((i: any) => ({
      summary: i.summary.trim(),
      learnerIds: (Array.isArray(i.learnerIds) ? i.learnerIds : []).filter((id: any) => validLearnerIds.has(id)),
      dataPoints: (Array.isArray(i.dataPoints) ? i.dataPoints : []).filter((d: any) => typeof d === 'string'),
    }));

  if (insights.length === 0) return null;

  const validTypes: SuggestionType[] = ['recommend-course', 'flag-checkin', 'recognize-performer'];
  const suggestions: RawSuggestion[] = (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
    .filter((s: any) => s && validLearnerIds.has(s.learnerId) && validTypes.includes(s.type) && typeof s.reasoning === 'string' && s.reasoning.trim())
    .map((s: any) => ({
      learnerId: s.learnerId,
      type: s.type,
      reasoning: s.reasoning.trim(),
      dataPoints: (Array.isArray(s.dataPoints) ? s.dataPoints : []).filter((d: any) => typeof d === 'string'),
      competencyId: typeof s.competencyId === 'string' ? s.competencyId : undefined,
    }));

  return { insights, suggestions };
}

/**
 * Generates a new weekly digest: gathers the analytics snapshot, asks Groq
 * (retried once, then Gemini as a fallback — same crash-proofing shape as
 * server/competency/generateAssessment.ts) to identify insights, resolves any
 * course-recommendation suggestions against the real catalogue, and persists
 * both the digest and its suggestions. Returns null (never throws) if all
 * attempts fail — the caller (server.ts) turns that into a clean "insights
 * temporarily unavailable" response rather than a 500.
 */
export async function generateDigest(): Promise<WeeklyDigest | null> {
  const snapshot = await getAnalyticsSnapshot();
  if (snapshot.length === 0) {
    // Nothing to analyze yet — a real, non-error state, not a failure.
    const digest: WeeklyDigest = { id: randomUUID(), generatedAt: new Date().toISOString(), insights: [], suggestionIds: [] };
    await saveDigest(digest);
    return digest;
  }

  const validLearnerIds = new Set(snapshot.map((s) => s.learnerId));
  const prompt = buildPrompt(snapshot);

  const attempts: { label: string; call: () => Promise<string> }[] = [
    { label: 'Groq (attempt 1)', call: () => callGroq(prompt) },
    { label: 'Groq (retry)', call: () => callGroq(prompt) },
    { label: 'Gemini (fallback)', call: () => callGemini(prompt) },
  ];

  let result: RawDigestResponse | null = null;
  for (const attempt of attempts) {
    try {
      const raw = await attempt.call();
      result = parseAndValidate(raw, validLearnerIds);
      if (result) break;
      console.error(`Digest generation via ${attempt.label} returned malformed/empty output — trying next.`);
    } catch (err) {
      console.error(`Digest generation via ${attempt.label} failed:`, err);
    }
  }

  if (!result) return null;

  const digestId = randomUUID();
  const now = new Date().toISOString();

  // Resolve each course-recommendation suggestion's competencyId against the
  // real catalogue server-side — the AI's competencyId is just a pointer, the
  // actual Course record it maps to is never trusted from model output.
  const suggestions: Suggestion[] = result.suggestions.map((s) => {
    let suggestedCourseId: string | undefined;
    if (s.type === 'recommend-course' && s.competencyId) {
      const courses = getCoursesForCompetency(s.competencyId);
      const course = courses.find((c) => c.provider === 'iGOT Karmayogi') || courses[0];
      suggestedCourseId = course?.id;
    }
    return {
      id: randomUUID(),
      learnerId: s.learnerId,
      type: s.type,
      reasoning: s.reasoning,
      dataPoints: s.dataPoints,
      suggestedCourseId,
      status: 'pending',
      createdAt: now,
      digestId,
    };
  });

  const digest: WeeklyDigest = { id: digestId, generatedAt: now, insights: result.insights, suggestionIds: suggestions.map((s) => s.id) };

  await saveDigest(digest);
  const all = await readJson<Suggestion[]>(SUGGESTIONS_PATH, []);
  await writeJson(SUGGESTIONS_PATH, [...all, ...suggestions]);

  return digest;
}

async function saveDigest(digest: WeeklyDigest): Promise<void> {
  const all = await readJson<WeeklyDigest[]>(DIGESTS_PATH, []);
  await writeJson(DIGESTS_PATH, [...all, digest]);
}

export async function getLatestDigest(): Promise<WeeklyDigest | null> {
  const all = await readJson<WeeklyDigest[]>(DIGESTS_PATH, []);
  if (all.length === 0) return null;
  return [...all].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
}

/** Every suggestion ever generated, regardless of status — the permanent audit log (Section 4). */
export async function listAllSuggestions(): Promise<Suggestion[]> {
  const all = await readJson<Suggestion[]>(SUGGESTIONS_PATH, []);
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listPendingSuggestions(): Promise<Suggestion[]> {
  const all = await listAllSuggestions();
  return all.filter((s) => s.status === 'pending');
}

async function updateSuggestion(id: string, patch: Partial<Suggestion>): Promise<Suggestion | null> {
  const all = await readJson<Suggestion[]>(SUGGESTIONS_PATH, []);
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeJson(SUGGESTIONS_PATH, all);
  return all[idx];
}

/**
 * The ONLY function in this whole module that can cause a real data change —
 * and only because a human administrator explicitly invoked it (server.ts's
 * route enforces the admin role check before calling this). For a
 * 'recommend-course' suggestion, this calls the exact same createEnrolment()
 * that LearningPaths.tsx's manual "Enrol" button already calls via
 * /api/enrolments — reusing that real enrolment path, not a separate one.
 * 'flag-checkin' and 'recognize-performer' suggestions have no direct data
 * mutation to perform (they're informational nudges for the admin); approving
 * one just records that the admin acknowledged/agreed with it.
 */
export async function approveSuggestion(id: string, reviewerId: string): Promise<{ suggestion: Suggestion; enrolment: Enrolment | null } | null> {
  const all = await readJson<Suggestion[]>(SUGGESTIONS_PATH, []);
  const existing = all.find((s) => s.id === id);
  if (!existing) return null;
  if (existing.status !== 'pending') {
    return { suggestion: existing, enrolment: null }; // already reviewed — no-op, not an error
  }

  let enrolment: Enrolment | null = null;
  if (existing.type === 'recommend-course' && existing.suggestedCourseId) {
    enrolment = await createEnrolment(existing.learnerId, existing.suggestedCourseId);
  }

  const updated = await updateSuggestion(id, { status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: reviewerId });
  return { suggestion: updated!, enrolment };
}

/** Dismissing a suggestion changes only the suggestion record itself — never the learner's profile, scores, or enrolments. */
export async function dismissSuggestion(id: string, reviewerId: string): Promise<Suggestion | null> {
  const existing = (await readJson<Suggestion[]>(SUGGESTIONS_PATH, [])).find((s) => s.id === id);
  if (!existing) return null;
  if (existing.status !== 'pending') return existing; // already reviewed — no-op

  return updateSuggestion(id, { status: 'dismissed', reviewedAt: new Date().toISOString(), reviewedBy: reviewerId });
}
