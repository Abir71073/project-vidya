import { useEffect, useState } from 'react';
import { Flame, Target, Layers, TrendingUp, HelpCircle, FileText, BrainCircuit, BookOpen, Library, ArrowRight, Activity, Sparkles } from 'lucide-react';
import { Section, DashboardStats } from '../types';
import PracticeNudgeCard from './PracticeNudgeCard';

const MODULES: { id: Section; label: string; description: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'doubt', label: 'Doubt Solver', description: 'Explain, get guided hints, or grade a worked attempt.', icon: <HelpCircle className="w-5 h-5" />, accent: 'pink' },
  { id: 'notes', label: 'Notes Vault', description: 'Turn raw notes or a PDF into structured study material.', icon: <FileText className="w-5 h-5" />, accent: 'orange' },
  { id: 'quiz', label: 'Quiz Generator', description: 'Generate a targeted practice quiz on any topic.', icon: <BrainCircuit className="w-5 h-5" />, accent: 'cyan' },
  { id: 'assistant', label: 'Subject Assistant', description: 'Ask follow-up questions and go deeper on a concept.', icon: <BookOpen className="w-5 h-5" />, accent: 'pink' },
  { id: 'research', label: 'Research Portal', description: 'Search real academic papers on a topic.', icon: <Library className="w-5 h-5" />, accent: 'orange' },
];

const ACCENT_CLASSES: Record<string, string> = {
  pink: 'text-pink-500 border-pink-500/30 group-hover:border-pink-500 shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]',
  orange: 'text-orange-500 border-orange-500/30 group-hover:border-orange-500 shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]',
  cyan: 'text-cyan-400 border-cyan-500/30 group-hover:border-cyan-500 shadow-[0_0_12px_-2px_rgba(34,211,238,0.3)]',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hasNudge, setHasNudge] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-8">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Welcome Back</h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">Your learning workspace — pick up where you left off, or start something new.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Day Streak', value: stats?.streakDays ?? 0, icon: <Flame className="w-4 h-4" />, accent: 'orange' },
          { label: 'Questions Solved', value: stats?.totalAttempts ?? 0, icon: <Activity className="w-4 h-4" />, accent: 'cyan' },
          { label: 'Concepts Practiced', value: stats?.distinctConcepts ?? 0, icon: <Layers className="w-4 h-4" />, accent: 'cyan' },
          { label: 'Topics to Review', value: stats?.weakTopics.length ?? 0, icon: <Target className="w-4 h-4" />, accent: 'pink' },
        ].map((tile) => (
          <div key={tile.label} className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-25px_rgba(0,0,0,0.9)]">
            <div className={`absolute top-0 left-0 right-0 h-px panel-accent-${tile.accent === 'pink' ? 'pink' : 'orange'}`} />
            <div className={`w-8 h-8 flex items-center justify-center border mb-3 ${ACCENT_CLASSES[tile.accent]}`}>{tile.icon}</div>
            <p className="text-3xl font-['Bebas_Neue'] tracking-wider text-zinc-100">{tile.value}</p>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Module quick-launch cards */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-pink-500" />
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Jump Back In</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
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

        {/* Practice nudge (see PracticeNudgeCard.tsx — this is its intended home) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Recommended Practice</span>
          </div>
          <PracticeNudgeCard variant="full" onLoaded={setHasNudge} />
          {hasNudge === false && (
            <div className="border border-zinc-800 bg-zinc-950/60 p-4 text-center">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold leading-relaxed">Solve a few doubts or grade an attempt — recurring struggle topics will surface here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Weak topics + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-pink-500" />
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Topics to Review</span>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-900 divide-y divide-zinc-900">
            {stats?.weakTopics.length ? (
              stats.weakTopics.map((t) => (
                <div key={t.concept} className="p-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">{t.concept}</span>
                  <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 uppercase tracking-widest">{t.count}x</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-[10px] text-zinc-700 uppercase tracking-widest font-bold text-center">Nothing here yet.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Recent Activity</span>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-900 divide-y divide-zinc-900">
            {stats?.recentActivity.length ? (
              stats.recentActivity.map((a, i) => (
                <div key={i} className="p-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-300 truncate">{a.concept}</span>
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest shrink-0">{timeAgo(a.timestamp)}</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-[10px] text-zinc-700 uppercase tracking-widest font-bold text-center">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
