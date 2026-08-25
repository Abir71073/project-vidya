import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { pdf } from 'pdf-to-img';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DetectedQuestion, PdfParseResult } from './types';

// Below this many characters, a page's pdf-parse text layer is almost certainly
// missing (a scanned page, or a handwritten page photographed into the PDF)
// rather than real typed content — that page gets OCR'd via Gemini vision instead.
// Detection runs PER PAGE, not per document, so a PDF that mixes typed and
// handwritten pages is handled correctly rather than being judged as a whole.
const MIN_CHARS_PER_PAGE = 40;

async function extractPerPageText(buffer: Buffer): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str || '').join(' ');
    pageTexts.push(text.trim());
  }
  await doc.destroy();
  return pageTexts;
}

async function transcribePageImage(imageBuffer: Buffer, ai: GoogleGenAI): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      {
        text: 'Transcribe ALL text, questions, and math/science content visible in this image exactly as written. This page may be handwritten or typed, in English, Hindi, or Bengali (Devanagari/Bengali script) — do your best OCR on messy handwriting, and preserve the ORIGINAL language and script exactly. Do NOT translate. Output plain transcribed text only, no commentary, no markdown formatting.',
      },
      { inlineData: { mimeType: 'image/png', data: imageBuffer.toString('base64') } },
    ],
    config: { temperature: 0.1, maxOutputTokens: 2048 },
  });
  return (response.text || '').trim();
}

async function splitIntoQuestions(combinedText: string): Promise<DetectedQuestion[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are given raw text extracted from a student's uploaded document — possibly multiple pages, possibly OCR'd from handwriting, possibly containing OCR noise. Identify each distinct, self-contained question or problem in it.
Rules:
- Do NOT merge two unrelated questions into one entry.
- Do NOT split a single question's labeled sub-parts (a, b, c, ...) into separate entries — a multi-part question stays ONE entry, with all its sub-parts included in "text".
- Write "title" as a short label (3-8 words) for the picker UI, in the SAME language as the question itself (do not translate it to English).
- Write "text" as the question's full verbatim wording (lightly cleaned of obvious OCR artifacts, but do not paraphrase or solve it).
- If there is genuinely only one question in the document, return a single-item array.
Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{ "questions": [ { "title": "...", "text": "..." } ] }`,
      },
      { role: 'user', content: combinedText.slice(0, 12000) },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const rawQuestions: any[] = Array.isArray(parsed.questions) ? parsed.questions : [];
  return rawQuestions
    .map((q: any, i: number) => ({
      id: `q${i + 1}`,
      title: String(q?.title || `Question ${i + 1}`).trim(),
      text: String(q?.text || '').trim(),
    }))
    .filter((q) => q.text);
}

/**
 * Extracts distinct questions from an uploaded PDF, page by page: fast pdfjs-dist
 * text extraction for pages with a real text layer, falling back to page-image OCR
 * (via the same Gemini vision pipeline used for photographed doubts) for pages
 * whose text layer is too sparse to be real typed content — i.e. a scanned or
 * handwritten page. This runs per page so a PDF mixing typed and handwritten
 * pages is handled correctly, not judged as a whole document.
 */
export async function parsePdfForQuestions(buffer: Buffer): Promise<PdfParseResult> {
  const pageTexts = await extractPerPageText(buffer);
  const pageCount = pageTexts.length;

  const pagesNeedingOcr = pageTexts
    .map((text, i) => ({ pageNumber: i + 1, text }))
    .filter((p) => p.text.length < MIN_CHARS_PER_PAGE);

  const finalPageTexts = [...pageTexts];
  let usedImageFallback = false;

  if (pagesNeedingOcr.length > 0) {
    usedImageFallback = true;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const document = await pdf(buffer, { scale: 2 });

    for (const { pageNumber } of pagesNeedingOcr) {
      const pageImage = await document.getPage(pageNumber);
      const ocrText = await transcribePageImage(pageImage, ai);
      if (ocrText) finalPageTexts[pageNumber - 1] = ocrText;
    }
  }

  const combinedText = finalPageTexts
    .map((text, i) => (text ? `[Page ${i + 1}]\n${text}` : ''))
    .filter(Boolean)
    .join('\n\n');

  if (!combinedText.trim()) {
    return { questions: [], usedImageFallback, pageCount };
  }

  const questions = await splitIntoQuestions(combinedText);
  return { questions, usedImageFallback, pageCount };
}
