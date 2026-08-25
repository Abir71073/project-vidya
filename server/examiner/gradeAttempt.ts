import { GoogleGenAI } from '@google/genai';
import { GradingResult, GradingStep } from './types';

function buildPrompt(language: string, extraContext: string): string {
  return `You are an expert exam EXAMINER for math/science/digital-logic problems. You are shown a photo of a STUDENT'S OWN handwritten worked solution — not a clean textbook example. Handwriting may be messy, work may be crossed out, and the attempt may be incomplete.

Do this in three parts, in order:

PART 1 — READ THE STUDENT'S ACTUAL WORK:
Carefully transcribe exactly what steps the student actually wrote, in the order they wrote them, including the question itself if visible. Note precisely where they skipped from one step directly to a much later one, where they made a method/arithmetic error, and where they stopped. Do not "fill in" or assume steps the student didn't actually write — if something is missing, it's missing.

PART 2 — INDEPENDENTLY BUILD THE REFERENCE MARKING SCHEME:
Determine what the complete, correct step-by-step solution to this question should look like, as if you were writing the official marking scheme — NOT influenced by what the student happened to write. Apply this discipline:
- Show the raw/given expression or setup as its own first markable step, before any simplification — never skip straight to a simplified form.
- Only name a law/rule (De Morgan's, Distributive, Associative, Commutative, Absorption, Idempotent, quadratic formula, etc.) if the step genuinely matches that law's real definition; if unsure, describe the step in plain language instead of guessing a law name.
- Break the solution into individually markable steps the way a real board-exam marking scheme allocates partial credit — not just a lump mark for the final answer.
- Assume a total of 5 marks for this question unless the question or the extra context below states a different total. Allocate marksAvailable per step based on that step's weight/importance (e.g. the final answer alone is rarely worth more than 1-2 marks; method and intermediate steps carry the rest). The marksAvailable values across all steps MUST sum to the question's total marks.

PART 3 — GRADE THE STUDENT'S WORK AGAINST YOUR OWN REFERENCE SCHEME:
For each step of the reference marking scheme from Part 2, decide from the transcription in Part 1: did the student's actual work show this step in a form that would genuinely earn credit? Set "shown" accordingly, and award "marksAwarded" between 0 and that step's "marksAvailable" (partial credit is allowed when a step is partially correct or partially shown).
CRITICAL SCORING RULE — this is the entire point of this exercise, do not violate it: if "shown" is false, "marksAwarded" for that step MUST be 0. A correct final answer does NOT retroactively earn credit for an intermediate method step whose working was not actually written down — this is exactly how real board-exam method marks work: the mark is for showing the step, not for having silently done it in your head. Do not be lenient here even if the student's jump was mathematically valid or the final answer is correct; if the step's working isn't on the page, its marks are lost. Only award marksAwarded > 0 for a step when "shown" is true.
Write a specific, concrete "note" for each step explaining exactly why marks were awarded or lost for THAT step — not a generic comment.

Then write "overallFeedback": one short, specific paragraph naming exactly where marks were lost overall (e.g. which step was skipped and how many marks that cost), the way a teacher would explain it to the student.

LANGUAGE LOCK: every text field in your JSON output ("questionSummary", "studentTranscription", "steps[].description", "steps[].note", "overallFeedback") must be written entirely in ${language}, with correct native grammar and correct native technical/mathematical terminology — translate everything that has a real ${language} equivalent, and never code-switch mid-sentence. This applies to law/rule names too (e.g. "Distributive law" must become its real ${language} name, not stay in English). The ONLY exception is a genuinely internationally standard term or symbol with no established ${language} equivalent (e.g. "Boolean", variable names like x or A). Do not append a redundant English gloss/translation in parentheses after a ${language} word or law name (e.g. do not write "বন্টন বিধি (Distributive law)" — "বন্টন বিধি" alone is the complete, correct wording; adding "(Distributive law)" after it is exactly the redundant English gloss this rule forbids).

${extraContext ? `Extra context from the student: ${extraContext}\n` : ''}
Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{
  "questionSummary": "...",
  "studentTranscription": "...",
  "steps": [
    { "description": "...", "marksAvailable": 1, "marksAwarded": 1, "shown": true, "note": "..." }
  ],
  "overallFeedback": "..."
}`;
}

/** Reads a student's photographed worked solution, independently derives a marking scheme, and grades against it. */
export async function gradeAttempt(imageBase64: string, extraContext: string, language: string = 'English'): Promise<GradingResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error('Please upload a photo of your worked solution.');
  }

  const parts: any[] = [
    { text: buildPrompt(language, extraContext) },
    { inlineData: { mimeType: match[1], data: match[2] } },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: parts,
    config: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  const raw = response.text || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The grading model returned malformed JSON.');
  }

  const rawSteps: any[] = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps: GradingStep[] = rawSteps
    .map((s: any, i: number) => {
      const marksAvailable = Math.max(0, Number(s?.marksAvailable) || 0);
      const shown = Boolean(s?.shown);
      // Enforced server-side, not just prompted: an unshown step cannot earn marks,
      // regardless of what the model returned — this is the whole point of the feature.
      const marksAwarded = shown ? Math.min(Math.max(0, Number(s?.marksAwarded) || 0), marksAvailable) : 0;
      return {
        stepNumber: i + 1,
        description: String(s?.description || '').trim(),
        marksAvailable,
        marksAwarded,
        shown,
        note: String(s?.note || '').trim(),
      };
    })
    .filter((s) => s.description);

  if (steps.length === 0) {
    throw new Error('Could not build a marking scheme for this question. Try a clearer photo of both the question and your working.');
  }

  const totalMarksAwarded = steps.reduce((sum, s) => sum + s.marksAwarded, 0);
  const totalMarksAvailable = steps.reduce((sum, s) => sum + s.marksAvailable, 0);

  return {
    questionSummary: String(parsed.questionSummary || '').trim(),
    studentTranscription: String(parsed.studentTranscription || '').trim(),
    steps,
    totalMarksAwarded,
    totalMarksAvailable,
    overallFeedback: String(parsed.overallFeedback || '').trim(),
  };
}
