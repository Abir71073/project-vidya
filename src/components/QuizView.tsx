import { useState, useRef } from 'react';
import { Quiz, QuizQuestion } from '../types';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

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
}

export default function QuizView({ quiz, onBack, onComplete }: QuizViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const answersRef = useRef<QuizAnswerRecord[]>([]);

  const question = quiz.questions[currentQuestion];

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
