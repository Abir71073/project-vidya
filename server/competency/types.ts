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
  /** Optional. A jobRole key the learner is working toward — drives the "For your career path" recommendation section. Absent for learners with no stated career goal; never assumed present. */
  targetRole?: string;
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
  /** Optional. Flags courses in emerging-technology areas (AI/ML, Cloud, GIS, ...) for a small recommendation boost. Absent means false. */
  emergingTech?: boolean;
}

/** A human-readable tag for why a course was recommended — shown in the UI so scoring is never a black box. */
export type RecommendationFactor = 'gap' | 'department-priority' | 'career-path' | 'emerging-tech' | 'variety';

export interface CourseRecommendation {
  competencyId: string;
  gap: number;
  course: Course;
  score: number;
  factors: RecommendationFactor[];
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

// ---------------------------------------------------------------------------
// Agentic Admin Assistant — the AI here only ever PROPOSES; every consequential
// action requires an explicit human Approve. A Suggestion record is never
// deleted once created — its status/reviewedAt/reviewedBy fields are updated
// in place, so the full list of Suggestion records IS the permanent audit log
// (see server/competency/agenticAdmin.ts's header comment).

export type SuggestionType = 'recommend-course' | 'flag-checkin' | 'recognize-performer';
export type SuggestionStatus = 'pending' | 'approved' | 'dismissed';

export interface Suggestion {
  id: string;
  learnerId: string;
  type: SuggestionType;
  reasoning: string;
  /** Concrete data points backing the reasoning, e.g. "Survey Design score fell from 72 to 45 across 3 assessments." Never a vague claim with nothing behind it. */
  dataPoints: string[];
  /** Only set when type === 'recommend-course' — resolved server-side against the real catalogue, never trusted from the AI's own output. */
  suggestedCourseId?: string;
  status: SuggestionStatus;
  createdAt: string;
  /** Which digest run produced this suggestion. */
  digestId: string;
  reviewedAt?: string;
  /** The reviewing administrator's learnerId. */
  reviewedBy?: string;
}

export interface DigestInsight {
  summary: string;
  learnerIds: string[];
  dataPoints: string[];
}

export interface WeeklyDigest {
  id: string;
  generatedAt: string;
  insights: DigestInsight[];
  suggestionIds: string[];
}
