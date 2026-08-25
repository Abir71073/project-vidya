import { SyllabusSource } from './types';

/**
 * SCOPE NOTE: this index currently covers only the specific NCERT chapters listed
 * below — three chapters across Math/Science/Physics, downloaded from ncert.nic.in
 * for demo purposes. It is NOT a general syllabus database: doubts on any other
 * chapter, subject, class, or state board (CBSE state variants, ICSE, etc.) will
 * simply get no grounding match and fall back to the normal ungrounded solve.
 * Expanding coverage to more NCERT chapters, and eventually to specific state
 * board editions, is a roadmap item — not implemented here.
 */
export const SYLLABUS_SOURCES: SyllabusSource[] = [
  {
    id: 'jemh104',
    file: 'jemh104.pdf',
    citation: 'NCERT Class 10 Mathematics, Chapter 4: Quadratic Equations',
  },
  {
    id: 'jesc101',
    file: 'jesc101.pdf',
    citation: 'NCERT Class 10 Science, Chapter 1: Chemical Reactions and Equations',
  },
  {
    id: 'keph105',
    file: 'keph105.pdf',
    citation: 'NCERT Class 11 Physics (Part I), Chapter 5: Work, Energy and Power',
  },
];
