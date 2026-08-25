export interface VideoStep {
  /** What the narrator says aloud for this step (plain spoken language, no LaTeX/markdown). */
  narration: string;
  /** Short on-slide text (plain text, or a single LaTeX expression already wrapped in $/$$). */
  caption: string;
  /** Optional LaTeX (no delimiters) for a KaTeX-rendered equation block on the slide. */
  math?: string;
}

export interface VideoScript {
  title: string;
  steps: VideoStep[];
}
