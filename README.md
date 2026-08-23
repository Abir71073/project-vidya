# VIDYA AI

> A next-generation, multimodal AI study assistant featuring automated note structuring, custom quiz generation, and a cinematic user interface.

## 📖 About The Project

**Vidya AI** is a comprehensive educational terminal designed to streamline the learning process. By combining advanced AI processing with a highly polished, immersive user interface, it provides students with a centralized hub for resolving doubts, organizing study materials, and testing their knowledge. 

The application architecture prioritizes speed, clarity, and an engaging user experience, featuring a bespoke dark-mode aesthetic with smooth, hardware-accelerated page transitions.

### ✨ Key Features

*   **Multimodal Doubt Solver:** Upload images of handwritten questions or type complex problems to receive step-by-step, verified AI explanations with mathematical formatting support.
*   **Intelligent Notes Vault:** Process raw text or upload documents to automatically extract, structure, and format content into clean, readable Markdown notes.
*   **Adaptive Quiz Generator:** Instantly generate targeted practice quizzes with adjustable difficulty levels (Easy, Medium, Hard) based on specific topics or existing study notes.
*   **Subject Assistant:** A persistent, context-aware AI chat terminal for follow-up questions, conceptual clarification, and deep dives into syllabus topics.
*   **Cinematic Interface:** A fully responsive, premium dark-mode UI built with immersive transitions, animated data feeds, and zero visual clutter.

## 🛠️ Built With

This project is built using modern frontend technologies:

*   **[React 18](https://react.dev/)** - UI Framework
*   **[TypeScript](https://www.typescriptlang.org/)** - Static Typing
*   **[Vite](https://vitejs.dev/)** - Build Tool & Bundler
*   **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first Styling
*   **[Framer Motion](https://www.framer.com/motion/)** - High-performance Animations
*   **[React Markdown](https://github.com/remarkjs/react-markdown)** - Markdown rendering with KaTeX support

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

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/vidya-ai.git
   cd vidya-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   * Copy the `.env.example` file to create a new `.env` file.
   * Add your required API keys to the `.env` file. *(Note: Never commit your `.env` file to version control).*
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
*   **Moupriya Mondal**
*   **Krish Swaika**

---
*For any inquiries or issues, please open an issue in this repository.*
