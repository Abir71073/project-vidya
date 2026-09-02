import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertOctagon, Loader2, ShieldAlert, Lightbulb, ChevronDown, ChevronUp, GraduationCap, AlertTriangle } from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import type { CompetencyDomain, LearnerRole } from '../../server/competency/types';

interface OrgDomainDistribution { domain: CompetencyDomain; averageScore: number; learnersAssessed: number }
interface OrgCompetencyGap { competencyId: string; domain: CompetencyDomain; name: string; averageGap: number; learnersBelowExpected: number }
interface LearnerBreakdownRow {
  id: string;
  name: string;
  role: LearnerRole;
  department: string;
  jobRole: string;
  competencyScores: { competencyId: string; name: string; score: number }[];
  completedCourses: { courseId: string; title: string; completedAt: string }[];
}
interface AdminData {
  totalLearners: number;
  domainDistribution: OrgDomainDistribution[];
  emergingGaps: OrgCompetencyGap[];
  totalEnrolments: number;
  totalCompleted: number;
  completionRate: number;
  capacityNote: string;
  learnerBreakdown: LearnerBreakdownRow[];
}

export default function AdminDashboard() {
  const { activeLearner } = useLearner();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeLearner) return;
    setLoading(true);
    setForbidden(false);
    setLoadError(null);
    fetch(`/api/dashboard/admin?requesterId=${activeLearner.id}`)
      .then(async (res) => {
        if (res.status === 403) {
          setForbidden(true);
          return null;
        }
        if (!res.ok) throw new Error('The server had trouble loading the admin dashboard.');
        return res.json();
      })
      .then((d) => d && setData(d))
      .catch((err) => {
        console.error('Failed to load admin dashboard:', err);
        setLoadError(err.message || 'Could not load the admin dashboard right now. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [activeLearner]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!activeLearner) {
    return <div className="h-full flex items-center justify-center text-center text-zinc-600"><p className="text-xs uppercase tracking-widest font-bold">Create or select a learner profile first.</p></div>;
  }
  // Belt-and-suspenders role gate: Layout.tsx already hides this nav item for
  // non-administrators, but the route itself re-checks too (see Section 8 /
  // SECURITY.md) so navigating here directly with an employee profile is blocked.
  if (activeLearner.role !== 'administrator' || forbidden) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 gap-3">
        <ShieldAlert className="w-8 h-8 text-red-500" />
        <p className="text-xs uppercase tracking-widest font-bold text-red-400">Administrator access required</p>
        <p className="text-[10px] text-zinc-600 max-w-xs">Switch to a profile with the Administrator role from Learner Profile to view this dashboard.</p>
      </div>
    );
  }
  if (loading) {
    return <div className="h-full flex items-center justify-center text-zinc-600"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (loadError || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-xs uppercase tracking-widest font-bold text-red-400">{loadError || 'Could not load the admin dashboard.'}</p>
      </div>
    );
  }

  const maxAvg = Math.max(1, ...data.domainDistribution.map((d) => d.averageScore));

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-6">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Administrator Dashboard</h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">Organization-wide competency insights, across all learner profiles.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile icon={<Users className="w-4 h-4" />} value={data.totalLearners} label="Total Learners" accent="pink" />
        <StatTile icon={<AlertOctagon className="w-4 h-4" />} value={data.emergingGaps.length} label="Emerging Skill Gaps" accent="orange" />
        <StatTile icon={<TrendingUp className="w-4 h-4" />} value={`${data.completionRate}%`} label="Training Completion Rate" accent="cyan" />
        <StatTile icon={<Users className="w-4 h-4" />} value={`${data.totalCompleted}/${data.totalEnrolments}`} label="Courses Completed" accent="pink" />
      </div>

      <div className="relative bg-orange-500/10 border border-orange-500/40 p-4 mb-8 flex items-start gap-3">
        <Lightbulb className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Capacity-Building Outlook (heuristic, not a forecasting model)</p>
          <p className="text-xs text-orange-200/90 leading-relaxed">{data.capacityNote}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
          <h3 className="font-['Bebas_Neue'] tracking-widest text-lg text-zinc-100 uppercase mb-1">Competency Distribution</h3>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Average score per domain, across all assessed learners</p>
          <div className="space-y-4">
            {data.domainDistribution.map((d) => (
              <div key={d.domain}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-300">{d.domain}</span>
                  <span className="text-[10px] font-bold text-zinc-400">{d.averageScore} <span className="text-zinc-600">({d.learnersAssessed} learners)</span></span>
                </div>
                <div className="h-2.5 bg-zinc-900 border border-zinc-800">
                  <div className="h-full bg-gradient-to-r from-pink-600 to-orange-500" style={{ width: `${(d.averageScore / maxAvg) * 100}%`, borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-orange" />
          <h3 className="font-['Bebas_Neue'] tracking-widest text-lg text-zinc-100 uppercase mb-1">Emerging Skill Gaps</h3>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Largest average gap, across all learners assessed on each</p>
          {data.emergingGaps.length === 0 ? (
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold text-center py-8">No organization-wide gaps detected yet.</p>
          ) : (
            <div className="divide-y divide-zinc-900">
              {data.emergingGaps.map((g) => (
                <div key={g.competencyId} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-200 truncate">{g.name}</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{g.domain} · {g.learnersBelowExpected} learner{g.learnersBelowExpected === 1 ? '' : 's'} below expected</p>
                  </div>
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 uppercase tracking-widest shrink-0">Avg gap {g.averageGap}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per-employee breakdown */}
      <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
        <h3 className="font-['Bebas_Neue'] tracking-widest text-lg text-zinc-100 uppercase mb-1">Per-Employee Breakdown</h3>
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Individual competency scores and completed courses — click a row to expand</p>

        {data.learnerBreakdown.length === 0 ? (
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold text-center py-8">No learner profiles exist yet.</p>
        ) : (
          <div className="divide-y divide-zinc-900">
            {data.learnerBreakdown.map((row) => {
              const isOpen = expanded.has(row.id);
              return (
                <div key={row.id}>
                  <button
                    onClick={() => toggleExpanded(row.id)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-900/40 transition-colors px-2 -mx-2"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-7 h-7 shrink-0 bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {row.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate">{row.name}</p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">{row.jobRole || 'Unassigned role'} · {row.department || 'No department'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border ${row.role === 'administrator' ? 'text-pink-400 border-pink-500/40 bg-pink-500/10' : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'}`}>{row.role}</span>
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest hidden sm:inline">{row.competencyScores.length} scored · {row.completedCourses.length} completed</span>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="pb-4 pl-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Competency Scores</p>
                        {row.competencyScores.length === 0 ? (
                          <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">No data yet — not assessed.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {row.competencyScores.map((s) => (
                              <div key={s.competencyId} className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 truncate">{s.name}</span>
                                <span className="text-zinc-300 font-bold shrink-0 ml-2">{s.score}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Completed Courses</p>
                        {row.completedCourses.length === 0 ? (
                          <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">No data yet — none completed.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {row.completedCourses.map((c) => (
                              <div key={c.courseId} className="text-xs">
                                <p className="text-zinc-400">{c.title}</p>
                                <p className="text-[9px] text-zinc-600">{new Date(c.completedAt).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, value, label, accent }: { icon: React.ReactNode; value: React.ReactNode; label: string; accent: 'pink' | 'orange' | 'cyan' }) {
  const accentClass = accent === 'pink' ? 'text-pink-500 border-pink-500/30 shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]' : accent === 'orange' ? 'text-orange-500 border-orange-500/30 shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]' : 'text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_-2px_rgba(34,211,238,0.3)]';
  return (
    <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-25px_rgba(0,0,0,0.9)]">
      <div className={`absolute top-0 left-0 right-0 h-px ${accent === 'pink' ? 'panel-accent-pink' : 'panel-accent-orange'}`} />
      <div className={`w-8 h-8 flex items-center justify-center border mb-3 ${accentClass}`}>{icon}</div>
      <p className="text-3xl font-['Bebas_Neue'] tracking-wider text-zinc-100">{value}</p>
      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}
