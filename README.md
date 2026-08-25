# VIDYA AI

> A next-generation, multimodal AI study assistant featuring automated note structuring, custom quiz generation, and a cinematic user interface.

## 📖 About The Project

**Vidya AI** is a comprehensive educational terminal designed to streamline the learning process. By combining advanced AI processing with a highly polished, immersive user interface, it provides students with a centralized hub for resolving doubts, organizing study materials, and testing their knowledge. 

The application architecture prioritizes speed, clarity, and an engaging user experience, featuring a bespoke dark-mode aesthetic with smooth, hardware-accelerated page transitions.

### 🆕 Recent Updates

*   **Advanced Engineering Support:** The AI engine now provides highly detailed, step-by-step derivations for complex circuit problems (Kirchhoff's laws, KVL/KCL, Thevenin, Norton) with explicitly defined nodes and loops.
*   **Graceful Symbolic Fallback:** Enhanced math parser stability that gracefully handles and renders complex physical units (Watts, Volts, Amperes) and foreign languages without triggering verification errors.
*   **Global Multilingual Sync:** Language preferences (English, Hindi, Bengali) selected in the top navigation bar now instantly synchronize globally across the Doubt Solver and other modules.

### ✨ Key Features

*   **Multimodal Doubt Solver:** Upload images of handwritten questions or type complex problems to receive step-by-step AI explanations with mathematical formatting support. Final numeric/algebraic answers are cross-checked with a symbolic math engine (nerdamer) and flagged as verified or unverified.
*   **Video Explanations:** Turn any Doubt Solver explanation into a short narrated video — a script generator breaks it into steps, each rendered as a styled slide with narrated audio, then stitched into an MP4.
*   **Intelligent Notes Vault:** Process raw text, or upload a PDF/DOCX, to automatically extract, structure, and format content into clean, readable Markdown notes — with text-to-speech playback of the result.
*   **Adaptive Quiz Generator:** Instantly generate targeted practice quizzes with adjustable difficulty levels (Easy, Medium, Hard) based on specific topics or existing study notes.
*   **Subject Assistant:** A persistent, context-aware AI chat terminal for follow-up questions, conceptual clarification, and deep dives into syllabus topics.
*   **Research Portal:** Search real academic papers (via the [Semantic Scholar](https://www.semanticscholar.org/) API) by topic, read abstracts and citation counts, open full text or PDFs, and bookmark papers for later.
*   **Cinematic Interface:** A fully responsive, premium dark-mode UI built with immersive transitions, animated data feeds, and zero visual clutter.
*   **WhatsApp Channel (local demo):** A backend webhook shaped like a real WhatsApp Cloud API integration, reusing the same Doubt Solver pipeline. Not connected to a real WhatsApp account — see [WHATSAPP.md](./WHATSAPP.md) and try it live at `/whatsapp-demo`.

## ⚠️ Known Limitations

*   **Upload size cap:** PDF/DOCX uploads are capped at **15MB** (see `MAX_UPLOAD_MB` in `server.ts`). Larger files are rejected with a clear error before any processing starts — split large documents or upload sections separately.
*   **PDF text extraction only, no OCR:** The Notes Vault reads embedded/selectable text from PDFs (via `pdf-parse`). Scanned or image-only PDFs have no extractable text and will return an error rather than silently producing empty notes. (Image-based handwritten questions *are* supported, but only through the separate Doubt Solver upload, which uses Gemini's vision model rather than `pdf-parse`.)
*   **Long documents are truncated:** Extracted text longer than ~120,000 characters is truncated before being sent to the notes-processing model, to stay within LLM context limits. The response indicates when this happens.
*   **Research search rate limits:** Without a Semantic Scholar API key (`S2_API_KEY`), the Research Portal shares a public, unauthenticated rate limit and may occasionally respond with "rate-limited, try again shortly" during heavy use.
*   **WhatsApp channel is not live:** The WhatsApp webhook (`/api/whatsapp-webhook`) is a fully working backend implementation reusing the real Doubt Solver pipeline, but it is not connected to a real WhatsApp Business account — see [WHATSAPP.md](./WHATSAPP.md) for exactly what's stubbed and what going live would require.

## 🛠️ Built With

**Frontend**
*   **[React 19](https://react.dev/)** - UI Framework
*   **[TypeScript](https://www.typescriptlang.org/)** - Static Typing
*   **[Vite](https://vitejs.dev/)** - Build Tool & Bundler
*   **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first Styling
*   **[Framer Motion](https://www.framer.com/motion/)** - High-performance Animations
*   **[React Markdown](https://github.com/remarkjs/react-markdown)** + **KaTeX** - Markdown and math rendering

**Backend**
*   **[Express](https://expressjs.com/)** on Node, run via **[tsx](https://github.com/privatenumber/tsx)** in dev and bundled with **esbuild** for production
*   **[Google Gemini](https://ai.google.dev/)** - vision + reasoning for the Doubt Solver
*   **[Groq](https://groq.com/)** (`openai/gpt-oss-120b`) - notes structuring, quiz generation, and the Subject Assistant chat
*   **[nerdamer](https://github.com/jiggzson/nerdamer)** - symbolic math verification of final answers
*   **[pdf-parse](https://www.npmjs.com/package/pdf-parse)** / **[mammoth](https://github.com/mwilliamson/mammoth.js)** - PDF/DOCX text extraction
*   **[Semantic Scholar Graph API](https://api.semanticscholar.org/)** - academic paper search for the Research Portal
*   **[Playwright](https://playwright.dev/)** (Chromium) - screenshots styled HTML slides for video explanations
*   **[edge-tts](https://github.com/rany2/edge-tts)** - free neural text-to-speech narration (Python CLI)
*   **[ffmpeg](https://ffmpeg.org/)** - stitches slide images + narration audio into the final MP4

## 📂 File Structure

```text
vidya-ai/
├── src/
│   ├── components/
│   │   ├── Assistant.tsx        # Persistent AI chat terminal
│   │   ├── DoubtSolver.tsx      # Multimodal doubt resolution interface
│   │   ├── Layout.tsx           # Main application layout and sidebar
│   │   ├── LoadingScreen.tsx    # Cinematic entry sequence 
│   │   ├── NotesManager.tsx     # Notes extraction and markdown structuring
│   │   ├── QuizGenerator.tsx    # Quiz configuration and generation
│   │   ├── QuizView.tsx         # Interactive quiz taking interface
│   │   └── Research.tsx         # In-depth research module
│   ├── App.tsx                  # Main router and page transitions
│   ├── index.css                # Global styles and custom scrollbar CSS
│   ├── main.tsx                 # React DOM entry point
│   └── types.ts                 # Global TypeScript interfaces
├── .env.example                 # Example environment variables (API keys)
├── package.json                 # Project metadata and dependencies
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript compiler options
└── vite.config.ts               # Vite bundler configuration
```

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or yarn
*   For **video explanations** only: Python 3 with [`edge-tts`](https://github.com/rany2/edge-tts) installed (`pip install edge-tts`), and [`ffmpeg`](https://ffmpeg.org/download.html) available on your `PATH`. Playwright's Chromium browser is installed automatically via `npx playwright install chromium` (see step 2 below).

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abir71073/project-vidya.git
   cd project-vidya
   ```

2. **Install dependencies**
   ```bash
   npm install
   npx playwright install chromium
   ```

3. **Configure Environment Variables**
   * Copy the `.env.example` file to create a new `.env` file.
   * Add your required API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) to the `.env` file. `S2_API_KEY` is optional — the Research Portal works without it, just at a lower rate limit. *(Note: Never commit your `.env` file to version control).*
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 👥 Development Team

This project was architected and developed by:

*   **Abir Kumar Chakraborty**
*   **Sounok Ghosh**
*   **Srijoni Sarkar**
*   **Tuhin Dey**
*   **Moupiya Mondal**
*   **Krish Swaika**

---
*For any inquiries or issues, please open an issue in this repository.*
