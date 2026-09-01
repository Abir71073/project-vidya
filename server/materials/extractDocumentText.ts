import { GoogleGenAI } from '@google/genai';
import { pdf } from 'pdf-to-img';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { parseOffice } from 'officeparser';

// Shared document-text extractor for the whole app. Originally built for the
// (now nav-dormant) Doubt Solver's PDF question-parser — server/pdfDoubt/extractQuestions.ts
// still uses the page-extraction pieces below, and the MoSPI Section 4 material-upload
// flow (server.ts's /api/competency/assess `materialText`) now uses this directly too.
//
// This is meaningfully more capable than a plain PDF text-layer read: government
// training material is realistically a mix of typed slides, scanned circulars, and
// photographed pages, so pages with too little real text get OCR'd via Gemini
// vision instead of silently coming back empty.

// Below this many characters, a page's pdfjs-dist text layer is almost certainly
// missing (a scanned page, or a photographed page) rather than real typed content —
// that page gets OCR'd via Gemini vision instead. Detection runs PER PAGE, not per
// document, so a PDF mixing typed and scanned pages is handled correctly.
const MIN_CHARS_PER_PAGE = 40;

/** Per-page text layer of a PDF via pdfjs-dist (fast, but blank for scanned/image-only pages). */
export async function extractPerPageText(buffer: Buffer): Promise<string[]> {
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

/** OCRs one rendered page image via Gemini vision — the same model call the (dormant) Doubt Solver used for photographed doubts. */
export async function transcribePageImage(imageBuffer: Buffer, ai: GoogleGenAI): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      {
        text: 'Transcribe ALL text visible in this image exactly as written. This page may be handwritten, typed, scanned, or a photographed slide, in English, Hindi, or Bengali (Devanagari/Bengali script) — do your best OCR, and preserve the ORIGINAL language and script exactly. Do NOT translate. Output plain transcribed text only, no commentary, no markdown formatting.',
      },
      { inlineData: { mimeType: 'image/png', data: imageBuffer.toString('base64') } },
    ],
    config: { temperature: 0.1, maxOutputTokens: 2048 },
  });
  return (response.text || '').trim();
}

export interface ExtractedDocument {
  text: string;
  usedOcrFallback: boolean;
  pageCount?: number;
}

async function extractPdfText(buffer: Buffer): Promise<ExtractedDocument> {
  const pageTexts = await extractPerPageText(buffer);
  const pagesNeedingOcr = pageTexts
    .map((text, i) => ({ pageNumber: i + 1, text }))
    .filter((p) => p.text.length < MIN_CHARS_PER_PAGE);

  const finalPageTexts = [...pageTexts];
  let usedOcrFallback = false;

  if (pagesNeedingOcr.length > 0) {
    usedOcrFallback = true;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const document = await pdf(buffer, { scale: 2 });
    for (const { pageNumber } of pagesNeedingOcr) {
      const pageImage = await document.getPage(pageNumber);
      const ocrText = await transcribePageImage(pageImage, ai);
      if (ocrText) finalPageTexts[pageNumber - 1] = ocrText;
    }
  }

  const text = finalPageTexts
    .map((t, i) => (t ? `[Page ${i + 1}]\n${t}` : ''))
    .filter(Boolean)
    .join('\n\n');

  return { text, usedOcrFallback, pageCount: pageTexts.length };
}

async function extractDocxText(buffer: Buffer): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: (result.value || '').trim(), usedOcrFallback: false };
}

// PPTX extraction uses `officeparser`, added specifically for this — it has a
// bundled pdfjs-dist copy with a known high-severity advisory (arbitrary JS
// execution on a malicious PDF), but that code path is never reached here: this
// function is only ever called for .pptx uploads, never .pdf (PDFs go through
// extractPdfText above, which uses this project's own pinned pdfjs-dist).
async function extractPptxText(buffer: Buffer): Promise<ExtractedDocument> {
  const ast = await parseOffice(buffer);
  return { text: (ast.toText() || '').trim(), usedOcrFallback: false };
}

/** Extracts text from a PDF, DOCX, or PPTX buffer — the single entry point the rest of the app uses. */
export async function extractDocumentText(buffer: Buffer, fileName: string, fileType: string): Promise<ExtractedDocument> {
  const name = fileName.toLowerCase();
  const isPdf = fileType === 'application/pdf' || name.endsWith('.pdf');
  const isDocx = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
  const isPptx = fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || name.endsWith('.pptx');

  if (isPdf) return extractPdfText(buffer);
  if (isDocx) return extractDocxText(buffer);
  if (isPptx) return extractPptxText(buffer);
  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or PPTX file.');
}
