import { GoogleGenAI } from '@google/genai';
import nerdamer from 'nerdamer';
import { findGroundingContext } from '../syllabus/retrieval';
import { SYLLABUS_SOURCES } from '../syllabus/sources';

export interface SolveDoubtParams {
  imageBase64?: string;
  text?: string;
  language?: string;
}

export interface SolveDoubtResult {
  explanation: string;
  mathExpression?: string;
  verificationStatus: 'verified' | 'failed' | 'unverified';
  verificationDetails: string;
  citation?: string;
}

/**
 * The Doubt Solver's core pipeline: syllabus-grounded, language-locked,
 * step-complete explanation generation via Gemini, with symbolic answer
 * verification. Shared by the HTTP /api/solve-doubt route and any other
 * channel that needs the same solving behavior (e.g. the WhatsApp webhook
 * stand-in in server/whatsapp/).
 */
export async function solveDoubt({ imageBase64, text = '', language = 'English' }: SolveDoubtParams): Promise<SolveDoubtResult> {
  if (!imageBase64 && !text) {
    throw new Error('Please provide an image or text');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Syllabus grounding: only possible when there's a typed query to search against —
  // an image-only doubt has no text to retrieve on until after OCR, which this
  // single-pass flow doesn't loop back on. See server/syllabus/sources.ts for scope.
  const grounding = text ? await findGroundingContext(text) : null;
  const groundingBlock = grounding
    ? `\n\nSYLLABUS GROUNDING CONTEXT (from ${grounding.citation}):
The excerpt below is from an official NCERT textbook chapter and appears related to this doubt. If — and only if — it genuinely matches this doubt's topic, follow the SAME notation, method, and step sequence used in this excerpt rather than a different (even if mathematically equivalent) approach. Do not quote this excerpt verbatim at length in your answer — paraphrase and summarize it into your own step-by-step explanation, the way a teacher would, not copy long sentences from it. If this excerpt is NOT actually relevant to the specific doubt below, ignore it entirely and solve normally — do not force a connection.
If you did use this excerpt to ground your method, add this exact tag at the very end of your response, after <FINAL_ANSWER>: <SYLLABUS_CITATION>${grounding.citation}</SYLLABUS_CITATION>. If you did not use it, omit that tag entirely.
---
${grounding.excerpt}
---`
    : '';

  const promptText = `You are an expert AI tutor with highly advanced OCR capabilities. The user will upload handwritten math/science/digital-logic problems which may have extremely messy or bad handwriting, or messy circuit diagrams.
First, carefully study the image to accurately transcribe the handwritten problem. Look closely at the strokes, context, mathematical symbols, and — for logic circuits — exactly which variables/terms have a complement bar (NOT) over them. Preserve complement bars exactly as drawn; do not simplify anything during transcription.

Then, solve the doubt provided by the user EXACTLY how a top student would write it on an exam answer sheet, following every rule below without exception.

RULE 1 — NEVER SKIP FROM RAW TO SIMPLIFIED:
Never jump straight from the raw/unsimplified expression to a simplified one. Always show, as its own first line, the literal raw expression exactly as given or transcribed — for Boolean/logic problems this means every complement bar and NOT operation exactly as the circuit/diagram shows them, written in LaTeX with \\overline{...} for each complement. Label this line "Given / Raw Expression". Only after that line do you begin simplifying, and every single simplification step must appear as its own separate line — never combine two simplification moves into one step.

RULE 2 — NEVER MISNAME A LAW:
Only cite a named law (De Morgan's, Distributive, Associative, Commutative, Absorption, Idempotent, Complement/Involution, Identity, Domination, etc.) when the transformation you just wrote matches that law's real, exact definition. Check yourself against this reference before naming a law:
- Commutative: A+B = B+A, A·B = B·A (only reorders two terms, nothing else changes)
- Associative: (A+B)+C = A+(B+C) (only regroups terms with the same operator, nothing else changes)
- Distributive: A·(B+C) = A·B + A·C, or A+(B·C) = (A+B)·(A+C)
- De Morgan's: \\overline{A+B} = \\overline{A}\\cdot\\overline{B}, and \\overline{A\\cdot B} = \\overline{A}+\\overline{B} (a complement bar breaks over a sum/product AND the operator flips — both must happen)
- Absorption: A + A\\cdot B = A, A\\cdot(A+B) = A
- Idempotent: A+A = A, A\\cdot A = A
- Complement/Involution: \\overline{\\overline{A}} = A, A+\\overline{A} = 1, A\\cdot\\overline{A} = 0
- Identity: A+0 = A, A\\cdot 1 = A
- Domination: A+1 = 1, A\\cdot 0 = 0
- Same rules apply to ordinary algebra: only call something "distributive property", "factoring", etc. if it is literally that operation.
If a step doesn't cleanly match one of these (or the equivalent algebraic identity), do NOT guess a law name — label that step "Simplification" instead. A wrong law name is worse than no law name.

RULE 3 — SAME STANDARD IN EVERY LANGUAGE, AND NO CODE-SWITCHING:
Respond fully in ${language} — every sentence, heading, and explanation, not just parts of it. Whatever language you respond in, apply Rules 1 and 2 identically — never drop the raw-expression line, never collapse steps, and never take more liberty with law names just because you're translating. A Hindi or Bengali answer must contain exactly the same steps, in the same granularity, as the English version would.
Use correct native grammar and correct native technical/mathematical terminology in ${language} — translate every word that has a real ${language} equivalent. Do not drop transliterated English terms into a ${language} sentence out of convenience (e.g. do not write an English word in Latin script or an anglicized loanword when ${language} already has its own established term for that concept). The ONLY exception is a genuinely internationally standard term or symbol with no established ${language} equivalent (e.g. "Boolean", variable names like x or A, gate names like AND/OR/NOT if untranslated in your field's convention) — everything else must be translated. Never code-switch mid-sentence: a single sentence must never start in ${language} and finish in English, or vice versa, except for one of those standard terms embedded inline. Also do NOT append a redundant English gloss or translation in parentheses after a ${language} word or heading (e.g. do not write "भाग (a): दिया गया व्यंजक (Given / Raw Expression)" — once you've translated it into ${language}, that is the final wording; do not also restate it in English right after).

RULE 4 — SUB-PARTS STAY SEPARATE:
If the question has labeled sub-parts (a, b, c, ...), answer each sub-part under its own clearly labeled heading, addressing exactly what that sub-part asks for. The heading text itself must be written in ${language} too (per Rule 3) — only the sub-part letter (a, b, c) and the ordinary Markdown "**...**" bold syntax stay as-is; the words around them must be ${language} words, not the literal English phrase "Part (a): Raw Expression" transplanted into a ${language} response. Do NOT append an English translation of the heading in parentheses after it (e.g. do not write "**(a) মূল রাশি (Given / Raw Expression)**" — the ${language} heading "**(a) মূল রাশি**" alone is complete; adding "(Given / Raw Expression)" after it is exactly the kind of redundant English gloss Rule 3 forbids). Never merge multiple sub-parts' answers into one combined block — a sub-part asking only for the raw expression should not also contain the simplification, and vice versa.

CRITICAL FORMATTING RULE: Every single simplification step MUST have its reasoning/justification written on the right side of the step (or "Simplification" per Rule 2 if no exact law applies). Use LaTeX aligned blocks to achieve this layout, with the \\text{} reasoning itself written in ${language} (per Rule 3 — this text renders as visible words to the student, so it must not be left in English when ${language} is not English; e.g. a Hindi response's \\text{} should contain Hindi words like "दोनों पक्षों से 5 घटाने पर", not the English phrase "Subtract 5 from both sides", and a law name inside \\text{} should use the standard ${language} name for that law where one exists, not an untranslated English law name). The structural shape below is only illustrating the LAYOUT (equation, ampersand alignment, \\quad, \\text{}) — translate the words inside every \\text{} into ${language}:
$$
\\begin{aligned}
2x + 5 &= 15 & \\quad \\text{(reasoning for this line, in ${language})} \\\\
2x &= 10 & \\quad \\text{(reasoning for this line, in ${language})} \\\\
x &= 5 & \\quad \\text{(reasoning for this line, in ${language})}
\\end{aligned}
$$

Use valid LaTeX enclosed in $$ for block equations and $ for inline equations.
If there is a final numerical, algebraic, or simplified logic answer, write it out visibly as part of your normal answer (e.g. inside the relevant step, sub-part, or a concluding line) — the tag below is only a duplicate, machine-readable copy for automated checking, and is stripped out before the user ever sees your answer. Never let the tag be the only place the final answer appears, and never let a sub-part's heading (per Rule 4) end without its own visible answer. Include the duplicate at the very end in the format:
<FINAL_ANSWER> expression </FINAL_ANSWER>
For algebraic expressions, keep it simple (e.g. x^2 + 2x). For Boolean/logic expressions, use \\overline{} for complements (e.g. \\overline{A} + B\\cdot C).
${groundingBlock}

User Query/Context: ${text ? text : 'Carefully transcribe the messy handwritten problem in this image, then solve it step-by-step.'}`;

  const parts: any[] = [{ text: promptText }];

  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: parts,
    config: { temperature: 0.2, maxOutputTokens: 4096 },
  });

  let explanation = response.text || '';

  let verificationStatus: SolveDoubtResult['verificationStatus'] = 'unverified';
  let verificationDetails = '';
  const answerMatch = explanation.match(/<FINAL_ANSWER>\s*(.*?)\s*<\/FINAL_ANSWER>/);

  if (answerMatch && answerMatch[1]) {
    const expression = answerMatch[1];
    try {
      const evaluated = nerdamer(expression).text();
      if (evaluated) {
        verificationStatus = 'verified';
        verificationDetails = `Symbolic check passed: ${evaluated}`;
      }
    } catch (err: any) {
      verificationStatus = 'failed';
      verificationDetails = `Symbolic parsing failed: ${err.message}`;
    }
  }

  const citationMatch = explanation.match(/<SYLLABUS_CITATION>\s*(.*?)\s*<\/SYLLABUS_CITATION>/);
  const citedText = citationMatch?.[1]?.trim();
  const citation = citedText && SYLLABUS_SOURCES.some((s) => s.citation === citedText) ? citedText : undefined;

  explanation = explanation.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  explanation = explanation.replace(/<FINAL_ANSWER>.*?<\/FINAL_ANSWER>/g, '').trim();
  explanation = explanation.replace(/<SYLLABUS_CITATION>.*?<\/SYLLABUS_CITATION>/g, '').trim();

  return {
    explanation,
    mathExpression: answerMatch?.[1] || undefined,
    verificationStatus,
    verificationDetails,
    citation,
  };
}
