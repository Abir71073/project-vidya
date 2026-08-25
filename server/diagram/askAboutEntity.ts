import { GoogleGenAI } from '@google/genai';

/** Answers a student's follow-up question scoped to one specific tapped component of a diagram. */
export async function askAboutEntity(
  imageBase64: string,
  entityLabel: string,
  question: string,
  language: string = 'English'
): Promise<string> {
  const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error('Please provide the diagram image.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const promptText = `You are an expert tutor. The student tapped on a specific component in this diagram, labeled "${entityLabel}", and is asking a question scoped to that component specifically — not the whole diagram.

Student's question about "${entityLabel}": ${question || `Explain what "${entityLabel}" is and what role it plays in this diagram.`}

Answer ONLY about "${entityLabel}" — its identity, role, behavior, or how it relates to its immediate neighbors in the diagram. Do not explain or solve the entire diagram/circuit/figure unless answering about this one component genuinely requires that context. Keep the answer focused and concise (a few sentences to a short paragraph).

LANGUAGE LOCK: respond entirely in ${language}, with correct native grammar and correct native technical terminology — translate everything that has a real ${language} equivalent, never code-switch mid-sentence. The ONLY exception is a genuinely internationally standard term or symbol with no established ${language} equivalent. Do not append a redundant English gloss/translation in parentheses after a ${language} word.

Use valid LaTeX enclosed in $$ for block equations and $ for inline equations where relevant.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      { text: promptText },
      { inlineData: { mimeType: match[1], data: match[2] } },
    ],
    config: { temperature: 0.3, maxOutputTokens: 1024 },
  });

  return (response.text || '').trim();
}
