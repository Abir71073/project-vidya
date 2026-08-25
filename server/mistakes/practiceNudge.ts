import Groq from 'groq-sdk';

export interface PracticeNudge {
  concept: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

/** Classifies a solved doubt or graded question into a short, canonical-ish topic label. */
export async function classifyConcept(text: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Classify the following math/science/digital-logic problem into a short topic label (2-5 words, e.g. "Quadratic Equations", "Boolean Algebra: De Morgan\'s Law", "Newton\'s Laws of Motion"). Return ONLY the label text, nothing else — no quotes, no punctuation at the end.',
      },
      { role: 'user', content: text.slice(0, 2000) },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.1,
    max_tokens: 150,
    // This model reasons before answering by default, and reasoning tokens count
    // against max_tokens — for a trivial one-line classification, unbounded
    // reasoning risks the response getting cut off before any visible "content"
    // is emitted at all (confirmed by testing). The API only accepts low/medium/
    // high here (not "none", despite the SDK's type allowing it) — "low" plus a
    // generous max_tokens keeps this both fast and reliable.
    reasoning_effort: 'low',
  });

  return (completion.choices[0]?.message?.content || 'General').trim().replace(/^["']|["']$/g, '').replace(/\.$/, '');
}

/** Generates one fresh multiple-choice practice question on a concept the student has recurringly struggled with. */
export async function generatePracticeNudge(concept: string): Promise<PracticeNudge> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `Generate ONE multiple-choice practice question on the topic "${concept}", at a board-exam appropriate difficulty, different from any specific example the student may have already seen. Return ONLY valid JSON with this exact structure:
{ "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "why this is correct" }`,
      },
      { role: 'user', content: `Topic: ${concept}` },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Could not generate a practice question for this topic.');
  }

  const options: string[] = Array.isArray(parsed.options) ? parsed.options.map((o: any) => String(o)) : [];
  if (!parsed.question || options.length < 2) {
    throw new Error('Could not generate a practice question for this topic.');
  }

  return {
    concept,
    question: String(parsed.question).trim(),
    options,
    correctAnswer: Number(parsed.correctAnswer) || 0,
    explanation: String(parsed.explanation || '').trim(),
  };
}
