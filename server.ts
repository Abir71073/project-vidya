import 'dotenv/config';
console.log('GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);
console.log('GROQ_API_KEY loaded:', !!process.env.GROQ_API_KEY);
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import Groq from 'groq-sdk';
import { generateScript } from './server/video/generateScript';
import { renderSlide } from './server/video/renderSlide';
import { synthesizeNarration, getAudioDuration, voiceForLanguage } from './server/video/tts';
import { assembleVideo, StepClip } from './server/video/buildVideo';
import { solveDoubt } from './server/doubt/solveDoubt';
import { gradeAttempt } from './server/examiner/gradeAttempt';
import { parsePdfForQuestions } from './server/pdfDoubt/extractQuestions';
import { generateHints } from './server/hints/generateHints';
import { analyzeDiagram } from './server/diagram/analyzeDiagram';
import { askAboutEntity } from './server/diagram/askAboutEntity';
import { extractIncomingMessage, handleIncomingDoubt } from './server/whatsapp/handleWebhook';
import { logAttempt, findRecurringStruggle, getDashboardStats } from './server/mistakes/store';
import { classifyConcept, generatePracticeNudge } from './server/mistakes/practiceNudge';

// Attempt to load nerdamer extensions if available
try {
  require('nerdamer/Algebra.js');
  require('nerdamer/Calculus.js');
  require('nerdamer/Solve.js');
} catch (e) {
  console.log('Nerdamer extensions not fully loaded, basic features available.');
}

const app = express();
const PORT = 3000;

// Max size for uploaded study material (PDF/DOCX), in MB. Base64 inflates the
// payload by ~33%, so the JSON body limit below is set higher than this.
const MAX_UPLOAD_MB = 15;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
// Cap on extracted text forwarded to downstream LLM calls, so a huge document
// doesn't blow past model context limits or rack up token cost silently.
const MAX_EXTRACTED_CHARS = 120_000;

app.use(express.json({ limit: `${Math.ceil(MAX_UPLOAD_BYTES * 1.4 / (1024 * 1024))}mb` }));

// Generated doubt-explanation videos are written here and served statically.
const GENERATED_DIR = path.join(process.cwd(), 'generated');
app.use('/generated', express.static(GENERATED_DIR));

// Friendly JSON error instead of Express's default HTML page when a request
// body exceeds the limit above (e.g. PayloadTooLargeError).
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: `File is too large. Please upload something under ${MAX_UPLOAD_MB}MB.`,
    });
  }
  next(err);
});

const getGroq = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

app.post('/api/solve-doubt', async (req, res) => {
  try {
    const { imageBase64, language = 'English', text = '' } = req.body;

    const result = await solveDoubt({ imageBase64, text, language });
    res.json(result);

    // Fire-and-forget mistake-fingerprint logging: asking for an explanation is
    // itself a signal the student needed help with this concept. Never let this
    // delay or fail the response above — it already went out.
    if (text) {
      classifyConcept(text)
        .then((concept) => logAttempt(concept, 'explain', true))
        .catch((err) => console.error('Mistake-log classification failed:', err));
    }
<<<<<<< HEAD
=======

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const promptText = `You are an expert AI tutor with highly advanced OCR capabilities. The user will upload handwritten math/science/engineering problems which may have extremely messy or bad handwriting.
First, carefully study the image to accurately transcribe the handwritten problem. Look closely at the strokes, context, and mathematical symbols to decipher poor handwriting.

Then, solve the doubt provided by the user EXACTLY how a top student would write it on an exam answer sheet.
CRITICAL FORMATTING RULE: Every single mathematical step MUST have its reasoning or justification written on the right side of the step.
Use LaTeX aligned blocks to achieve this layout. For example:
$$
\\begin{aligned}
2x + 5 &= 15 & \\quad \\text{(Given equation)} \\\\
2x &= 10 & \\quad \\text{(Subtract 5 from both sides)} \\\\
x &= 5 & \\quad \\text{(Divide both sides by 2)}
\\end{aligned}
$$

SPECIAL INSTRUCTION FOR CIRCUIT PROBLEMS (KVL, KCL, Thevenin, Norton, etc.):
- Clearly define all nodes, loops, and assumed current directions before writing equations.
- Write down the unsimplified equations derived from Kirchhoff's laws or theorems first.
- Show step-by-step substitution and solution of the simultaneous equations.
- Detail exactly how each intermediate value (current, voltage, equivalent resistance R_th, etc.) was found.
- Double-check your sign conventions (e.g., voltage drops vs. rises).
- Provide the final correct result clearly at the end with appropriate units.

Explain clearly. Use valid LaTeX enclosed in $$ for block equations and $ for inline equations. 
Respond fully in ${language}.
If there is a final numerical or algebraic answer, include it at the very end in the format: 
<FINAL_ANSWER> expression </FINAL_ANSWER>
For algebraic expressions, keep it simple (e.g. x^2 + 2x).

User Query/Context: ${text ? text : 'Carefully transcribe the messy handwritten problem in this image, then solve it step-by-step.'}`;

    const parts: any[] = [
      { text: promptText }
    ];
    
    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    // Use Gemini for advanced OCR and solving
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: parts,
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    });

    let explanation = response.text || '';
    
    // Answer Verification using nerdamer
    let verificationStatus = 'unverified';
    let verificationDetails = '';
    const answerMatch = explanation.match(/<FINAL_ANSWER>\s*(.*?)\s*<\/FINAL_ANSWER>/);
    
    if (answerMatch && answerMatch[1]) {
      const expression = answerMatch[1];
      try {
        // Basic check: Ensure it can be parsed and maybe simplified
        // Nerdamer evaluates it symbolically. If it crashes, it's malformed.
        const evaluated = nerdamer(expression).text();
        if (evaluated) {
          verificationStatus = 'verified';
          verificationDetails = `Symbolic check passed: ${evaluated}`;
        }
      } catch (err: any) {
        // If it crashes during symbolic evaluation, it is simply unverified
        // (e.g. because it contains text, units, or vectors that nerdamer doesn't support)
        verificationStatus = 'unverified';
        verificationDetails = '';
      }
    }
    
    // Clean up tags
    explanation = explanation.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    explanation = explanation.replace(/<FINAL_ANSWER>.*?<\/FINAL_ANSWER>/g, '').trim();

    res.json({
      explanation,
      verificationStatus,
      verificationDetails,
    });
>>>>>>> 2713c39750ed0ef8b80a388462e86ca116c4e40a
  } catch (error: any) {
    console.error('Doubt solving error:', error);
    res.status(500).json({ error: error.message || 'Failed to process doubt' });
  }
});

app.post('/api/doubt/parse-pdf', async (req, res) => {
  try {
    const { fileBase64, fileName = '' } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'No file provided' });

    const base64Data = fileBase64.split(';base64,').pop();
    if (!base64Data) {
      return res.status(400).json({ error: 'Uploaded file looks corrupted. Please try a different file.' });
    }
    const buffer = Buffer.from(base64Data, 'base64');

    // Same 15MB limit and friendly error shape as Notes Vault's /api/extract-text.
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: `"${fileName || 'File'}" is ${(buffer.length / (1024 * 1024)).toFixed(1)}MB, which is over the ${MAX_UPLOAD_MB}MB limit. Try splitting it or uploading a smaller file.`,
      });
    }
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty.' });
    }

    const result = await parsePdfForQuestions(buffer);
    if (result.questions.length === 0) {
      return res.status(422).json({ error: 'Could not find any question content in this PDF. Try a clearer scan or a different file.' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('PDF doubt parsing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process this PDF.' });
  }
});

app.post('/api/doubt/hints', async (req, res) => {
  try {
    const { explanation, language = 'English' } = req.body;
    if (!explanation || typeof explanation !== 'string' || !explanation.trim()) {
      return res.status(400).json({ error: 'Please provide an explanation to turn into hints.' });
    }

    const hints = await generateHints(explanation, language);
    res.json({ hints });
  } catch (error: any) {
    console.error('Hint generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate hints.' });
  }
});

// WhatsApp Cloud API webhook verification handshake — see server/whatsapp/README.md.
// Meta calls this once when you register the webhook URL, to prove you control it.
app.get('/api/whatsapp-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Local stand-in for a WhatsApp Cloud API message webhook — see
// server/whatsapp/README.md for exactly what's stubbed vs. what a live
// integration additionally needs.
app.post('/api/whatsapp-webhook', async (req, res) => {
  try {
    const message = extractIncomingMessage(req.body);

    // WhatsApp also posts delivery-status webhooks to this same endpoint —
    // a real integration must always 200 quickly regardless of content.
    if (!message || (!message.text && !message.imageBase64)) {
      return res.sendStatus(200);
    }

    const wouldSend = await handleIncomingDoubt(message);
    res.json({ received: true, wouldSend });
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    // Still 200 — WhatsApp will retry aggressively on non-2xx, which isn't
    // useful for an error that won't resolve itself on retry.
    res.status(200).json({ received: true, error: error.message || 'Failed to process this message.' });
  }
});

app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to load dashboard stats.' });
  }
});

app.get('/api/practice-nudge', async (_req, res) => {
  try {
    const struggle = await findRecurringStruggle();
    if (!struggle) {
      return res.json({ nudge: null });
    }
    const nudge = await generatePracticeNudge(struggle.concept);
    res.json({ nudge });
  } catch (error: any) {
    console.error('Practice nudge error:', error);
    // Non-fatal: the UI should just show nothing rather than an error banner.
    res.json({ nudge: null });
  }
});

app.post('/api/doubt/analyze-diagram', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Please provide an image.' });
    }
    const result = await analyzeDiagram(imageBase64);
    res.json(result);
  } catch (error: any) {
    console.error('Diagram analysis error:', error);
    // Non-fatal: the UI should just fall back to a plain free-text follow-up.
    res.json({ confident: false, entities: [] });
  }
});

app.post('/api/doubt/ask-about-entity', async (req, res) => {
  try {
    const { imageBase64, entityLabel, question, language = 'English' } = req.body;
    if (!imageBase64 || !entityLabel) {
      return res.status(400).json({ error: 'Please provide the diagram image and which component was tapped.' });
    }
    const answer = await askAboutEntity(imageBase64, entityLabel, question || '', language);
    res.json({ answer });
  } catch (error: any) {
    console.error('Scoped entity question error:', error);
    res.status(500).json({ error: error.message || 'Failed to answer this question.' });
  }
});

app.post('/api/examiner/grade', async (req, res) => {
  try {
    const { imageBase64, text = '', language = 'English' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Please upload a photo of your worked solution to grade.' });
    }

    const result = await gradeAttempt(imageBase64, text, language);
    res.json(result);

    // Fire-and-forget mistake-fingerprint logging (see server/mistakes/store.ts
    // for the prototype-scope caveat). A graded attempt is a much stronger signal
    // than an explain request: we know exactly whether marks were lost.
    const struggled = result.totalMarksAwarded < result.totalMarksAvailable;
    const missedStep = result.steps.find((s) => !s.shown);
    classifyConcept(result.questionSummary || text)
      .then((concept) => logAttempt(concept, 'grade', struggled, missedStep?.note))
      .catch((err) => console.error('Mistake-log classification failed:', err));
  } catch (error: any) {
    console.error('Grading error:', error);
    res.status(500).json({ error: error.message || 'Failed to grade the attempt' });
  }
});

app.post('/api/doubt/video', async (req, res) => {
  const { explanation, mathExpression, language = 'English' } = req.body;

  if (!explanation || typeof explanation !== 'string' || !explanation.trim()) {
    return res.status(400).json({ error: 'Please provide an explanation to turn into a video.' });
  }

  const videoId = randomUUID();
  const workDir = path.join(GENERATED_DIR, 'videos', videoId);
  const voice = voiceForLanguage(language);

  try {
    await fs.mkdir(workDir, { recursive: true });

    const script = await generateScript(explanation, mathExpression, language);
    const rawVideoDir = path.join(workDir, 'raw');

    // Narration audio is cheap to synthesize concurrently. Slide rendering is
    // not: multiple Playwright video-recording contexts competing for the same
    // headless browser process measurably delays each one's first real paint —
    // verified as several hundred ms of blank frames per clip when all steps'
    // renderSlide calls ran in parallel. Rendering them one at a time keeps
    // every clip's animation clean from frame one.
    const audioPaths = script.steps.map((_, i) => path.join(workDir, `step-${i + 1}.mp3`));
    await Promise.all(script.steps.map((step, i) => synthesizeNarration(step.narration, audioPaths[i], voice)));

    const stepClips: StepClip[] = [];
    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      const videoPath = path.join(workDir, `step-${i + 1}.webm`);
      await renderSlide(step, i, script.steps.length, script.title, videoPath, rawVideoDir);
      const duration = await getAudioDuration(audioPaths[i]);
      stepClips.push({ videoPath, audioPath: audioPaths[i], duration });
    }

    const outPath = path.join(workDir, 'video.mp4');
    await assembleVideo(stepClips, workDir, outPath);
    await fs.rm(rawVideoDir, { recursive: true, force: true }).catch(() => {});

    res.json({
      videoPath: `/generated/videos/${videoId}/video.mp4`,
      title: script.title,
      steps: script.steps.length,
    });
  } catch (error: any) {
    console.error('Video generation error:', error);
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: error.message || 'Failed to generate the video explanation.' });
  }
});

app.post('/api/process-notes', async (req, res) => {
  try {
    const { text } = req.body;
    const groq = getGroq();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating concise, well-structured study notes from raw student text or OCR. Enhance formatting, fix typos, and structure with clear bullet points and headings. Output Markdown.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
    });

    res.json({ notes: completion.choices[0]?.message?.content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quiz', async (req, res) => {
  try {
    const { notes, topic, difficulty } = req.body;
    const groq = getGroq();
    
    let promptContent = `Generate a 5-question multiple choice quiz`;
    if (topic) {
      promptContent += ` focused specifically on the topic: "${topic}"`;
    } else {
      promptContent += ` based on the provided notes`;
    }
    
    if (difficulty) {
      promptContent += ` at a "${difficulty}" difficulty level.`;
    } else {
      promptContent += `.`;
    }

    promptContent += `
          Return ONLY valid JSON with this structure:
          {
            "title": "Quiz Title",
            "questions": [
              {
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": 0,
                "explanation": "Why this is correct"
              }
            ]
          }`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: promptContent
        },
        {
          role: 'user',
          content: notes || (topic ? `Topic: ${topic}` : "General Knowledge")
        }
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const quizJson = JSON.parse(completion.choices[0]?.message?.content || '{}');
    res.json(quizJson);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/extract-text', async (req, res) => {
  try {
    const { fileBase64, fileName = '', fileType = '' } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'No file provided' });

    const base64Data = fileBase64.split(';base64,').pop();
    if (!base64Data) {
      return res.status(400).json({ error: 'Uploaded file looks corrupted. Please try a different file.' });
    }
    const buffer = Buffer.from(base64Data, 'base64');

    // Enforce the size cap server-side too, in case a client skips its own check.
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: `"${fileName || 'File'}" is ${(buffer.length / (1024 * 1024)).toFixed(1)}MB, which is over the ${MAX_UPLOAD_MB}MB limit. Try splitting it or uploading a smaller file.`,
      });
    }
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty.' });
    }

    let extractedText = '';
    const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isDocx = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.toLowerCase().endsWith('.docx');

    if (isPdf) {
      try {
        const pdf = await import('pdf-parse/lib/pdf-parse.js').then(m => m.default || m);
        const data = await pdf(buffer);
        extractedText = (data.text || '').trim();
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        const message = /encrypt/i.test(pdfErr?.message || '')
          ? 'This PDF is password-protected. Please remove the password and try again.'
          : 'Could not read this PDF. It may be corrupted or in an unsupported format.';
        return res.status(422).json({ error: message });
      }

      if (!extractedText) {
        // pdf-parse only reads embedded text; it can't OCR scanned/image-only pages.
        return res.status(422).json({
          error: 'No selectable text was found in this PDF. It may be a scanned or image-only document, which this tool can\'t OCR yet — try the doubt solver\'s image upload instead, or paste the text manually.',
        });
      }
    } else if (isDocx) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = (result.value || '').trim();
      } catch (docxErr) {
        console.error('DOCX parsing error:', docxErr);
        return res.status(422).json({ error: 'Could not read this DOCX file. It may be corrupted.' });
      }

      if (!extractedText) {
        return res.status(422).json({ error: 'No text was found in this document.' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' });
    }

    let truncated = false;
    if (extractedText.length > MAX_EXTRACTED_CHARS) {
      extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARS);
      truncated = true;
    }

    res.json({ text: extractedText, truncated });
  } catch (error: any) {
    console.error('Error extracting text:', error);
    res.status(500).json({ error: 'Failed to extract text from file' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const groq = getGroq();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful and knowledgeable teaching assistant. Answer student queries simply and accurately.

If the user asks about circuit problems (like Kirchhoff's laws, Thevenin, or Norton theorems):
- Do a step-by-step solution.
- Define nodes, loops, and current directions clearly.
- Provide the detailed derivation of how each intermediate value (voltage, current, equivalent resistance) was found.
- Double-check your sign conventions (e.g., voltage drops vs. rises).
- Give the correct final result at the end with units.
- Use valid LaTeX formatting for math ($ for inline, $$ for block).`
        },
        ...messages
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
    });

    res.json({ reply: completion.choices[0]?.message?.content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/research', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Please provide a search query.' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    const fields = 'title,abstract,year,authors,url,venue,citationCount,openAccessPdf';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;

    const headers: Record<string, string> = {};
    if (process.env.S2_API_KEY) {
      headers['x-api-key'] = process.env.S2_API_KEY;
    }

    const response = await fetch(url, { headers });

    if (response.status === 429) {
      return res.status(429).json({ error: 'Semantic Scholar is rate-limiting requests right now. Please wait a moment and try again.' });
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('Semantic Scholar error:', response.status, body);
      return res.status(502).json({ error: 'The research service did not respond. Please try again shortly.' });
    }

    const data: any = await response.json();
    const papers = (data.data || []).map((p: any) => ({
      id: p.paperId,
      title: p.title,
      abstract: p.abstract || null,
      year: p.year || null,
      authors: (p.authors || []).map((a: any) => a.name),
      venue: p.venue || null,
      citationCount: p.citationCount ?? null,
      url: p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : null),
      pdfUrl: p.openAccessPdf?.url || null,
    }));

    res.json({ query, total: data.total ?? papers.length, papers });
  } catch (error: any) {
    console.error('Research search error:', error);
    res.status(500).json({ error: 'Failed to search research papers. Please try again.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
