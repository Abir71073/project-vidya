import { useEffect, useState } from 'react';
import { Eye, Brain, Calculator, MessageSquareText, Check } from 'lucide-react';

const STAGES = [
  { label: 'Understanding', icon: Eye },
  { label: 'Reasoning', icon: Brain },
  { label: 'Solving', icon: Calculator },
  { label: 'Explaining', icon: MessageSquareText },
];

// The backend call is a single opaque request with no incremental status —
// this animates through the stages on a timer to show real progress *feel*
// while the actual solve happens, rather than a static spinner. Purely
// cosmetic pacing, not a report of literal backend state.
const STAGE_MS = 2200;

export default function ProcessingPipeline() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    const interval = setInterval(() => {
      setActiveIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-2 sm:gap-4 mb-8">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={stage.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-11 h-11 flex items-center justify-center border transition-all duration-500 ${
                    isDone
                      ? 'border-green-500 text-green-400 bg-green-500/10'
                      : isActive
                      ? 'border-pink-500 text-pink-400 bg-pink-500/10 shadow-[0_0_16px_-2px_rgba(236,72,153,0.6)] scale-110'
                      : 'border-zinc-800 text-zinc-700'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-pink-400' : isDone ? 'text-green-500' : 'text-zinc-700'}`}>
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`w-6 sm:w-10 h-px mx-1 mb-5 transition-colors duration-500 ${i < activeIndex ? 'bg-green-500/60' : 'bg-zinc-800'}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest max-w-[240px] leading-relaxed">
        This can take a few moments for messy handwriting or multi-step problems.
      </p>
    </div>
  );
}
