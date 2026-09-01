# VIDYA — Skill Intelligence & Learning Platform

> An AI-enabled competency-gap identification and personalized training recommendation platform for officials in India's Official Statistical System (SIH26101, MoSPI), integrated (as a documented mock) with iGOT Karmayogi.

## 📖 About The Project

**Vidya** helps officials in India's Official Statistical System — NSSO, MoSPI, State DES offices, and similar bodies — identify their competency gaps against a structured 33-competency framework and get personalized training recommendations, mapped to a mock iGOT Karmayogi / NSSTA course catalogue. It started as a student doubt-solving prototype and has been rescoped for this audience; the underlying engines (AI quiz generation, document parsing, multilingual chat) are reused, not rebuilt.

The application architecture prioritizes speed, clarity, and an engaging user experience, featuring a bespoke dark-mode aesthetic with smooth, hardware-accelerated page transitions.

### ✨ Key Features

*   **Learner Profile:** A lightweight local profile (designation, department, job role, qualifications, work experience, prior trainings) stands in for a real government identity — see [SECURITY.md](./SECURITY.md) for what real SSO integration would add. Multiple profiles can be created and switched between.
*   **Competency Framework & Assessment:** 33 competencies across four domains (Statistical, Technical, Digital Governance, Behavioural/Managerial), each with an AI-generated quiz. One assessment session can cover several competencies at once, yielding a per-competency score — not just one aggregate number — compared against a job-role-specific expected level.
*   **Skill-Gap-Driven Recommendations:** Identified gaps map to a small local course catalogue standing in for iGOT Karmayogi / NSSTA — clearly labeled as a demo integration (see `server/competency/catalogue.ts`). Enrolment and completion are tracked locally, and completing a course bumps the linked competency's score.
*   **Material-Based Assessment:** Upload a PDF, DOCX, or PPTX of real training material, and the generated quiz is grounded in that material's actual content — with OCR fallback (via Gemini vision) for scanned/handwritten pages — and updates the specific competency it targets.
*   **Employee Dashboard:** A per-official view of competency levels (radar + bar charts), open gaps, recommended learning paths, learning hours logged, and progress over time.
*   **Administrator Dashboard:** Role-gated, organization-wide view — competency distribution across all learners, training completion rate, emerging skill gaps at scale, and a simple heuristic capacity-building projection.
*   **Learner Support Assistant:** A persistent AI chat for questions about competencies, courses, and the platform itself.
*   **Multilingual throughout:** English, Hindi, and Bengali carry through assessments, material-based quizzes, and the assistant, the same way they did in the original doubt-solving prototype.

### 🗄️ Legacy features (unlinked from navigation, not deleted)

The original K-12 doubt-solving prototype's features — Doubt Solver, Video Explainer, WhatsApp bot, Research Portal — don't fit this platform's audience, so they're removed from the sidebar/routing but the code is untouched on disk (`src/components/DoubtSolver.tsx`, `server/{doubt,video,whatsapp,syllabus,examiner,hints,diagram}/`). One piece is *not* dormant: the Doubt Solver's document-parsing module (with OCR fallback for scanned pages) was refactored into `server/materials/extractDocumentText.ts` and now powers the Section 4 material-upload flow directly.

## ⚠️ Known Limitations

*   **Prototype-scope storage, no real accounts.** Learner profiles, scores, and enrolments live in local JSON files (`generated/mospi/*.json`), not a real database with per-user access control — see `server/competency/store.ts` and [SECURITY.md](./SECURITY.md).
*   **Mock iGOT Karmayogi / NSSTA integration.** The course catalogue is a small hand-written sample, not a live API — see `server/competency/catalogue.ts`'s header and the in-app "Demo integration" banner on Learning Paths.
*   **Hardcoded job-role expectations.** The "expected competency level per role" table is a small hardcoded reference (using real ISS/NSSTA role titles), not pulled from a real HR system — see `server/competency/taxonomy.ts`.
*   **Upload size cap:** PDF/DOCX/PPTX uploads are capped at **15MB** (see `MAX_UPLOAD_MB` in `server.ts`).
*   **WhatsApp channel is unlinked from navigation** as part of this pivot (see above) — it was a fully working backend demo, not connected to a real WhatsApp Business account; see [WHATSAPP.md](./WHATSAPP.md).

## 🛠️ Built With

**Frontend**
*   **[React 19](https://react.dev/)** - UI Framework
*   **[TypeScript](https://www.typescriptlang.org/)** - Static Typing
*   **[Vite](https://vitejs.dev/)** - Build Tool & Bundler
*   **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first Styling
*   **[Framer Motion](https://www.framer.com/motion/)** - High-performance Animations
*   **[React Markdown](https://github.com/remarkjs/react-markdown)** + **KaTeX** - Markdown and math rendering
*   Hand-rolled SVG charts (radar, bar, sparkline) for the dashboards — no charting library dependency

**Backend**
*   **[Express](https://expressjs.com/)** on Node, run via **[tsx](https://github.com/privatenumber/tsx)** in dev and bundled with **esbuild** for production
*   **[Google Gemini](https://ai.google.dev/)** - vision OCR for scanned/handwritten material pages
*   **[Groq](https://groq.com/)** (`openai/gpt-oss-120b`) - competency assessment generation and the Learner Support chat
*   **[pdf-parse](https://www.npmjs.com/package/pdf-parse)** / **[mammoth](https://github.com/mwilliamson/mammoth.js)** / **[officeparser](https://www.npmjs.com/package/officeparser)** - PDF/DOCX/PPTX text extraction
*   **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** + **[pdf-to-img](https://www.npmjs.com/package/pdf-to-img)** - per-page PDF extraction with OCR fallback

## 📂 File Structure

```text
project-vidya/
├── server/
│   ├── competency/
│   │   ├── types.ts        # Shared learner/competency/course data model
│   │   ├── taxonomy.ts     # The 33 competencies + job-role expected levels
│   │   ├── store.ts        # JSON-file storage, gap computation, dashboard aggregation
│   │   └── catalogue.ts    # Mock iGOT Karmayogi / NSSTA course catalogue
│   └── materials/
│       └── extractDocumentText.ts  # Shared PDF/DOCX/PPTX extractor with OCR fallback
├── src/
│   ├── components/
│   │   ├── LearnerProfile.tsx      # Section 1
│   │   ├── CompetencyAssessment.tsx # Sections 2 + 4
│   │   ├── LearningPaths.tsx       # Section 3
│   │   ├── EmployeeDashboard.tsx   # Section 5
│   │   ├── AdminDashboard.tsx      # Section 6
│   │   ├── Assistant.tsx           # Section 7 (Learner Support)
│   │   ├── Layout.tsx              # Main application layout, sidebar, role-gated nav
│   │   └── QuizView.tsx            # Reused quiz-taking UI (assessment + legacy)
│   ├── context/
│   │   └── LearnerContext.tsx      # Active learner (simulated login), scores, gaps
│   ├── App.tsx                     # Main router and page transitions
│   └── types.ts                    # Global TypeScript interfaces
├── SECURITY.md                     # Access control & what production needs (not implemented)
├── .env.example                    # Example environment variables (placeholders only — see the file)
└── package.json
```

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or yarn
*   For the (unlinked) video explanation legacy feature only: Python 3 with `edge-tts`, and `ffmpeg` on `PATH`.

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
   * Copy `.env.example` to `.env` and fill in your real `GEMINI_API_KEY` and `GROQ_API_KEY`.
   * **Never put a real key in `.env.example`** — it's committed to the repo; only `.env` (gitignored) should ever hold real secrets.
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
