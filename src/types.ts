export type Section = 'home' | 'profile' | 'assessment' | 'learning' | 'dashboard' | 'admin' | 'assistant'
  // Legacy K-12 sections — unlinked from nav during the MoSPI pivot (see SECURITY.md / README),
  // kept only so their routes/components still compile; not reachable via navigation.
  | 'doubt' | 'notes' | 'quiz' | 'research';

export interface DoubtResponse {
  explanation: string;
  mathExpression?: string;
  verificationStatus?: 'verified' | 'failed' | 'unverified';
  verificationDetails?: string;
  /** Set only when the explanation was actually grounded in an indexed NCERT chapter excerpt. */
  citation?: string;
}

export interface DiagramEntity {
  id: string;
  label: string;
  box: { x: number; y: number; width: number; height: number };
}

export interface DashboardStats {
  totalAttempts: number;
  struggledAttempts: number;
  distinctConcepts: number;
  streakDays: number;
  weakTopics: { concept: string; count: number }[];
  recentActivity: { concept: string; source: 'explain' | 'grade'; struggled: boolean; timestamp: string }[];
}

export interface DetectedQuestion {
  id: string;
  title: string;
  text: string;
}

export interface GradingStep {
  stepNumber: number;
  description: string;
  marksAvailable: number;
  marksAwarded: number;
  shown: boolean;
  note: string;
}

export interface GradingResult {
  questionSummary: string;
  studentTranscription: string;
  steps: GradingStep[];
  totalMarksAwarded: number;
  totalMarksAvailable: number;
  overallFeedback: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  /** Which competency (server/competency/taxonomy.ts) this question tests, when the quiz is a competency assessment. */
  competencyId?: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: string[];
  venue: string | null;
  citationCount: number | null;
  url: string | null;
  pdfUrl: string | null;
}
