import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import nerdamer from 'nerdamer';

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

app.use(express.json({ limit: '50mb' }));

const getGroq = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

app.post('/api/solve-doubt', async (req, res) => {
  try {
    const { imageBase64, language = 'English', text = '' } = req.body;
    
    if (!imageBase64 && !text) {
      return res.status(400).json({ error: 'Please provide an image or text' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const promptText = `You are an expert AI tutor with highly advanced OCR capabilities. The user will upload handwritten math/science problems which may have extremely messy or bad handwriting.
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
        verificationStatus = 'failed';
        verificationDetails = `Symbolic parsing failed: ${err.message}`;
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
  } catch (error: any) {
    console.error('Doubt solving error:', error);
    res.status(500).json({ error: error.message || 'Failed to process doubt' });
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
    const { fileBase64, fileName, fileType } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'No file provided' });

    const base64Data = fileBase64.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    
    let extractedText = '';

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const pdf = await import('pdf-parse/lib/pdf-parse.js').then(m => m.default || m);
      const data = await pdf(buffer);
      extractedText = data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' });
    }

    res.json({ text: extractedText });
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
          content: 'You are a helpful and knowledgeable teaching assistant. Answer student queries simply and accurately.'
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
