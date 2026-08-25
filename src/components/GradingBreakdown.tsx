import { CheckCircle, XCircle, ClipboardList, MessageSquareQuote } from 'lucide-react';
import { GradingResult } from '../types';

export default function GradingBreakdown({ result }: { result: GradingResult }) {
  const pct = result.totalMarksAvailable > 0
    ? Math.round((result.totalMarksAwarded / result.totalMarksAvailable) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div className="relative bg-black border border-zinc-800 p-5 flex items-center justify-between gap-4 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Examiner Score</p>
          <p className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100">
            {result.totalMarksAwarded} <span className="text-zinc-600 text-2xl">/ {result.totalMarksAvailable} marks</span>
          </p>
        </div>
        <div className="w-20 h-20 shrink-0 relative flex items-center justify-center border border-zinc-800 bg-zinc-950">
          <span className="text-xl font-['Bebas_Neue'] tracking-wider text-orange-400">{pct}%</span>
        </div>
      </div>

      {result.questionSummary && (
        <div className="text-sm text-zinc-300 leading-relaxed">
          <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest block mb-1">Question</span>
          {result.questionSummary}
        </div>
      )}

      {result.studentTranscription && (
        <div className="bg-zinc-950/60 border border-zinc-900 p-4 flex gap-2.5">
          <MessageSquareQuote className="w-4 h-4 shrink-0 mt-0.5 text-zinc-600" />
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">What we read from your photo</span>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{result.studentTranscription}</p>
          </div>
        </div>
      )}

      {/* Per-step breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Step-by-Step Marking</span>
        </div>
        <div className="space-y-2.5">
          {result.steps.map((step) => (
            <div
              key={step.stepNumber}
              className={`bg-black border p-4 ${step.shown ? 'border-zinc-800' : 'border-red-900/60'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  {step.shown ? (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Step {step.stepNumber}</span>
                    <p className="text-sm text-zinc-200 leading-snug">{step.description}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2 py-1 border tracking-wider ${
                    step.marksAwarded === step.marksAvailable
                      ? 'bg-green-500/10 border-green-500/40 text-green-400'
                      : step.marksAwarded > 0
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                      : 'bg-red-500/10 border-red-500/40 text-red-400'
                  }`}
                >
                  {step.marksAwarded} / {step.marksAvailable}
                </span>
              </div>
              {step.note && (
                <p className="text-xs text-zinc-500 leading-relaxed pl-[26px]">{step.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overall feedback */}
      {result.overallFeedback && (
        <div className="bg-orange-500/10 border border-orange-500/30 p-4">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-1.5">Where Marks Were Lost</span>
          <p className="text-sm text-zinc-200 leading-relaxed">{result.overallFeedback}</p>
        </div>
      )}
    </div>
  );
}
