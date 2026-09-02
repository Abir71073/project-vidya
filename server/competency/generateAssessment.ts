import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { CompetencyDefinition } from './types';

export type AssessmentDifficulty = 'Easy' | 'Medium' | 'Hard';

// Section 4's explicit floor — "reliably returns at least 10 questions per
// assessment" regardless of how few competencies are selected or how thin the
// old questionsPerCompetency=2 default used to leave it.
export const MIN_QUESTIONS = 10;

export interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  competencyId: string;
}

export interface GeneratedAssessment {
  title: string;
  questions: AssessmentQuestion[];
}

const DIFFICULTY_GUIDANCE: Record<AssessmentDifficulty, string> = {
  Easy: 'Fundamental recall and single-step application — testing whether the official knows the core definitions, standard procedures, and basic terminology, not edge cases.',
  Medium: 'Applied scenario questions that require combining two related concepts or interpreting a small worked example — the level a working official uses day-to-day, not textbook recall.',
  Hard: 'Complex, multi-step reasoning: edge cases, conflicting constraints, or synthesizing across sub-topics within the competency — the level expected of someone training others in it.',
};

function buildPrompt(opts: {
  defs: CompetencyDefinition[];
  language: string;
  difficulty: AssessmentDifficulty;
  totalQuestions: number;
  materialText?: string;
}): string {
  const { defs, language, difficulty, totalQuestions, materialText } = opts;
  const competencyList = defs.map((c) => `- id: "${c.id}", name: "${c.name}", domain: "${c.domain}"`).join('\n');
  const materialClause = materialText
    ? `\n\nBase the questions on the following uploaded material where relevant to each competency (this is real training material provided by the user — mine it for actual content, don't just generate generic questions and ignore it):\n"""\n${materialText.slice(0, 12000)}\n"""`
    : '';

  return `Generate a competency assessment quiz for officials in India's Official Statistical System (MoSPI).

Cover EXACTLY these competencies:
${competencyList}${materialClause}

Produce EXACTLY ${totalQuestions} questions in TOTAL, distributed as evenly as possible across the competencies listed above — every competency listed must get at least 1 question. Do not produce fewer than ${totalQuestions} questions under any circumstance; if that means asking more than one question per competency, do that.

Difficulty level: ${difficulty}. ${DIFFICULTY_GUIDANCE[difficulty]}

Every question must be written entirely in ${language}, with correct grammar and correct native technical terminology (transliterate only internationally standard terms/symbols that have no ${language} equivalent).
Each question must test real understanding of its specific competency at the stated difficulty (not a generic "what is X" question) and include exactly 4 options, one correct answer index (0-based), and a substantive explanation of why the correct answer is right.

Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{
  "title": "Short title for this assessment, in ${language}",
  "questions": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "...", "competencyId": "one of the ids listed above" }
  ]
}`;
}

/** Parses and validates a raw model response. Returns null (never throws) if malformed or too short — the caller decides what to do next (retry, fall back, or give up). */
function parseAndValidate(raw: string, validIds: Set<string>, minQuestions: number): GeneratedAssessment | null {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const questions = (Array.isArray(parsed.questions) ? parsed.questions : []).filter(
    (q: any) =>
      q &&
      typeof q.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correctAnswer === 'number' &&
      q.correctAnswer >= 0 &&
      q.correctAnswer < 4 &&
      typeof q.explanation === 'string' &&
      validIds.has(q.competencyId)
  );

  if (questions.length < minQuestions) return null;

  return { title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Competency Assessment', questions };
}

async function callGroq(prompt: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-120b',
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0]?.message?.content || '{}';
}

async function callGemini(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [{ text: prompt }],
    config: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' },
  });
  return response.text || '{}';
}

/**
 * Generates a competency assessment with the crash-proofing Section 4 requires:
 * Groq is tried, then retried once (this also covers Groq's known Cloudflare
 * network-block failure mode, which is a thrown network error, not just a bad
 * response), then Gemini is tried as a fallback provider, and only if all three
 * attempts fail does this throw — the caller (server.ts) turns that into the
 * "couldn't generate the assessment right now, please retry" message rather
 * than ever leaving the learner on an infinitely-loading quiz screen.
 */
export async function generateAssessment(opts: {
  defs: CompetencyDefinition[];
  language: string;
  difficulty: AssessmentDifficulty;
  materialText?: string;
}): Promise<GeneratedAssessment> {
  const { defs, language, difficulty, materialText } = opts;
  const validIds = new Set(defs.map((c) => c.id));
  const totalQuestions = Math.max(MIN_QUESTIONS, defs.length);
  const prompt = buildPrompt({ defs, language, difficulty, totalQuestions, materialText });

  const attempts: { label: string; call: () => Promise<string> }[] = [
    { label: 'Groq (attempt 1)', call: () => callGroq(prompt) },
    { label: 'Groq (retry)', call: () => callGroq(prompt) },
    { label: 'Gemini (fallback)', call: () => callGemini(prompt) },
  ];

  for (const attempt of attempts) {
    try {
      const raw = await attempt.call();
      const result = parseAndValidate(raw, validIds, MIN_QUESTIONS);
      if (result) return result;
      console.error(`Assessment generation via ${attempt.label} returned too few/malformed questions — trying next.`);
    } catch (err) {
      console.error(`Assessment generation via ${attempt.label} failed:`, err);
    }
  }

  throw new Error("Couldn't generate the assessment right now. Please try again.");
}
