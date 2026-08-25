export interface SyllabusSource {
  id: string;
  /** PDF filename inside server/syllabus/sources/. */
  file: string;
  /** Human-readable citation shown to the student, e.g. "NCERT Class 10 Mathematics, Chapter 4: Quadratic Equations". */
  citation: string;
}

export interface SyllabusChunk {
  sourceId: string;
  citation: string;
  text: string;
}

export interface GroundingMatch {
  /** Short excerpt (a paragraph or two) to pass to the model as grounding context — never the full chapter. */
  excerpt: string;
  citation: string;
  score: number;
}
