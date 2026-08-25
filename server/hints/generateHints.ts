import Groq from 'groq-sdk';

function buildPrompt(language: string): string {
  return `You are an expert Socratic tutor. You are given a full written step-by-step solution to a student's doubt. Your job is to turn it into a sequence of GUIDED HINTS — one per major step of the solution — that lead the student to work out each step themselves, instead of just handing them the answer.

Rules for each hint:
- Phrase it as a leading question or nudge (e.g. "What do you get if you subtract 5 from both sides?", not a restated answer (e.g. never write "2x = 10" as a hint if that's the step's result).
- NEVER reveal the actual computed number, simplified expression, or final answer in a hint — only guide the student's thinking toward performing that step themselves.
- Keep the same number and order of major steps as the original solution — one hint per step, in order.
- The final hint (for the concluding step) should nudge the student toward stating/interpreting the final answer, without stating the answer's value.
- Keep each hint short — one or two sentences.

LANGUAGE LOCK: every hint must be written entirely in ${language}, with correct native grammar and correct native technical/mathematical terminology — translate everything that has a real ${language} equivalent, and never code-switch mid-sentence. The ONLY exception is a genuinely internationally standard term or symbol with no established ${language} equivalent (e.g. "Boolean", variable names like x or A). Do not append a redundant English gloss/translation in parentheses after a ${language} word.

Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{ "hints": ["hint for step 1", "hint for step 2", "..."] }`;
}

/** Converts a full written explanation into an ordered sequence of Socratic nudge-hints, one per step. */
export async function generateHints(explanation: string, language: string = 'English'): Promise<string[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: buildPrompt(language) },
      { role: 'user', content: explanation },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Could not generate hints for this explanation.');
  }

  const hints: string[] = (Array.isArray(parsed.hints) ? parsed.hints : [])
    .map((h: any) => String(h || '').trim())
    .filter(Boolean);

  if (hints.length === 0) {
    throw new Error('Could not generate hints for this explanation.');
  }

  return hints;
}
