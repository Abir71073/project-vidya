export type Section = 'doubt' | 'notes' | 'quiz' | 'assistant' | 'research';

export interface DoubtResponse {
  explanation: string;
  mathExpression?: string;
  verificationStatus?: 'verified' | 'failed' | 'unverified';
  verificationDetails?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
