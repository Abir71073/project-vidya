export interface GradingStep {
  stepNumber: number;
  /** What this step of the reference marking scheme should show, in the target language. */
  description: string;
  marksAvailable: number;
  marksAwarded: number;
  /** Whether the student's actual work showed this step in a creditable form. */
  shown: boolean;
  /** Specific examiner note for this step, in the target language. */
  note: string;
}

export interface GradingResult {
  /** Brief restatement of what the question asked, in the target language. */
  questionSummary: string;
  /** What the model actually read from the student's handwritten photo. */
  studentTranscription: string;
  steps: GradingStep[];
  totalMarksAwarded: number;
  totalMarksAvailable: number;
  /** A specific, actionable summary of where marks were gained/lost, in the target language. */
  overallFeedback: string;
}
