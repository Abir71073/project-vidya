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
import * as competencyStore from './server/competency/store';
import { COMPETENCIES, JOB_ROLES, getExpectedLevels } from './server/competency/taxonomy';
import { getCoursesForCompetency, getCourseById } from './server/competency/catalogue';
import { extractDocumentText } from './server/materials/extractDocumentText';
import { generateAssessment, AssessmentDifficulty } from './server/competency/generateAssessment';

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

// Local-only demo page: simulates sending a WhatsApp message and renders the
// webhook's reply as chat bubbles, so this can be demoed without a real
// WhatsApp number. See server/whatsapp/README.md for what is/isn't real here.
app.get('/whatsapp-demo', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'server', 'whatsapp', 'demo.html'));
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
          content: `You are the Learner Support assistant for a Skill Intelligence & Learning Platform used by officials in India's Official Statistical System (MoSPI, NSSO, State DES offices, and similar bodies).

Answer questions about:
- The 33 competencies tracked by the platform, across four domains: Statistical (Survey Design, Sampling, National Accounts, Price Statistics, Labour Statistics, Agricultural Statistics, Industrial Statistics, SDG Indicators, Metadata Standards, Data Quality Frameworks), Technical (Python, R, SQL, Stata, SPSS, SAS, GIS, Data Visualization, AI/ML, Cloud Computing, APIs, Open Data), Digital Governance (Cybersecurity, Data Privacy, Digital Signatures, Government Cloud, Digital Public Infrastructure), and Behavioural/Managerial (Leadership, Communication, Project Management, Ethics, Decision Making, Change Management).
- How competency assessments, skill-gap analysis, and course recommendations work on this platform.
- General questions about official statistics concepts within these competency areas (e.g. explaining what a sampling frame is, or what the DPDP Act requires).
- How to navigate the platform itself (Learner Profile, Assessment, Learning Paths, Dashboard).

If asked about live iGOT Karmayogi or NSSTA course enrolment, be upfront that this platform's course catalogue is a demo/mock integration, not connected to the real iGOT Karmayogi or NSSTA systems (see WHATSAPP.md-style honesty elsewhere in this app). Keep answers concise and practical. Use valid LaTeX formatting for any math ($ for inline, $$ for block).`
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

// ============================================================================
// MoSPI Skill Intelligence & Learning Platform — competency routes (SIH26101).
// See server/competency/store.ts for the prototype-storage caveat and
// SECURITY.md for what a production deployment still needs.
// ============================================================================

app.get('/api/learners', async (_req, res) => {
  try {
    const learners = await competencyStore.listLearners();
    res.json({ learners });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list learners' });
  }
});

app.get('/api/learners/:id', async (req, res) => {
  try {
    const learner = await competencyStore.getLearner(req.params.id);
    if (!learner) return res.status(404).json({ error: 'Learner not found' });
    res.json({ learner });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load learner' });
  }
});

app.post('/api/learners', async (req, res) => {
  try {
    const { name, designation, department, jobRole, targetRole, currentAssignment, qualifications, workExperienceYears, priorTrainings, role, language } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (role !== 'employee' && role !== 'administrator') {
      return res.status(400).json({ error: 'Role must be "employee" or "administrator".' });
    }
    const learner = await competencyStore.createLearner({
      name: String(name).trim(),
      designation: String(designation || '').trim(),
      department: String(department || '').trim(),
      jobRole: String(jobRole || '').trim(),
      // Optional — omitted entirely (not stored as '') when not provided, so it
      // reads as genuinely absent everywhere else in the app.
      ...(targetRole && String(targetRole).trim() ? { targetRole: String(targetRole).trim() } : {}),
      currentAssignment: String(currentAssignment || '').trim(),
      qualifications: String(qualifications || '').trim(),
      workExperienceYears: Number(workExperienceYears) || 0,
      priorTrainings: Array.isArray(priorTrainings) ? priorTrainings.filter((t: any) => typeof t === 'string' && t.trim()) : [],
      role,
      language: String(language || 'English'),
    });
    res.json({ learner });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create learner' });
  }
});

// Written to by the header's ENG/HIN/BEN toggle (Layout.tsx) — the active
// learner's `language` field is the single source of truth every AI-generated
// piece of content (assessments, material-based quizzes) reads, via
// activeLearner.language in LearnerContext.
app.patch('/api/learners/:id/language', async (req, res) => {
  try {
    const { language } = req.body;
    if (!['English', 'Hindi', 'Bengali'].includes(language)) {
      return res.status(400).json({ error: 'language must be English, Hindi, or Bengali.' });
    }
    const learner = await competencyStore.updateLearnerLanguage(req.params.id, language);
    if (!learner) return res.status(404).json({ error: 'Learner not found' });
    res.json({ learner });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update language' });
  }
});

app.get('/api/competency/job-roles', (_req, res) => {
  res.json({ jobRoles: JOB_ROLES });
});

app.get('/api/competency/taxonomy', (_req, res) => {
  res.json({ competencies: COMPETENCIES });
});

app.get('/api/competency/scores/:learnerId', async (req, res) => {
  try {
    const scores = await competencyStore.getLearnerScores(req.params.learnerId);
    res.json({ scores });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load scores' });
  }
});

app.get('/api/competency/gaps/:learnerId', async (req, res) => {
  try {
    const gaps = await competencyStore.computeGaps(req.params.learnerId);
    res.json({ gaps });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to compute gaps' });
  }
});

// Section 4 — extracts text from an uploaded document/presentation for the
// material-based assessment flow. Reuses the shared extractor (with Gemini-vision
// OCR fallback for scanned/handwritten PDF pages) that the (nav-dormant) Doubt
// Solver's PDF parser also runs on — see server/materials/extractDocumentText.ts.
app.post('/api/competency/extract-material', async (req, res) => {
  try {
    const { fileBase64, fileName = '', fileType = '' } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'No file provided' });

    const base64Data = fileBase64.split(';base64,').pop();
    if (!base64Data) return res.status(400).json({ error: 'Uploaded file looks corrupted. Please try a different file.' });
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: `"${fileName || 'File'}" is ${(buffer.length / (1024 * 1024)).toFixed(1)}MB, which is over the ${MAX_UPLOAD_MB}MB limit.` });
    }
    if (buffer.length === 0) return res.status(400).json({ error: 'The uploaded file is empty.' });

    const result = await extractDocumentText(buffer, fileName, fileType);
    if (!result.text.trim()) {
      return res.status(422).json({ error: 'No text could be extracted from this file.' });
    }

    let text = result.text;
    let truncated = false;
    if (text.length > MAX_EXTRACTED_CHARS) {
      text = text.slice(0, MAX_EXTRACTED_CHARS);
      truncated = true;
    }
    res.json({ text, truncated, usedOcrFallback: result.usedOcrFallback });
  } catch (error: any) {
    console.error('Material extraction error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract text from file' });
  }
});

// Rescoped version of /api/quiz (server.ts:336): scoped to specific
// competencies instead of a free-text topic, each question tagged with which
// competency it tests — so one assessment session can cover several
// competencies at once and still yield a per-competency score (Section 2). The
// actual generation (difficulty scaling, the >=10 question floor, and the
// Groq-retry-then-Gemini-fallback crash-proofing) lives in
// server/competency/generateAssessment.ts.
app.post('/api/competency/assess', async (req, res) => {
  try {
    const { competencyIds, language = 'English', difficulty = 'Medium', materialText } = req.body;
    if (!Array.isArray(competencyIds) || competencyIds.length === 0) {
      return res.status(400).json({ error: 'At least one competencyId is required.' });
    }
    const defs = competencyIds
      .map((id: string) => COMPETENCIES.find((c) => c.id === id))
      .filter((c): c is typeof COMPETENCIES[number] => Boolean(c));
    if (defs.length === 0) {
      return res.status(400).json({ error: 'No valid competencyIds provided.' });
    }
    const validDifficulty: AssessmentDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';

    const result = await generateAssessment({ defs, language, difficulty: validDifficulty, materialText: materialText ? String(materialText) : undefined });
    res.json(result);
  } catch (error: any) {
    console.error('Competency assessment generation error:', error);
    // generateAssessment() already tried Groq twice and Gemini once — this is
    // the final, honest "we couldn't do it" message, not a raw stack trace.
    res.status(502).json({ error: error.message || "Couldn't generate the assessment right now. Please try again." });
  }
});

app.post('/api/competency/score', async (req, res) => {
  try {
    const { learnerId, competencyId, score, source = 'assessment' } = req.body;
    if (!learnerId || !competencyId || typeof score !== 'number') {
      return res.status(400).json({ error: 'learnerId, competencyId, and numeric score are required.' });
    }
    const result = await competencyStore.recordCompetencyScore(learnerId, competencyId, Math.max(0, Math.min(100, score)), source);
    res.json({ score: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record score' });
  }
});

// ---------------------------------------------------------------------------
// Section 3 — mock iGOT Karmayogi / NSSTA course catalogue + enrolments.
// See server/competency/catalogue.ts's header comment: this is a documented
// mock, not a live integration.
// ---------------------------------------------------------------------------

app.get('/api/courses', (req, res) => {
  const competencyId = String(req.query.competencyId || '');
  if (!competencyId) return res.status(400).json({ error: 'competencyId query param is required.' });
  res.json({ courses: getCoursesForCompetency(competencyId) });
});

// Existence check for a single course id — used by LearningPaths.tsx to tell
// "this course id was removed/renamed from the catalogue" (course-unavailable
// state) apart from "it exists but isn't currently recommended" when a
// dashboard card's deep link no longer resolves on the page.
app.get('/api/courses/id/:id', (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json({ course });
});

// Multi-factor recommendations (gap, department priority, career path, emerging
// tech, and learning-history/variety) — see server/competency/catalogue.ts's
// recommendCourses() header comment for the full breakdown. Reuses the same
// computation as the Employee Dashboard so the two screens never disagree.
app.get('/api/recommendations/:learnerId', async (req, res) => {
  try {
    const data = await competencyStore.getEmployeeDashboardData(req.params.learnerId);
    res.json({ recommendations: data.recommendations, careerPathRecommendations: data.careerPathRecommendations });
  } catch (error: any) {
    console.error('Failed to compute recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to compute recommendations' });
  }
});

app.get('/api/enrolments/:learnerId', async (req, res) => {
  try {
    const enrolments = await competencyStore.listEnrolments(req.params.learnerId);
    res.json({ enrolments });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list enrolments' });
  }
});

app.post('/api/enrolments', async (req, res) => {
  try {
    const { learnerId, courseId } = req.body;
    if (!learnerId || !courseId) return res.status(400).json({ error: 'learnerId and courseId are required.' });
    const enrolment = await competencyStore.createEnrolment(learnerId, courseId);
    res.json({ enrolment });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create enrolment' });
  }
});

app.patch('/api/enrolments/:id/complete', async (req, res) => {
  try {
    const enrolment = await competencyStore.completeEnrolment(req.params.id);
    if (!enrolment) return res.status(404).json({ error: 'Enrolment not found' });
    res.json({ enrolment });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete enrolment' });
  }
});

app.get('/api/dashboard/employee/:learnerId', async (req, res) => {
  try {
    const data = await competencyStore.getEmployeeDashboardData(req.params.learnerId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load dashboard data' });
  }
});

// Section 8 note: this is a prototype-scope route-level check only (the caller
// asserts its own role from local, unauthenticated storage — see SECURITY.md).
// A production version must verify the requester's role server-side against a
// real authenticated identity, not trust a client-supplied learnerId's stored role.
app.get('/api/dashboard/admin', async (req, res) => {
  try {
    const requesterId = String(req.query.requesterId || '');
    const requester = requesterId ? await competencyStore.getLearner(requesterId) : null;
    if (!requester || requester.role !== 'administrator') {
      return res.status(403).json({ error: 'Administrator access required.' });
    }
    const data = await competencyStore.getAdminDashboardData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load admin dashboard data' });
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
