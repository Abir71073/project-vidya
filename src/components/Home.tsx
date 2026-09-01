import { Target, TrendingUp, UserCircle2, ClipboardList, GraduationCap, BarChart3, BookOpen, ArrowRight, Award } from 'lucide-react';
import { Section } from '../types';
import { useLearner } from '../context/LearnerContext';

const MODULES: { id: Section; label: string; description: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'profile', label: 'Learner Profile', description: 'Set up or switch your profile — designation, role, and prior trainings.', icon: <UserCircle2 className="w-5 h-5" />, accent: 'pink' },
  { id: 'assessment', label: 'Competency Assessment', description: 'Assess yourself against Statistical, Technical, Digital Governance, or Behavioural competencies.', icon: <ClipboardList className="w-5 h-5" />, accent: 'orange' },
  { id: 'learning', label: 'Learning Paths', description: 'Recommended iGOT Karmayogi / NSSTA courses, mapped to your identified gaps.', icon: <GraduationCap className="w-5 h-5" />, accent: 'cyan' },
  { id: 'dashboard', label: 'My Dashboard', description: 'Your competency radar, skill gaps, and progress over time.', icon: <BarChart3 className="w-5 h-5" />, accent: 'pink' },
  { id: 'assistant', label: 'Learner Support', description: 'Ask questions about competencies, courses, or the platform.', icon: <BookOpen className="w-5 h-5" />, accent: 'orange' },
];

const ACCENT_CLASSES: Record<string, string> = {
  pink: 'text-pink-500 border-pink-500/30 group-hover:border-pink-500 shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]',
  orange: 'text-orange-500 border-orange-500/30 group-hover:border-orange-500 shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]',
  cyan: 'text-cyan-400 border-cyan-500/30 group-hover:border-cyan-500 shadow-[0_0_12px_-2px_rgba(34,211,238,0.3)]',
};

export default function Home({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const { activeLearner, gaps } = useLearner();
  const openGaps = gaps.filter((g) => g.gap > 0);
  const competenciesAssessed = gaps.length;
  const bestScore = gaps.length ? Math.max(...gaps.map((g) => g.actual)) : 0;

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-8">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">
          {activeLearner ? `Welcome, ${activeLearner.name}` : 'Welcome'}
        </h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">
          Skill Intelligence & Learning Platform for India's Official Statistical System — pick up where you left off, or start something new.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Competencies Assessed', value: competenciesAssessed, icon: <ClipboardList className="w-4 h-4" />, accent: 'cyan' },
          { label: 'Open Skill Gaps', value: openGaps.length, icon: <Target className="w-4 h-4" />, accent: 'pink' },
          { label: 'Best Competency Score', value: bestScore, icon: <Award className="w-4 h-4" />, accent: 'orange' },
          { label: 'Role', value: activeLearner?.role === 'administrator' ? 'Admin' : 'Employee', icon: <UserCircle2 className="w-4 h-4" />, accent: 'cyan' },
        ].map((tile) => (
          <div key={tile.label} className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-25px_rgba(0,0,0,0.9)]">
            <div className={`absolute top-0 left-0 right-0 h-px panel-accent-${tile.accent === 'pink' ? 'pink' : 'orange'}`} />
            <div className={`w-8 h-8 flex items-center justify-center border mb-3 ${ACCENT_CLASSES[tile.accent]}`}>{tile.icon}</div>
            <p className="text-3xl font-['Bebas_Neue'] tracking-wider text-zinc-100">{tile.value}</p>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Module quick-launch cards */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-pink-500" />
          <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Jump Back In</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => onNavigate(mod.id)}
              className="group text-left relative bg-zinc-950/80 border border-zinc-800/80 p-4 hover:bg-zinc-900/60 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-25px_rgba(0,0,0,0.9)]"
            >
              <div className={`w-9 h-9 flex items-center justify-center border mb-3 transition-colors ${ACCENT_CLASSES[mod.accent]}`}>{mod.icon}</div>
              <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-1 flex items-center justify-between">
                {mod.label}
                <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{mod.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Top open gaps */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-pink-500" />
          <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Top Skill Gaps</span>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-900 divide-y divide-zinc-900">
          {openGaps.length ? (
            openGaps.slice(0, 5).map((g) => (
              <div key={g.competencyId} className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300">{g.name}</span>
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest ml-2">{g.domain}</span>
                </div>
                <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 uppercase tracking-widest">Gap {g.gap}</span>
              </div>
            ))
          ) : (
            <p className="p-4 text-[10px] text-zinc-700 uppercase tracking-widest font-bold text-center">Run a competency assessment to see your gaps here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
