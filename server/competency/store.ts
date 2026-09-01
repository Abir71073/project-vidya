import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  LearnerProfile, LearnerCompetencyState, CompetencyScore, CompetencyGap,
  Enrolment, EnrolmentStatus, CompetencyDomain,
} from './types';
import { COMPETENCIES, getCompetency, getExpectedLevels } from './taxonomy';
import { getCoursesForCompetency, getCourseById, recommendCoursesForGaps } from './catalogue';

const DOMAINS: CompetencyDomain[] = ['Statistical', 'Technical', 'Digital Governance', 'Behavioural/Managerial'];

/**
 * PROTOTYPE-SCOPE STORAGE — same pattern and same caveat as server/mistakes/store.ts.
 * This app has no real accounts/auth, so "learners" are just JSON records on local
 * disk, not government-identity-backed users. Good enough to demo the full
 * profile -> assessment -> gap -> recommendation -> dashboard flow across several
 * simulated officials, but a production deployment needs real government SSO
 * (see SECURITY.md) issuing an actual authenticated identity per official, and a
 * real per-user database, not one shared flat file.
 */
const DATA_DIR = path.join(process.cwd(), 'generated', 'mospi');
const LEARNERS_PATH = path.join(DATA_DIR, 'learners.json');
const SCORES_PATH = path.join(DATA_DIR, 'competency-scores.json');
const ENROLMENTS_PATH = path.join(DATA_DIR, 'enrolments.json');

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Demo seed data — only inserted the first time the store is empty, so the
// Admin Dashboard (Section 6) has real org-wide numbers to aggregate without
// requiring the demoer to hand-create a dozen profiles first. Clearly synthetic:
// obviously-fictional names, not real officials.
const SEED_LEARNERS: Omit<LearnerProfile, 'id' | 'createdAt'>[] = [
  { name: 'Aditi Rao', designation: 'ISS Probationer', department: 'NSSO — Survey Design & Research', jobRole: 'ISS Probationer', currentAssignment: 'Field Operations Division', qualifications: 'M.Sc. Statistics', workExperienceYears: 0, priorTrainings: ['Foundation Course, LBSNAA'], role: 'employee', language: 'English' },
  { name: 'Rahul Menon', designation: 'Assistant Director', department: 'National Accounts Division', jobRole: 'Assistant Director (JTS)', currentAssignment: 'GDP Compilation Unit', qualifications: 'M.A. Economics', workExperienceYears: 3, priorTrainings: ['Basic Statistics for Officers'], role: 'employee', language: 'English' },
  { name: 'Priya Nair', designation: 'Deputy Director', department: 'Price Statistics Division', jobRole: 'Deputy Director (STS)', currentAssignment: 'CPI Compilation', qualifications: 'M.Sc. Statistics, Ph.D. Economics', workExperienceYears: 9, priorTrainings: ['Advanced Sampling Techniques', 'Price Index Methodology'], role: 'employee', language: 'Hindi' },
  { name: 'Sourav Ghosh', designation: 'Joint Director', department: 'SDG Monitoring Cell', jobRole: 'Joint Director (JAG/NFSG)', currentAssignment: 'National Indicator Framework', qualifications: 'M.Stat. (ISI)', workExperienceYears: 15, priorTrainings: ['Leadership Development Programme', 'Metadata Standards Workshop'], role: 'administrator', language: 'Bengali' },
  { name: 'Kavita Deshmukh', designation: 'Additional Director General', department: "Director General's Office", jobRole: 'Additional Director General (HAG)', currentAssignment: 'Strategic Planning', qualifications: 'M.A. Economics, MPA (Harvard Kennedy School)', workExperienceYears: 24, priorTrainings: ['Senior Leadership Programme', 'Change Management for Public Institutions'], role: 'administrator', language: 'English' },
  { name: 'Manoj Kumar Singh', designation: 'State DES Officer', department: 'Directorate of Economics & Statistics, Bihar', jobRole: 'State DES Officer', currentAssignment: 'Agricultural Statistics Wing', qualifications: 'M.Sc. Agricultural Statistics', workExperienceYears: 6, priorTrainings: ['Crop Estimation Survey Methodology'], role: 'employee', language: 'Hindi' },
];

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

async function seedIfEmpty(): Promise<void> {
  const existing = await readJson<LearnerProfile[]>(LEARNERS_PATH, []);
  if (existing.length > 0) return;

  const now = new Date();
  const learners: LearnerProfile[] = SEED_LEARNERS.map((l) => ({
    ...l,
    id: randomUUID(),
    createdAt: now.toISOString(),
  }));
  await writeJson(LEARNERS_PATH, learners);

  // Give each seeded learner plausible (not perfect) scores on a handful of
  // competencies relevant to their domain mix, and a couple of enrolments —
  // enough for the Admin Dashboard to show real distributions/completion rates.
  const states: LearnerCompetencyState[] = [];
  const enrolments: Enrolment[] = [];
  for (const learner of learners) {
    const expected = getExpectedLevels(learner.jobRole);
    const sampleIds = COMPETENCIES.filter(() => Math.random() < 0.4).map((c) => c.id);
    const scores: Record<string, CompetencyScore> = {};
    for (const id of sampleIds) {
      const expectedLevel = expected[id];
      // Seeded actuals cluster a bit below expected so gaps are visible in the demo.
      const score = Math.max(10, Math.min(100, randomBetween(expectedLevel - 30, expectedLevel + 5)));
      const timestamp = new Date(now.getTime() - randomBetween(1, 60) * 86400000).toISOString();
      scores[id] = { competencyId: id, score, lastAssessedAt: timestamp, history: [{ score, timestamp, source: 'assessment' }] };
    }
    states.push({ learnerId: learner.id, scores });

    // One or two enrolments per learner, mostly in gap areas, some completed.
    const gapIds = sampleIds.filter((id) => scores[id].score < expected[id]).slice(0, 2);
    for (const competencyId of gapIds) {
      const courses = getCoursesForCompetency(competencyId);
      if (courses.length === 0) continue;
      const course = courses[0];
      const enrolledAt = new Date(now.getTime() - randomBetween(5, 45) * 86400000).toISOString();
      const completed = Math.random() < 0.5;
      enrolments.push({
        id: randomUUID(),
        learnerId: learner.id,
        courseId: course.id,
        status: completed ? 'completed' : 'enrolled',
        enrolledAt,
        completedAt: completed ? new Date(now.getTime() - randomBetween(0, 4) * 86400000).toISOString() : undefined,
      });
    }
  }
  await writeJson(SCORES_PATH, states);
  await writeJson(ENROLMENTS_PATH, enrolments);
}

// ---------------------------------------------------------------------------
// Learners

export async function listLearners(): Promise<LearnerProfile[]> {
  await seedIfEmpty();
  return readJson<LearnerProfile[]>(LEARNERS_PATH, []);
}

export async function getLearner(id: string): Promise<LearnerProfile | null> {
  const learners = await listLearners();
  return learners.find((l) => l.id === id) || null;
}

export async function createLearner(input: Omit<LearnerProfile, 'id' | 'createdAt'>): Promise<LearnerProfile> {
  const learners = await listLearners();
  const learner: LearnerProfile = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  learners.push(learner);
  await writeJson(LEARNERS_PATH, learners);
  return learner;
}

/** Updates a learner's preferred language — the single source of truth the header's ENG/HIN/BEN toggle writes to. */
export async function updateLearnerLanguage(id: string, language: string): Promise<LearnerProfile | null> {
  const learners = await listLearners();
  const learner = learners.find((l) => l.id === id);
  if (!learner) return null;
  learner.language = language;
  await writeJson(LEARNERS_PATH, learners);
  return learner;
}

// ---------------------------------------------------------------------------
// Competency scores

async function readAllScores(): Promise<LearnerCompetencyState[]> {
  return readJson<LearnerCompetencyState[]>(SCORES_PATH, []);
}

export async function getLearnerScores(learnerId: string): Promise<Record<string, CompetencyScore>> {
  const all = await readAllScores();
  return all.find((s) => s.learnerId === learnerId)?.scores || {};
}

export async function recordCompetencyScore(
  learnerId: string,
  competencyId: string,
  score: number,
  source: 'assessment' | 'material-quiz'
): Promise<CompetencyScore> {
  const all = await readAllScores();
  let state = all.find((s) => s.learnerId === learnerId);
  if (!state) {
    state = { learnerId, scores: {} };
    all.push(state);
  }
  const timestamp = new Date().toISOString();
  const existing = state.scores[competencyId];
  const entry = { score, timestamp, source } as const;
  const updated: CompetencyScore = existing
    ? { ...existing, score, lastAssessedAt: timestamp, history: [...existing.history, entry] }
    : { competencyId, score, lastAssessedAt: timestamp, history: [entry] };
  state.scores[competencyId] = updated;
  await writeJson(SCORES_PATH, all);
  return updated;
}

/** Per-competency gaps for competencies the learner has actually been assessed on (not all 33 defaulted to 0). */
export async function computeGaps(learnerId: string): Promise<CompetencyGap[]> {
  const learner = await getLearner(learnerId);
  if (!learner) return [];
  const expected = getExpectedLevels(learner.jobRole);
  const scores = await getLearnerScores(learnerId);

  return Object.values(scores)
    .map((s) => {
      const def = getCompetency(s.competencyId);
      if (!def) return null;
      const expectedLevel = expected[s.competencyId] ?? 0;
      return {
        competencyId: s.competencyId,
        domain: def.domain,
        name: def.name,
        actual: s.score,
        expected: expectedLevel,
        gap: Math.max(0, expectedLevel - s.score),
      };
    })
    .filter((g): g is CompetencyGap => g !== null)
    .sort((a, b) => b.gap - a.gap);
}

export function unassessedCompetencies(scores: Record<string, CompetencyScore>) {
  const assessedIds = new Set(Object.keys(scores));
  return COMPETENCIES.filter((c) => !assessedIds.has(c.id));
}

// ---------------------------------------------------------------------------
// Enrolments

async function readAllEnrolments(): Promise<Enrolment[]> {
  return readJson<Enrolment[]>(ENROLMENTS_PATH, []);
}

export async function listEnrolments(learnerId?: string): Promise<Enrolment[]> {
  const all = await readAllEnrolments();
  return learnerId ? all.filter((e) => e.learnerId === learnerId) : all;
}

export async function createEnrolment(learnerId: string, courseId: string): Promise<Enrolment> {
  const all = await readAllEnrolments();
  const enrolment: Enrolment = {
    id: randomUUID(),
    learnerId,
    courseId,
    status: 'enrolled',
    enrolledAt: new Date().toISOString(),
  };
  all.push(enrolment);
  await writeJson(ENROLMENTS_PATH, all);
  return enrolment;
}

/** Marks an enrolment complete and bumps the linked competency's score, per Section 3's requirement. */
export async function completeEnrolment(enrolmentId: string): Promise<Enrolment | null> {
  const all = await readAllEnrolments();
  const enrolment = all.find((e) => e.id === enrolmentId);
  if (!enrolment) return null;
  enrolment.status = 'completed' as EnrolmentStatus;
  enrolment.completedAt = new Date().toISOString();
  await writeJson(ENROLMENTS_PATH, all);

  const course = getCourseById(enrolment.courseId);
  if (course) {
    const currentScores = await getLearnerScores(enrolment.learnerId);
    const currentScore = currentScores[course.competencyId]?.score ?? 0;
    // Completing a targeted course is modeled as a modest, capped competency bump —
    // a reasonable prototype heuristic, not a real post-training assessment.
    const bumped = Math.min(100, currentScore + 15);
    await recordCompetencyScore(enrolment.learnerId, course.competencyId, bumped, 'material-quiz');
  }
  return enrolment;
}

// ---------------------------------------------------------------------------
// Section 5 — Employee Dashboard aggregate

export interface DomainAverage {
  domain: CompetencyDomain;
  actual: number;
  expected: number;
  assessedCount: number;
}

export interface ProgressPoint {
  timestamp: string;
  averageScore: number;
}

export interface EmployeeDashboardData {
  domainAverages: DomainAverage[];
  gaps: CompetencyGap[];
  unassessed: { id: string; domain: CompetencyDomain; name: string }[];
  recommendations: { competencyId: string; gap: number; course: ReturnType<typeof getCourseById> }[];
  learningHoursLogged: number;
  coursesCompleted: number;
  coursesEnrolled: number;
  progressHistory: ProgressPoint[];
}

/** Everything the Employee Dashboard (Section 5) needs, computed server-side in one call. */
export async function getEmployeeDashboardData(learnerId: string): Promise<EmployeeDashboardData> {
  const learner = await getLearner(learnerId);
  if (!learner) {
    return { domainAverages: [], gaps: [], unassessed: [], recommendations: [], learningHoursLogged: 0, coursesCompleted: 0, coursesEnrolled: 0, progressHistory: [] };
  }

  const expected = getExpectedLevels(learner.jobRole);
  const scores = await getLearnerScores(learnerId);
  const gaps = await computeGaps(learnerId);

  const domainAverages: DomainAverage[] = DOMAINS.map((domain) => {
    const domainCompetencies = COMPETENCIES.filter((c) => c.domain === domain);
    const assessed = domainCompetencies.filter((c) => scores[c.id]);
    const actual = assessed.length ? Math.round(assessed.reduce((sum, c) => sum + scores[c.id].score, 0) / assessed.length) : 0;
    const expectedAvg = Math.round(domainCompetencies.reduce((sum, c) => sum + (expected[c.id] ?? 0), 0) / domainCompetencies.length);
    return { domain, actual, expected: expectedAvg, assessedCount: assessed.length };
  });

  const unassessed = unassessedCompetencies(scores).map((c) => ({ id: c.id, domain: c.domain, name: c.name }));

  const recommendations = recommendCoursesForGaps(gaps).slice(0, 6).map((r) => ({ ...r, course: getCourseById(r.course.id) }));

  const enrolments = await listEnrolments(learnerId);
  const coursesCompleted = enrolments.filter((e) => e.status === 'completed').length;
  const coursesEnrolled = enrolments.length;
  const learningHoursLogged = enrolments
    .filter((e) => e.status === 'completed')
    .reduce((sum, e) => sum + (getCourseById(e.courseId)?.durationHours || 0), 0);

  // Progress over time: every score-history entry across every competency,
  // flattened and sorted, giving a running average of "all scores recorded up to
  // that point" — a simple, honest trend line for a prototype, not a smoothed model.
  const allEntries = Object.values(scores)
    .flatMap((s) => s.history.map((h) => ({ ...h, competencyId: s.competencyId })))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const runningSums = new Map<string, number>();
  const progressHistory: ProgressPoint[] = allEntries.map((entry) => {
    runningSums.set(entry.competencyId, entry.score);
    const values = [...runningSums.values()];
    const averageScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return { timestamp: entry.timestamp, averageScore };
  });

  return { domainAverages, gaps, unassessed, recommendations, learningHoursLogged, coursesCompleted, coursesEnrolled, progressHistory };
}

// ---------------------------------------------------------------------------
// Section 6 — Administrator Dashboard aggregate (org-wide, across all learners)

export interface OrgDomainDistribution {
  domain: CompetencyDomain;
  averageScore: number;
  learnersAssessed: number;
}

export interface OrgCompetencyGap {
  competencyId: string;
  domain: CompetencyDomain;
  name: string;
  averageGap: number;
  learnersBelowExpected: number;
}

export interface AdminDashboardData {
  totalLearners: number;
  domainDistribution: OrgDomainDistribution[];
  emergingGaps: OrgCompetencyGap[];
  totalEnrolments: number;
  totalCompleted: number;
  completionRate: number;
  capacityNote: string;
}

/**
 * Org-wide aggregate for the Administrator Dashboard. The "capacity note" is a
 * simple, clearly-labeled heuristic (completions in the last 30 days vs. how
 * many still-open gaps exist), not a real forecasting model — the problem
 * statement explicitly allows this for a prototype.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const learners = await listLearners();
  const allScores = await readAllScores();
  const allEnrolments = await readAllEnrolments();

  const domainDistribution: OrgDomainDistribution[] = DOMAINS.map((domain) => {
    const domainCompetencyIds = new Set(COMPETENCIES.filter((c) => c.domain === domain).map((c) => c.id));
    let sum = 0;
    let count = 0;
    const learnersWithAny = new Set<string>();
    for (const state of allScores) {
      for (const score of Object.values(state.scores)) {
        if (!domainCompetencyIds.has(score.competencyId)) continue;
        sum += score.score;
        count += 1;
        learnersWithAny.add(state.learnerId);
      }
    }
    return { domain, averageScore: count ? Math.round(sum / count) : 0, learnersAssessed: learnersWithAny.size };
  });

  // Per-competency gap aggregated across every learner who has both a score and
  // a job role (so an expected level can be computed) for that competency.
  const gapAccumulator = new Map<string, { sum: number; count: number; below: number }>();
  for (const state of allScores) {
    const learner = learners.find((l) => l.id === state.learnerId);
    if (!learner) continue;
    const expected = getExpectedLevels(learner.jobRole);
    for (const score of Object.values(state.scores)) {
      const expectedLevel = expected[score.competencyId] ?? 0;
      const gap = Math.max(0, expectedLevel - score.score);
      const entry = gapAccumulator.get(score.competencyId) || { sum: 0, count: 0, below: 0 };
      entry.sum += gap;
      entry.count += 1;
      if (gap > 0) entry.below += 1;
      gapAccumulator.set(score.competencyId, entry);
    }
  }
  const emergingGaps: OrgCompetencyGap[] = [...gapAccumulator.entries()]
    .map(([competencyId, { sum, count, below }]) => {
      const def = getCompetency(competencyId);
      if (!def) return null;
      return { competencyId, domain: def.domain, name: def.name, averageGap: Math.round(sum / count), learnersBelowExpected: below };
    })
    .filter((g): g is OrgCompetencyGap => g !== null && g.averageGap > 0)
    .sort((a, b) => b.averageGap - a.averageGap)
    .slice(0, 8);

  const totalEnrolments = allEnrolments.length;
  const totalCompleted = allEnrolments.filter((e) => e.status === 'completed').length;
  const completionRate = totalEnrolments ? Math.round((totalCompleted / totalEnrolments) * 100) : 0;

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentCompletions = allEnrolments.filter((e) => e.completedAt && new Date(e.completedAt).getTime() >= thirtyDaysAgo).length;
  const openGapCount = emergingGaps.reduce((sum, g) => sum + g.learnersBelowExpected, 0);
  let capacityNote: string;
  if (openGapCount === 0) {
    capacityNote = 'No significant organization-wide gaps detected at current assessment coverage.';
  } else if (recentCompletions === 0) {
    capacityNote = `${openGapCount} learner-competency gaps are open org-wide with no completions in the last 30 days — capacity-building pace has stalled; consider prioritizing enrolment drives for the top gaps below.`;
  } else {
    const monthsToClose = Math.max(1, Math.ceil(openGapCount / recentCompletions));
    capacityNote = `At the current pace (${recentCompletions} course completions in the last 30 days), closing the ${openGapCount} open learner-competency gaps org-wide would take roughly ${monthsToClose} more month${monthsToClose === 1 ? '' : 's'} — a simple heuristic projection, not a statistical forecast.`;
  }

  return { totalLearners: learners.length, domainDistribution, emergingGaps, totalEnrolments, totalCompleted, completionRate, capacityNote };
}
