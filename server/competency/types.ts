// Shared data model for the MoSPI Skill Intelligence & Learning Platform prototype.
// Types here are imported by both server code (server/competency/*, server.ts) and
// the frontend (via `import type`, so nothing runtime-only ever crosses the bundle
// boundary — see src/context/LearnerContext.tsx).

export type LearnerRole = 'employee' | 'administrator';

export interface LearnerProfile {
  id: string;
  name: string;
  designation: string;
  department: string;
  /** Matches a key in JOB_ROLE_EXPECTATIONS (server/competency/taxonomy.ts) when possible. */
  jobRole: string;
  currentAssignment: string;
  qualifications: string;
  workExperienceYears: number;
  priorTrainings: string[];
  role: LearnerRole;
  /** Preferred language for quizzes/assistant replies — same three the rest of the app supports. */
  language: string;
  createdAt: string;
}

export type CompetencyDomain = 'Statistical' | 'Technical' | 'Digital Governance' | 'Behavioural/Managerial';

export interface CompetencyDefinition {
  id: string;
  domain: CompetencyDomain;
  name: string;
}

export interface CompetencyScoreEntry {
  score: number;
  timestamp: string;
  source: 'assessment' | 'material-quiz';
}

export interface CompetencyScore {
  competencyId: string;
  score: number;
  lastAssessedAt: string;
  history: CompetencyScoreEntry[];
}

/** One learner's full set of per-competency scores. Competencies never assessed are simply absent. */
export interface LearnerCompetencyState {
  learnerId: string;
  scores: Record<string, CompetencyScore>;
}

export interface CompetencyGap {
  competencyId: string;
  domain: CompetencyDomain;
  name: string;
  actual: number;
  expected: number;
  gap: number;
}

export type CourseProvider = 'iGOT Karmayogi' | 'NSSTA TPAC';
export type CourseLevel = 'Foundation' | 'Intermediate' | 'Advanced';

export interface Course {
  id: string;
  competencyId: string;
  title: string;
  provider: CourseProvider;
  durationHours: number;
  description: string;
  level: CourseLevel;
}

export type EnrolmentStatus = 'enrolled' | 'completed';

export interface Enrolment {
  id: string;
  learnerId: string;
  courseId: string;
  status: EnrolmentStatus;
  enrolledAt: string;
  completedAt?: string;
}
