import { useState, useEffect, useMemo } from 'react';
import { Target, Clock, TrendingUp, GraduationCap, Loader2, AlertTriangle } from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import type { CompetencyDomain } from '../../server/competency/types';

interface DomainAverage { domain: CompetencyDomain; actual: number; expected: number; assessedCount: number }
interface GapRow { competencyId: string; domain: CompetencyDomain; name: string; actual: number; expected: number; gap: number }
interface Recommendation { competencyId: string; gap: number; course: { title: string; provider: string } | null }
interface ProgressPoint { timestamp: string; averageScore: number }
interface DashboardData {
  domainAverages: DomainAverage[];
  gaps: GapRow[];
  unassessed: { id: string; domain: CompetencyDomain; name: string }[];
  recommendations: Recommendation[];
  learningHoursLogged: number;
  coursesCompleted: number;
  coursesEnrolled: number;
  progressHistory: ProgressPoint[];
}

const DOMAIN_SHORT: Record<CompetencyDomain, string> = {
  Statistical: 'Statistical',
  Technical: 'Technical',
  'Digital Governance': 'Digital Gov.',
  'Behavioural/Managerial': 'Behavioural',
};

export default function EmployeeDashboard() {
  const { activeLearner } = useLearner();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState<CompetencyDomain>('Statistical');

  useEffect(() => {
    if (!activeLearner) return;
    setLoading(true);
    fetch(`/api/dashboard/employee/${activeLearner.id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeLearner]);

  const domainGaps = useMemo(() => (data?.gaps || []).filter((g) => g.domain === domainFilter), [data, domainFilter]);

  if (!activeLearner) {
    return <div className="h-full flex items-center justify-center text-center text-zinc-600"><p className="text-xs uppercase tracking-widest font-bold">Create or select a learner profile first.</p></div>;
  }
  if (loading || !data) {
    return <div className="h-full flex items-center justify-center text-zinc-600"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const totalAssessed = data.domainAverages.reduce((s, d) => s + d.assessedCount, 0);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-6">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">{activeLearner.name}'s Dashboard</h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">{activeLearner.jobRole || 'No job role set'} · {activeLearner.department}</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile icon={<Target className="w-4 h-4" />} value={totalAssessed} label="Competencies Assessed" accent="pink" />
        <StatTile icon={<AlertTriangle className="w-4 h-4" />} value={data.gaps.filter((g) => g.gap > 0).length} label="Open Gaps" accent="orange" />
        <StatTile icon={<Clock className="w-4 h-4" />} value={data.learningHoursLogged} label="Learning Hours Logged" accent="cyan" />
        <StatTile icon={<GraduationCap className="w-4 h-4" />} value={`${data.coursesCompleted}/${data.coursesEnrolled}`} label="Courses Completed" accent="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Panel title="Competency Radar" subtitle="Actual vs. expected level per domain">
          <RadarChart data={data.domainAverages} />
        </Panel>
        <Panel title="Progress Over Time" subtitle="Running average score across all assessments">
          <Sparkline points={data.progressHistory} />
        </Panel>
      </div>

      <div className="mb-8">
        <Panel
          title="Competencies by Domain"
          subtitle="Actual score (bar) vs. expected level (marker)"
          headerExtra={
            <div className="flex flex-wrap gap-1 bg-black border border-zinc-900 p-1">
              {(Object.keys(DOMAIN_SHORT) as CompetencyDomain[]).map((d) => (
                <button key={d} onClick={() => setDomainFilter(d)} className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${domainFilter === d ? 'bg-zinc-900 text-orange-500 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  {DOMAIN_SHORT[d]}
                </button>
              ))}
            </div>
          }
        >
          <CompetencyBars rows={domainGaps} />
        </Panel>
      </div>

      <Panel title="Recommended Learning Paths" subtitle="Top gaps, mapped to the mock course catalogue">
        {data.recommendations.length === 0 ? (
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold text-center py-6">No open gaps right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.recommendations.map((r) => (
              <div key={r.competencyId} className="p-3 border border-zinc-800 bg-black flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate">{r.course?.title}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{r.course?.provider}</p>
                </div>
                <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 uppercase tracking-widest shrink-0">Gap {r.gap}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
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

function Panel({ title, subtitle, headerExtra, children }: { title: string; subtitle: string; headerExtra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
      <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-['Bebas_Neue'] tracking-widest text-lg text-zinc-100 uppercase">{title}</h3>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{subtitle}</p>
        </div>
        {headerExtra}
      </div>
      {children}
    </div>
  );
}

// --- Radar chart: 4 axes (the 4 competency domains), Actual vs Expected overlay.
// Mark spec per the dataviz skill: 2px strokes, a legend (2 series), muted
// recessive gridlines, direct value labels only at each vertex (not every pixel).
function RadarChart({ data }: { data: DomainAverage[] }) {
  // Wider than tall: the longest domain labels ("Digital Governance",
  // "Behavioural/Managerial") sit at the left/right vertices, so they need more
  // horizontal clearance than the top/bottom ones need vertically — a square
  // viewBox clipped them at narrow widths.
  const width = 340;
  const height = 280;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = height / 2 - 56; // leave room for axis labels
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / data.length;
  const pointFor = (i: number, value: number) => {
    const angle = angleFor(i);
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)];
  };
  const polygon = (values: number[]) => values.map((v, i) => pointFor(i, v).join(',')).join(' ');

  const actualPts = polygon(data.map((d) => d.actual));
  const expectedPts = polygon(data.map((d) => d.expected));
  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 380, height: 'auto' }}>
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={data.map((_, i) => pointFor(i, level).join(',')).join(' ')}
            fill="none"
            stroke="#27272a"
            strokeWidth={1}
          />
        ))}
        {data.map((_, i) => {
          const [x, y] = pointFor(i, 100);
          return <line key={i} x1={centerX} y1={centerY} x2={x} y2={y} stroke="#27272a" strokeWidth={1} />;
        })}

        <polygon points={expectedPts} fill="none" stroke="#71717a" strokeWidth={2} strokeDasharray="4 3" />
        <polygon points={actualPts} fill="#ec4899" fillOpacity={0.22} stroke="#ec4899" strokeWidth={2} strokeLinejoin="round" />
        {data.map((d, i) => {
          const [x, y] = pointFor(i, d.actual);
          return <circle key={i} cx={x} cy={y} r={3.5} fill="#ec4899" stroke="#09090b" strokeWidth={1.5} />;
        })}

        {data.map((d, i) => {
          const angle = angleFor(i);
          const lx = centerX + (radius + 34) * Math.cos(angle);
          const ly = centerY + (radius + 34) * Math.sin(angle);
          return (
            <text key={i} x={lx} y={ly} fill="#a1a1aa" fontSize={10} fontWeight={700} textAnchor="middle" dominantBaseline="middle" letterSpacing={0.5}>
              {DOMAIN_SHORT[d.domain]}
            </text>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2">
        <LegendSwatch color="#ec4899" label="Actual" />
        <LegendSwatch color="#71717a" label="Expected" dashed />
      </div>
    </div>
  );
}

function LegendSwatch({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} /></svg>
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// --- Horizontal bar chart: actual score as the bar, expected level as a tick
// marker overlaid on it. Status color (green = meets/exceeds expected, pink =
// gap) rather than a flat single hue, since "met vs. gap" is the thing being
// communicated. Labels stay left-aligned so long Hindi/Bengali competency names
// wrap without colliding with the bar.
function CompetencyBars({ rows }: { rows: GapRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold text-center py-6">No competencies assessed in this domain yet.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const met = row.actual >= row.expected;
        return (
          <div key={row.competencyId}>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-xs text-zinc-300 break-words">{row.name}</span>
              <span className={`text-[10px] font-bold shrink-0 ${met ? 'text-green-400' : 'text-pink-400'}`}>{row.actual}<span className="text-zinc-600"> / {row.expected}</span></span>
            </div>
            <div className="relative h-2.5 bg-zinc-900 border border-zinc-800">
              <div
                className={`h-full ${met ? 'bg-green-500' : 'bg-pink-500'}`}
                style={{ width: `${Math.max(2, row.actual)}%`, borderRadius: '2px' }}
              />
              <div
                className="absolute top-[-3px] w-[2px] h-[16px] bg-zinc-400"
                style={{ left: `${Math.min(99, row.expected)}%` }}
                title={`Expected: ${row.expected}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Sparkline: running-average score over time. Single series, no legend
// needed (the panel title names it), thin 2px line, muted baseline gridline.
function Sparkline({ points }: { points: ProgressPoint[] }) {
  if (points.length < 2) {
    return <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold text-center py-16">Not enough history yet — complete a few assessments to see a trend.</p>;
  }
  const width = 400;
  const height = 160;
  const padding = 24;
  const xStep = (width - padding * 2) / (points.length - 1);
  const yFor = (v: number) => height - padding - (v / 100) * (height - padding * 2);
  const linePoints = points.map((p, i) => `${padding + i * xStep},${yFor(p.averageScore)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 460, height: 'auto' }}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#27272a" strokeWidth={1} />
        <polyline points={linePoints} fill="none" stroke="#ec4899" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={padding + (points.length - 1) * xStep} cy={yFor(last.averageScore)} r={4} fill="#ec4899" stroke="#09090b" strokeWidth={1.5} />
        <text x={padding + (points.length - 1) * xStep} y={yFor(last.averageScore) - 10} fill="#ec4899" fontSize={11} fontWeight={700} textAnchor="end">{last.averageScore}</text>
      </svg>
      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {points.length} data points recorded</p>
    </div>
  );
}
