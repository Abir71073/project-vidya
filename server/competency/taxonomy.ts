import { CompetencyDefinition, CompetencyDomain } from './types';

// The 33 competencies below are copied verbatim from the SIH26101 problem statement
// (MoSPI: AI-enabled Skill Intelligence & Learning Platform) — 10 Statistical +
// 12 Technical + 5 Digital Governance + 6 Behavioural/Managerial. Do not add to or
// round out this list; the problem statement text is the source of truth, not a
// round number.
export const COMPETENCIES: CompetencyDefinition[] = [
  // Statistical (10)
  { id: 'survey-design', domain: 'Statistical', name: 'Survey Design' },
  { id: 'sampling', domain: 'Statistical', name: 'Sampling' },
  { id: 'national-accounts', domain: 'Statistical', name: 'National Accounts' },
  { id: 'price-statistics', domain: 'Statistical', name: 'Price Statistics' },
  { id: 'labour-statistics', domain: 'Statistical', name: 'Labour Statistics' },
  { id: 'agricultural-statistics', domain: 'Statistical', name: 'Agricultural Statistics' },
  { id: 'industrial-statistics', domain: 'Statistical', name: 'Industrial Statistics' },
  { id: 'sdg-indicators', domain: 'Statistical', name: 'SDG Indicators' },
  { id: 'metadata-standards', domain: 'Statistical', name: 'Metadata Standards' },
  { id: 'data-quality-frameworks', domain: 'Statistical', name: 'Data Quality Frameworks' },
  // Technical (12)
  { id: 'python', domain: 'Technical', name: 'Python' },
  { id: 'r', domain: 'Technical', name: 'R' },
  { id: 'sql', domain: 'Technical', name: 'SQL' },
  { id: 'stata', domain: 'Technical', name: 'Stata' },
  { id: 'spss', domain: 'Technical', name: 'SPSS' },
  { id: 'sas', domain: 'Technical', name: 'SAS' },
  { id: 'gis', domain: 'Technical', name: 'GIS' },
  { id: 'data-visualization', domain: 'Technical', name: 'Data Visualization' },
  { id: 'ai-ml', domain: 'Technical', name: 'AI/ML' },
  { id: 'cloud-computing', domain: 'Technical', name: 'Cloud Computing' },
  { id: 'apis', domain: 'Technical', name: 'APIs' },
  { id: 'open-data', domain: 'Technical', name: 'Open Data' },
  // Digital Governance (5)
  { id: 'cybersecurity', domain: 'Digital Governance', name: 'Cybersecurity' },
  { id: 'data-privacy', domain: 'Digital Governance', name: 'Data Privacy' },
  { id: 'digital-signatures', domain: 'Digital Governance', name: 'Digital Signatures' },
  { id: 'government-cloud', domain: 'Digital Governance', name: 'Government Cloud' },
  { id: 'digital-public-infrastructure', domain: 'Digital Governance', name: 'Digital Public Infrastructure' },
  // Behavioural/Managerial (6)
  { id: 'leadership', domain: 'Behavioural/Managerial', name: 'Leadership' },
  { id: 'communication', domain: 'Behavioural/Managerial', name: 'Communication' },
  { id: 'project-management', domain: 'Behavioural/Managerial', name: 'Project Management' },
  { id: 'ethics', domain: 'Behavioural/Managerial', name: 'Ethics' },
  { id: 'decision-making', domain: 'Behavioural/Managerial', name: 'Decision Making' },
  { id: 'change-management', domain: 'Behavioural/Managerial', name: 'Change Management' },
];

export function getCompetency(id: string): CompetencyDefinition | undefined {
  return COMPETENCIES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Job-role expected competency levels (0-100 per competency).
//
// PROTOTYPE-SCOPE, hardcoded per the problem statement's own allowance ("a small
// hardcoded mapping is fine for a prototype"). Role titles are real Indian
// Statistical Service (ISS) grades and NSSTA training-calendar target groups, not
// invented placeholders — verified against mospi.gov.in (Indian Statistical
// Service grade ladder: Junior Time Scale/Assistant Director, Senior Time
// Scale/Deputy Director, JAG-NFSG/Joint Director, SAG/Deputy Director General,
// HAG/Additional Director General) and NSSTA's published training-calendar target
// groups (ISS Probationers, State DES officers). A production version would pull
// each official's actual sanctioned post/grade from the government HR system
// (e.g. via iGOT Karmayogi's profile data) instead of a hardcoded table.
//
// Each role has a per-domain baseline (how much that grade is generally expected
// to know in each domain) plus a short list of per-competency overrides for that
// role's signature responsibilities — e.g. a Deputy Director doing National
// Accounts compilation needs more of it than the flat Statistical baseline: this
// keeps the 33x6 table from being 198 arbitrary hand-typed numbers while still
// being fully hardcoded, not computed from real data.
const DOMAIN_BASELINES: Record<string, Record<CompetencyDomain, number>> = {
  'ISS Probationer': { Statistical: 50, Technical: 45, 'Digital Governance': 35, 'Behavioural/Managerial': 45 },
  'Assistant Director (JTS)': { Statistical: 65, Technical: 60, 'Digital Governance': 45, 'Behavioural/Managerial': 50 },
  'Deputy Director (STS)': { Statistical: 78, Technical: 65, 'Digital Governance': 55, 'Behavioural/Managerial': 62 },
  'Joint Director (JAG/NFSG)': { Statistical: 80, Technical: 58, 'Digital Governance': 65, 'Behavioural/Managerial': 75 },
  'Additional Director General (HAG)': { Statistical: 75, Technical: 45, 'Digital Governance': 75, 'Behavioural/Managerial': 88 },
  'State DES Officer': { Statistical: 72, Technical: 42, 'Digital Governance': 48, 'Behavioural/Managerial': 55 },
};

const ROLE_OVERRIDES: Record<string, Record<string, number>> = {
  'ISS Probationer': { python: 55, sql: 55, 'data-visualization': 50, ethics: 55 },
  'Assistant Director (JTS)': { python: 70, sql: 70, 'data-visualization': 65, 'survey-design': 70, sampling: 70 },
  'Deputy Director (STS)': {
    'national-accounts': 85, 'price-statistics': 85, sampling: 88, 'data-quality-frameworks': 85,
    python: 70, sql: 72, 'project-management': 70,
  },
  'Joint Director (JAG/NFSG)': {
    'metadata-standards': 85, 'sdg-indicators': 85, 'data-quality-frameworks': 85,
    leadership: 82, 'project-management': 82, 'decision-making': 80,
  },
  'Additional Director General (HAG)': {
    leadership: 92, 'decision-making': 90, 'change-management': 88, communication: 90,
    'data-privacy': 80, 'digital-public-infrastructure': 78,
  },
  'State DES Officer': {
    'survey-design': 80, sampling: 82, 'agricultural-statistics': 78, 'industrial-statistics': 75,
    'labour-statistics': 78, gis: 55, python: 40, 'ai-ml': 25, 'cloud-computing': 30,
  },
};

export const JOB_ROLES = Object.keys(DOMAIN_BASELINES);

// ---------------------------------------------------------------------------
// Departmental priorities — small hardcoded list per department, same
// prototype-scope pattern as DOMAIN_BASELINES/ROLE_OVERRIDES above. Department
// is free text on the profile form, not a fixed enum, so this table will not
// have every possible value a user types — getDepartmentPriorities() always
// returns an array (empty if unrecognized), never throws, so the recommendation
// engine can call it unconditionally without checking existence first.
const DEPARTMENT_PRIORITIES: Record<string, string[]> = {
  'NSSO — Survey Design & Research': ['survey-design', 'sampling', 'data-quality-frameworks'],
  'National Accounts Division': ['national-accounts', 'price-statistics', 'python'],
  'Price Statistics Division': ['price-statistics', 'national-accounts', 'data-visualization'],
  'SDG Monitoring Cell': ['sdg-indicators', 'metadata-standards', 'data-quality-frameworks'],
  "Director General's Office": ['leadership', 'decision-making', 'change-management'],
  'Directorate of Economics & Statistics, Bihar': ['agricultural-statistics', 'survey-design', 'gis'],
};

/** Priority competencyIds for a department, or [] if the department isn't in the table — never throws. */
export function getDepartmentPriorities(department: string | undefined | null): string[] {
  if (!department) return [];
  return DEPARTMENT_PRIORITIES[department] || [];
}

/** Expected 0-100 level for one job role across all 33 competencies (baseline + signature overrides). */
export function getExpectedLevels(jobRole: string): Record<string, number> {
  const baselines = DOMAIN_BASELINES[jobRole] || DOMAIN_BASELINES['ISS Probationer'];
  const overrides = ROLE_OVERRIDES[jobRole] || {};
  const levels: Record<string, number> = {};
  for (const c of COMPETENCIES) {
    levels[c.id] = overrides[c.id] ?? baselines[c.domain];
  }
  return levels;
}
