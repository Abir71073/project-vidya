import { useEffect, useState } from 'react';
import { Flame, X, CheckCircle, XCircle } from 'lucide-react';

interface Nudge {
  concept: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

/** Surfaces a resurfaced practice question for a concept the student has recurringly
 *  struggled with (see server/mistakes/store.ts). Lives on the Home dashboard. */
export default function PracticeNudgeCard({ variant = 'full', onLoaded }: { variant?: 'full' | 'compact'; onLoaded?: (hasNudge: boolean) => void }) {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/practice-nudge')
      .then((res) => res.json())
      .then((data) => {
        setNudge(data.nudge);
        onLoaded?.(Boolean(data.nudge));
      })
      .catch(() => {
        setNudge(null);
        onLoaded?.(false);
      });
    // onLoaded is a callback ref from the parent, not reactive state — including
    // it would refetch on every parent re-render instead of once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!nudge || dismissed) return null;

  const padding = variant === 'compact' ? 'p-3' : 'p-4';

  return (
    <div className={`relative border border-orange-500/40 bg-orange-500/5 ${padding}`}>
      <div className="absolute top-0 left-0 right-0 h-px panel-accent-orange" />
      <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-zinc-600 hover:text-white">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-1.5 mb-2">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">You've struggled with {nudge.concept}</span>
      </div>
      <p className="text-xs text-zinc-200 leading-relaxed mb-3 pr-4">{nudge.question}</p>
      <div className="space-y-1.5">
        {nudge.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === nudge.correctAnswer;
          let cls = 'w-full text-left px-2.5 py-2 border text-[11px] transition-colors ';
          if (selected === null) {
            cls += 'border-zinc-800 bg-black hover:border-orange-500 text-zinc-300';
          } else if (isCorrect) {
            cls += 'border-green-500 bg-green-500/10 text-green-400';
          } else if (isSelected) {
            cls += 'border-red-500 bg-red-500/10 text-red-400';
          } else {
            cls += 'border-zinc-900 bg-black text-zinc-600';
          }
          return (
            <button key={i} onClick={() => selected === null && setSelected(i)} className={cls} disabled={selected !== null}>
              <span className="flex items-center justify-between">
                {opt}
                {selected !== null && isCorrect && <CheckCircle className="w-3 h-3 shrink-0 ml-1" />}
                {selected !== null && isSelected && !isCorrect && <XCircle className="w-3 h-3 shrink-0 ml-1" />}
              </span>
            </button>
          );
        })}
      </div>
      {selected !== null && nudge.explanation && (
        <p className="mt-3 text-[10px] text-zinc-500 leading-relaxed">{nudge.explanation}</p>
      )}
    </div>
  );
}
