import { useState, useRef, useEffect } from 'react';
import { Quiz, QuizQuestion } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Video, Loader2, AlertTriangle } from 'lucide-react';

export interface QuizAnswerRecord {
  question: QuizQuestion;
  selectedIndex: number;
  correct: boolean;
}

interface QuizViewProps {
  quiz: Quiz;
  onBack: () => void;
  /** Additive: reports the full per-question breakdown when the quiz finishes, so a
   *  caller (e.g. CompetencyAssessment.tsx) can tally results per competencyId without
   *  QuizView itself needing to know anything about competencies. */
  onComplete?: (result: { score: number; total: number; answers: QuizAnswerRecord[] }) => void;
  /** Language for the on-demand video explanation (Section 5). Defaults to English for
   *  older call sites (e.g. the legacy QuizGenerator.tsx) that don't pass one. */
  language?: string;
}

type VideoState = 'idle' | 'loading' | 'ready' | 'error';

export default function QuizView({ quiz, onBack, onComplete, language = 'English' }: QuizViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const answersRef = useRef<QuizAnswerRecord[]>([]);

  const [videoState, setVideoState] = useState<VideoState>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const question = quiz.questions[currentQuestion];

  // Video explanation is per-question and on-demand — never carry state from
  // one question into the next.
  useEffect(() => {
    setVideoState('idle');
    setVideoUrl(null);
    setVideoError(null);
  }, [currentQuestion]);

  const handleSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    const correct = index === question.correctAnswer;
    answersRef.current.push({ question, selectedIndex: index, correct });
    if (correct) {
      setScore(s => s + 1);
    }
  };

  const watchExplanation = async () => {
    setVideoState('loading');
    setVideoError(null);
    try {
      const res = await fetch('/api/competency/question-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.videoPath) throw new Error(data.error || 'Video generation failed.');
      setVideoUrl(data.videoPath);
      setVideoState('ready');
    } catch (err: any) {
      console.error('Video explanation failed, falling back to text:', err);
      // Crash-proofing (Section 5): never leave the learner on a broken/spinning
      // player. The text explanation above is already visible regardless of
      // this state, so "falling back" here just means: stop trying, say why,
      // and leave the rest of the result screen exactly as usable as before.
      setVideoError(err.message || "Couldn't generate a video explanation right now — see the text explanation above.");
      setVideoState('error');
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
      onComplete?.({ score, total: quiz.questions.length, answers: answersRef.current });
    }
  };

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="relative bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 p-8 text-center max-w-md mx-auto mt-12 flex flex-col items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)]">
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase mb-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Quiz Complete!</h2>
        <p className="text-sm font-bold text-pink-500 mb-4 uppercase tracking-widest">You scored {score} out of {quiz.questions.length}</p>
        <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800 mb-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pink-500 to-orange-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]" style={{ width: `${pct}%` }} />
        </div>

        <button
          onClick={onBack}
          className="w-full px-4 py-4 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white rounded-none text-xs font-bold uppercase tracking-widest transition-all drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]"
        >
          Exit Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 overflow-hidden flex flex-col h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)]">
      <div className="p-3 sm:p-4 border-b border-zinc-900 flex items-center justify-between bg-black shrink-0 relative">
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
        <button
          onClick={onBack}
          className="flex items-center text-zinc-500 hover:text-pink-500 transition-colors text-[10px] uppercase font-bold tracking-widest"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Abort
        </button>
        <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/50 px-2 py-0.5 rounded-none uppercase tracking-widest drop-shadow-[0_0_5px_rgba(249,115,22,0.3)]">
          Objective {currentQuestion + 1} of {quiz.questions.length}
        </span>
      </div>

      <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blend-overlay bg-black/40">
        <h3 className="text-xl font-['Bebas_Neue'] tracking-wide text-zinc-100 mb-8 leading-tight drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{question.question}</h3>

        <div className="space-y-4">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === question.correctAnswer;
            let btnClass = "w-full text-left p-4 rounded-none border transition-all flex items-center justify-between text-sm ";

            if (!showExplanation) {
              btnClass += "border-zinc-800 bg-black hover:border-pink-500 hover:text-pink-400 text-zinc-300";
            } else if (isCorrect) {
              btnClass += "border-green-500 bg-green-500/10 text-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]";
            } else if (isSelected && !isCorrect) {
              btnClass += "border-red-500 bg-red-500/10 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]";
            } else {
              btnClass += "border-zinc-900 bg-black text-zinc-600 opacity-50";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={showExplanation}
                className={btnClass}
              >
                <span>{option}</span>
                {showExplanation && isCorrect && <CheckCircle className="w-5 h-5 text-green-500 shrink-0 ml-2" />}
                {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="mt-8 p-5 bg-zinc-900/80 border border-zinc-800 rounded-none relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
            <h4 className="text-[10px] font-bold text-pink-500 mb-2 uppercase tracking-widest ml-2">Intel / Explanation</h4>
            <p className="text-zinc-300 text-sm leading-relaxed ml-2">{question.explanation}</p>

            <div className="mt-4 ml-2">
              {videoState === 'idle' && (
                <button
                  type="button"
                  onClick={watchExplanation}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 hover:bg-cyan-500/20 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" /> Watch Video Explanation
                </button>
              )}
              {videoState === 'loading' && (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating video explanation — this can take up to a minute...
                </div>
              )}
              {videoState === 'error' && (
                <div className="flex items-start gap-2 text-[10px] text-zinc-500 bg-zinc-950 border border-zinc-800 px-3 py-2 max-w-md">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-500" />
                  <span>{videoError}</span>
                </div>
              )}
              {videoState === 'ready' && videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full max-w-md border border-zinc-800 mt-1"
                  onError={() => {
                    // The generated file itself failed to play back (e.g. a
                    // corrupt/partial encode) — same graceful fallback as a
                    // failed generation request, not a broken player left on screen.
                    setVideoState('error');
                    setVideoError("The generated video couldn't be played — see the text explanation above.");
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-zinc-900 shrink-0 flex justify-end bg-black">
        <button
          onClick={nextQuestion}
          disabled={!showExplanation}
          className="px-6 py-3 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white rounded-none text-[10px] uppercase font-bold tracking-widest transition-colors disabled:opacity-30 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]"
        >
          {currentQuestion < quiz.questions.length - 1 ? 'Proceed' : 'Conclude'}
        </button>
      </div>
    </div>
  );
}
