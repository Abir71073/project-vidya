import Groq from 'groq-sdk';
import { VideoScript, VideoStep } from './types';

const getGroq = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

// A narration under this length is almost certainly a restated title/caption
// rather than a genuine walkthrough of the step — reject and retry rather than
// ship it. ~2 short sentences in most languages comfortably clears this.
const MIN_NARRATION_CHARS = 60;
const MIN_SENTENCE_COUNT = 2;

function buildSystemPrompt(language: string): string {
  return `You are an expert teacher turning a written step-by-step solution into a short narrated video.
Break the given explanation into 4 to 8 sequential steps. Each step becomes one slide with one spoken narration.

LANGUAGE LOCK — read this first:
Every piece of text you produce ("title", every "narration", every "caption") must be written entirely in ${language}, with correct grammar and correct native technical/mathematical terminology in ${language} — not transliterated English words dropped into a ${language} sentence. Translate everything that has a real ${language} equivalent. The ONLY exceptions are internationally standard symbols/terms with no established ${language} equivalent (e.g. "Boolean", variable names like x or A, or a symbol read aloud). Never code-switch mid-sentence — a sentence must not start in ${language} and finish in English (or vice versa) except for one of those standard terms.

CRITICAL — "narration" must be a genuine walkthrough, not a summary or a restated title:
Your source of truth is the written explanation you're given below — mine it for the ACTUAL values, terms, and law names used at each step, and narrate that real content aloud. Never write a vague meta-description of what the step does in general terms.
- WRONG (this is a title/summary, not an explanation — never do this): "Now we check the discriminant and verify the equation." / "This step covers the AND gate's behavior and its logical role."
- RIGHT (this actually walks through the real math/logic, naming the real numbers/terms): "The discriminant is b squared minus four a c. Substituting our values, that's negative five squared, which is twenty-five, minus four times two times three, which is twenty-four. Twenty-five minus twenty-four leaves us with a discriminant of one, and since that's positive, we know this equation has two distinct real roots."
- Every "narration" MUST be at least two full sentences, and MUST name the specific numbers, terms, or law involved in THIS step — not a placeholder, not a one-line label. If the written explanation shows a calculation, narrate the calculation itself (substituting values, combining terms, applying the named law) the way a teacher would say it aloud, at the same level of mathematical detail the written explanation has.
- No LaTeX, no markdown, no raw symbols in "narration" — spell things out the way a teacher speaking aloud would (e.g. "x squared plus two x", translated naturally into ${language}).

Rules for each step:
- "caption": a short line of on-slide text (max ~120 characters) summarizing the step, in ${language}. Plain text, no LaTeX.
- "math": Include this field whenever the step involves ANY equation, expression, inequality, or symbolic manipulation — which is most steps in a math/logic problem. Only omit it for a step that is purely conceptual with no expression to show (e.g. stating what a term means, with no formula). Provide raw LaTeX with no $ delimiters (e.g. "2x + 5 = 15") — this field is language-agnostic notation, not prose, so it stays in standard math notation regardless of ${language}.

Sequencing rules:
- The first step introduces the problem.
- The last step clearly states the final answer or conclusion.

Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{
  "title": "Short title for the video, in ${language}",
  "steps": [
    { "narration": "...", "caption": "...", "math": "..." }
  ]
}`;
}

function countSentences(text: string): number {
  return (text.match(/[.!?।॥]+/g) || []).length;
}

function isNarrationSubstantial(narration: string): boolean {
  return narration.length >= MIN_NARRATION_CHARS && countSentences(narration) >= MIN_SENTENCE_COUNT;
}

function parseSteps(raw: string): { title: string; steps: VideoStep[] } {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The video script generator returned malformed JSON.');
  }

  const rawSteps: any[] = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps: VideoStep[] = rawSteps
    .map((s: any) => ({
      narration: String(s?.narration || '').trim(),
      caption: String(s?.caption || '').trim(),
      math: s?.math ? String(s.math).trim() : undefined,
    }))
    .filter((s) => s.narration && s.caption)
    .slice(0, 8);

  return {
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Doubt Explanation',
    steps,
  };
}

export async function generateScript(explanation: string, mathExpression?: string, language: string = 'English'): Promise<VideoScript> {
  const groq = getGroq();

  const userContent = mathExpression
    ? `Written explanation:\n${explanation}\n\nFinal answer / key expression: ${mathExpression}`
    : `Written explanation:\n${explanation}`;

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(language) },
    { role: 'user', content: userContent },
  ];

  let script: { title: string; steps: VideoStep[] } | null = null;

  // One retry with an explicit correction if narration comes back too thin —
  // models sometimes default to summarizing despite the prompt's instructions.
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await groq.chat.completions.create({
      messages,
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    script = parseSteps(raw);

    const thinSteps = script.steps.filter((s) => !isNarrationSubstantial(s.narration));
    if (script.steps.length >= 2 && thinSteps.length === 0) break;

    if (attempt === 0) {
      messages.push({ role: 'assistant', content: raw });
      messages.push({
        role: 'user',
        content: `That attempt produced narration that was too short or too vague for ${thinSteps.length} step(s) — it read like a restated title, not a walkthrough. Regenerate the FULL script. Every "narration" must be at least two full sentences that name the actual numbers, terms, or law used at that step, mined directly from the written explanation — not a generic description of what the step does.`,
      });
    }
  }

  if (!script || script.steps.length < 2) {
    throw new Error('Could not break this explanation into enough steps for a video.');
  }

  return script;
}
