import { Course } from './types';

// ============================================================================
// DEMO INTEGRATION — NOT CONNECTED TO LIVE iGOT KARMAYOGI / NSSTA APIs.
// This is a small, hand-written local catalogue standing in for what a real
// integration would fetch from iGOT Karmayogi's course-search API and NSSTA's
// TPAC-approved training-programme calendar. Every course/programme below is a
// realistic *sample*, not a real live course listing.
//
// The two exported functions below (`getCoursesForCompetency`, `getCourseById`)
// are the entire interface the rest of the app depends on. Swapping this file's
// body for a real API client later is a data-source change, not a redesign —
// nothing outside this file needs to change as long as these two signatures and
// the `Course` shape (server/competency/types.ts) stay the same.
// ============================================================================

// One iGOT-Karmayogi-style course per competency, so every one of the 33 always
// has at least one recommendation available.
const IGOT_COURSES: Course[] = [
  { id: 'igot-survey-design', competencyId: 'survey-design', title: 'Fundamentals of Survey Design for Official Statistics', provider: 'iGOT Karmayogi', durationHours: 12, level: 'Foundation', description: 'Questionnaire design, sampling frame construction, and pilot-testing for large-scale government surveys.' },
  { id: 'igot-sampling', competencyId: 'sampling', title: 'Sampling Techniques in Official Statistics', provider: 'iGOT Karmayogi', durationHours: 16, level: 'Intermediate', description: 'Probability sampling designs used across NSS rounds, stratification, and variance estimation.' },
  { id: 'igot-national-accounts', competencyId: 'national-accounts', title: 'National Accounts Statistics: Concepts & Compilation', provider: 'iGOT Karmayogi', durationHours: 20, level: 'Intermediate', description: 'GDP/GVA compilation methodology per the System of National Accounts (SNA) 2008.' },
  { id: 'igot-price-statistics', competencyId: 'price-statistics', title: 'Price Index Construction (CPI/WPI)', provider: 'iGOT Karmayogi', durationHours: 14, level: 'Intermediate', description: 'Weight derivation, price collection protocols, and index-linking for CPI and WPI.' },
  { id: 'igot-labour-statistics', competencyId: 'labour-statistics', title: 'Labour Force Statistics & PLFS Methodology', provider: 'iGOT Karmayogi', durationHours: 12, level: 'Foundation', description: 'Concepts of workforce participation, unemployment measurement, and PLFS survey design.' },
  { id: 'igot-agricultural-statistics', competencyId: 'agricultural-statistics', title: 'Agricultural Statistics & Crop Estimation Surveys', provider: 'iGOT Karmayogi', durationHours: 14, level: 'Foundation', description: 'Crop-cutting experiments, land-use statistics, and agricultural census methodology.' },
  { id: 'igot-industrial-statistics', competencyId: 'industrial-statistics', title: 'Index of Industrial Production & ASI Methodology', provider: 'iGOT Karmayogi', durationHours: 14, level: 'Intermediate', description: 'Annual Survey of Industries data collection and IIP compilation.' },
  { id: 'igot-sdg-indicators', competencyId: 'sdg-indicators', title: 'SDG National Indicator Framework', provider: 'iGOT Karmayogi', durationHours: 10, level: 'Foundation', description: 'Mapping departmental data to the National Indicator Framework for SDG monitoring.' },
  { id: 'igot-metadata-standards', competencyId: 'metadata-standards', title: 'Statistical Metadata Standards (SDMX & DDI)', provider: 'iGOT Karmayogi', durationHours: 10, level: 'Intermediate', description: 'Applying SDMX and DDI metadata standards to government statistical datasets.' },
  { id: 'igot-data-quality', competencyId: 'data-quality-frameworks', title: 'Data Quality Assurance Frameworks (IMF DQAF)', provider: 'iGOT Karmayogi', durationHours: 12, level: 'Intermediate', description: 'Applying an IMF-DQAF-style quality framework to official statistics production.' },

  { id: 'igot-python', competencyId: 'python', title: 'Python for Statistical Data Processing', provider: 'iGOT Karmayogi', durationHours: 24, level: 'Foundation', description: 'pandas/numpy for cleaning, tabulating, and validating large survey datasets.' },
  { id: 'igot-r', competencyId: 'r', title: 'R for Official Statistics', provider: 'iGOT Karmayogi', durationHours: 20, level: 'Foundation', description: 'Data wrangling and survey-weighted estimation using R and the `survey` package.' },
  { id: 'igot-sql', competencyId: 'sql', title: 'SQL for Government Data Warehouses', provider: 'iGOT Karmayogi', durationHours: 16, level: 'Foundation', description: 'Querying and joining large administrative datasets in a relational warehouse.' },
  { id: 'igot-stata', competencyId: 'stata', title: 'Stata for Survey Data Analysis', provider: 'iGOT Karmayogi', durationHours: 16, level: 'Intermediate', description: 'Survey-weighted regression and tabulation workflows in Stata.' },
  { id: 'igot-spss', competencyId: 'spss', title: 'SPSS for Applied Statistical Analysis', provider: 'iGOT Karmayogi', durationHours: 14, level: 'Foundation', description: 'Descriptive and inferential analysis of official survey microdata in SPSS.' },
  { id: 'igot-sas', competencyId: 'sas', title: 'SAS Programming for Large-Scale Data Processing', provider: 'iGOT Karmayogi', durationHours: 18, level: 'Intermediate', description: 'Batch processing and validation of large administrative data extracts in SAS.' },
  { id: 'igot-gis', competencyId: 'gis', title: 'GIS for Spatial Statistics', provider: 'iGOT Karmayogi', durationHours: 16, level: 'Intermediate', description: 'Mapping survey frames and small-area estimates using QGIS.' },
  { id: 'igot-dataviz', competencyId: 'data-visualization', title: 'Data Visualization for Policy Communication', provider: 'iGOT Karmayogi', durationHours: 10, level: 'Foundation', description: 'Designing clear dashboards and charts for non-technical policy audiences.' },
  { id: 'igot-ai-ml', competencyId: 'ai-ml', title: 'AI/ML Applications in Official Statistics', provider: 'iGOT Karmayogi', durationHours: 24, level: 'Advanced', description: 'Applying machine learning to data imputation, anomaly detection, and nowcasting.' },
  { id: 'igot-cloud', competencyId: 'cloud-computing', title: 'Cloud Computing Fundamentals for Public Sector', provider: 'iGOT Karmayogi', durationHours: 12, level: 'Foundation', description: 'Core cloud concepts (compute, storage, IAM) for government data platforms.' },
  { id: 'igot-apis', competencyId: 'apis', title: 'Building & Consuming Government Data APIs', provider: 'iGOT Karmayogi', durationHours: 14, level: 'Intermediate', description: 'REST API design for statistical data dissemination services.' },
  { id: 'igot-open-data', competencyId: 'open-data', title: 'Open Government Data Publishing', provider: 'iGOT Karmayogi', durationHours: 8, level: 'Foundation', description: 'Publishing datasets to data.gov.in under open-data licensing and formats.' },

  { id: 'igot-cybersecurity', competencyId: 'cybersecurity', title: 'Cybersecurity Essentials for Government Officials', provider: 'iGOT Karmayogi', durationHours: 8, level: 'Foundation', description: 'Threat awareness, secure handling of official data, and incident reporting.' },
  { id: 'igot-data-privacy', competencyId: 'data-privacy', title: 'Data Privacy & the DPDP Act, 2023', provider: 'iGOT Karmayogi', durationHours: 8, level: 'Foundation', description: "Applying India's Digital Personal Data Protection Act to statistical data handling." },
  { id: 'igot-digital-signatures', competencyId: 'digital-signatures', title: 'Digital Signatures & e-Authentication in Government', provider: 'iGOT Karmayogi', durationHours: 4, level: 'Foundation', description: 'DSC usage, e-signing of official documents, and PKI basics.' },
  { id: 'igot-gov-cloud', competencyId: 'government-cloud', title: 'MeghRaj: Government Cloud Fundamentals', provider: 'iGOT Karmayogi', durationHours: 10, level: 'Foundation', description: "Working within India's GI Cloud (MeghRaj) empanelment and compliance model." },
  { id: 'igot-dpi', competencyId: 'digital-public-infrastructure', title: 'Digital Public Infrastructure: Aadhaar, UPI & Beyond', provider: 'iGOT Karmayogi', durationHours: 10, level: 'Foundation', description: 'How DPI building blocks integrate with statistical and administrative data systems.' },

  { id: 'igot-leadership', competencyId: 'leadership', title: 'Leadership in Public Institutions', provider: 'iGOT Karmayogi', durationHours: 16, level: 'Intermediate', description: 'Leading statistical teams and cross-departmental coordination.' },
  { id: 'igot-communication', competencyId: 'communication', title: 'Effective Communication for Civil Servants', provider: 'iGOT Karmayogi', durationHours: 8, level: 'Foundation', description: 'Written and verbal communication of statistical findings to policymakers.' },
  { id: 'igot-project-management', competencyId: 'project-management', title: 'Project Management for Survey Operations', provider: 'iGOT Karmayogi', durationHours: 14, level: 'Intermediate', description: 'Planning and monitoring large-scale field survey rollouts.' },
  { id: 'igot-ethics', competencyId: 'ethics', title: 'Ethics in Public Service & Official Statistics', provider: 'iGOT Karmayogi', durationHours: 6, level: 'Foundation', description: 'Statistical integrity, conflicts of interest, and the Code of Conduct for civil servants.' },
  { id: 'igot-decision-making', competencyId: 'decision-making', title: 'Evidence-Based Decision Making', provider: 'iGOT Karmayogi', durationHours: 10, level: 'Intermediate', description: 'Using statistical evidence to inform policy decisions under uncertainty.' },
  { id: 'igot-change-management', competencyId: 'change-management', title: 'Change Management in Government Modernization', provider: 'iGOT Karmayogi', durationHours: 12, level: 'Advanced', description: 'Leading digital transformation initiatives within statistical offices.' },
];

// A handful of NSSTA TPAC-style integrated training programmes — each spans
// several related competencies, so it appears once per competency it covers
// (same programme, tagged to each relevant competencyId) rather than needing a
// multi-competency course schema.
const NSSTA_TPAC_PROGRAMMES: Course[] = [
  { id: 'nssta-tpac-survey-ops-1', competencyId: 'survey-design', title: 'TPAC-Approved Programme on Survey Design & Sampling for NSS Rounds', provider: 'NSSTA TPAC', durationHours: 40, level: 'Intermediate', description: 'NSSTA, Greater Noida — integrated field-training programme combining survey design and sampling for officers deputed to NSS field rounds.' },
  { id: 'nssta-tpac-survey-ops-2', competencyId: 'sampling', title: 'TPAC-Approved Programme on Survey Design & Sampling for NSS Rounds', provider: 'NSSTA TPAC', durationHours: 40, level: 'Intermediate', description: 'NSSTA, Greater Noida — integrated field-training programme combining survey design and sampling for officers deputed to NSS field rounds.' },

  { id: 'nssta-tpac-economic-stats-1', competencyId: 'national-accounts', title: 'TPAC-Approved Programme on Economic Statistics Compilation', provider: 'NSSTA TPAC', durationHours: 36, level: 'Advanced', description: 'NSSTA, Greater Noida — National Accounts, Price Statistics and Industrial Statistics compilation for STS/JAG-grade officers.' },
  { id: 'nssta-tpac-economic-stats-2', competencyId: 'price-statistics', title: 'TPAC-Approved Programme on Economic Statistics Compilation', provider: 'NSSTA TPAC', durationHours: 36, level: 'Advanced', description: 'NSSTA, Greater Noida — National Accounts, Price Statistics and Industrial Statistics compilation for STS/JAG-grade officers.' },
  { id: 'nssta-tpac-economic-stats-3', competencyId: 'industrial-statistics', title: 'TPAC-Approved Programme on Economic Statistics Compilation', provider: 'NSSTA TPAC', durationHours: 36, level: 'Advanced', description: 'NSSTA, Greater Noida — National Accounts, Price Statistics and Industrial Statistics compilation for STS/JAG-grade officers.' },

  { id: 'nssta-tpac-data-science-1', competencyId: 'python', title: 'TPAC-Approved Programme on Data Science for Official Statistics', provider: 'NSSTA TPAC', durationHours: 32, level: 'Intermediate', description: 'NSSTA, Greater Noida — Python, data visualization and applied AI/ML for statistical officers, run jointly with NIC.' },
  { id: 'nssta-tpac-data-science-2', competencyId: 'data-visualization', title: 'TPAC-Approved Programme on Data Science for Official Statistics', provider: 'NSSTA TPAC', durationHours: 32, level: 'Intermediate', description: 'NSSTA, Greater Noida — Python, data visualization and applied AI/ML for statistical officers, run jointly with NIC.' },
  { id: 'nssta-tpac-data-science-3', competencyId: 'ai-ml', title: 'TPAC-Approved Programme on Data Science for Official Statistics', provider: 'NSSTA TPAC', durationHours: 32, level: 'Intermediate', description: 'NSSTA, Greater Noida — Python, data visualization and applied AI/ML for statistical officers, run jointly with NIC.' },

  { id: 'nssta-tpac-quality-metadata-1', competencyId: 'data-quality-frameworks', title: 'TPAC-Approved Programme on Data Quality & Metadata Standards', provider: 'NSSTA TPAC', durationHours: 24, level: 'Intermediate', description: 'NSSTA, Greater Noida — DQAF-based quality frameworks and SDMX metadata for statistical products.' },
  { id: 'nssta-tpac-quality-metadata-2', competencyId: 'metadata-standards', title: 'TPAC-Approved Programme on Data Quality & Metadata Standards', provider: 'NSSTA TPAC', durationHours: 24, level: 'Intermediate', description: 'NSSTA, Greater Noida — DQAF-based quality frameworks and SDMX metadata for statistical products.' },
  { id: 'nssta-tpac-quality-metadata-3', competencyId: 'sdg-indicators', title: 'TPAC-Approved Programme on Data Quality & Metadata Standards', provider: 'NSSTA TPAC', durationHours: 24, level: 'Intermediate', description: 'NSSTA, Greater Noida — DQAF-based quality frameworks and SDMX metadata for statistical products.' },

  { id: 'nssta-tpac-leadership-1', competencyId: 'leadership', title: 'ISS Probationary Training — Managerial & Ethics Module', provider: 'NSSTA TPAC', durationHours: 28, level: 'Foundation', description: 'NSSTA, Greater Noida — leadership, ethics and decision-making module of the ISS Probationary Training programme.' },
  { id: 'nssta-tpac-leadership-2', competencyId: 'ethics', title: 'ISS Probationary Training — Managerial & Ethics Module', provider: 'NSSTA TPAC', durationHours: 28, level: 'Foundation', description: 'NSSTA, Greater Noida — leadership, ethics and decision-making module of the ISS Probationary Training programme.' },
  { id: 'nssta-tpac-leadership-3', competencyId: 'decision-making', title: 'ISS Probationary Training — Managerial & Ethics Module', provider: 'NSSTA TPAC', durationHours: 28, level: 'Foundation', description: 'NSSTA, Greater Noida — leadership, ethics and decision-making module of the ISS Probationary Training programme.' },

  { id: 'nssta-tpac-digital-gov-1', competencyId: 'cybersecurity', title: 'TPAC-Approved Programme on Digital Governance for Statistical Offices', provider: 'NSSTA TPAC', durationHours: 20, level: 'Foundation', description: 'NSSTA, Greater Noida — cybersecurity, data privacy and government cloud practices for statistical offices.' },
  { id: 'nssta-tpac-digital-gov-2', competencyId: 'data-privacy', title: 'TPAC-Approved Programme on Digital Governance for Statistical Offices', provider: 'NSSTA TPAC', durationHours: 20, level: 'Foundation', description: 'NSSTA, Greater Noida — cybersecurity, data privacy and government cloud practices for statistical offices.' },
  { id: 'nssta-tpac-digital-gov-3', competencyId: 'government-cloud', title: 'TPAC-Approved Programme on Digital Governance for Statistical Offices', provider: 'NSSTA TPAC', durationHours: 20, level: 'Foundation', description: 'NSSTA, Greater Noida — cybersecurity, data privacy and government cloud practices for statistical offices.' },
];

const ALL_COURSES: Course[] = [...IGOT_COURSES, ...NSSTA_TPAC_PROGRAMMES];

/** Every course/programme tagged to one competency — the mock stand-in for a real iGOT/NSSTA catalogue search. */
export function getCoursesForCompetency(competencyId: string): Course[] {
  return ALL_COURSES.filter((c) => c.competencyId === competencyId);
}

export function getCourseById(courseId: string): Course | undefined {
  return ALL_COURSES.find((c) => c.id === courseId);
}

/** Top course recommendation for each gap, largest gap first, one per competency. */
export function recommendCoursesForGaps(gaps: { competencyId: string; gap: number }[]): { competencyId: string; gap: number; course: Course }[] {
  return gaps
    .filter((g) => g.gap > 0)
    .map((g) => {
      const courses = getCoursesForCompetency(g.competencyId);
      const course = courses.find((c) => c.provider === 'iGOT Karmayogi') || courses[0];
      return course ? { competencyId: g.competencyId, gap: g.gap, course } : null;
    })
    .filter((r): r is { competencyId: string; gap: number; course: Course } => r !== null);
}
