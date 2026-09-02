import { useState, useEffect, useMemo, useRef } from 'react';
import { ClipboardList, Loader2, Zap, CheckSquare, Square, TrendingDown, UploadCloud, FileCheck2, X } from 'lucide-react';
import QuizView, { QuizAnswerRecord } from './QuizView';
import { Quiz } from '../types';
import { useLearner } from '../context/LearnerContext';
import type { CompetencyDefinition, CompetencyDomain } from '../../server/competency/types';

const DOMAINS: CompetencyDomain[] = ['Statistical', 'Technical', 'Digital Governance', 'Behavioural/Managerial'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

interface CompetencyResult {
  competencyId: string;
  name: string;
  correct: number;
  total: number;
  scorePct: number;
}

export default function CompetencyAssessment() {
  const { activeLearner, refresh } = useLearner();
  const [taxonomy, setTaxonomy] = useState<CompetencyDefinition[]>([]);
  const [domain, setDomain] = useState<CompetencyDomain>('Statistical');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompetencyResult[] | null>(null);
  const [materialText, setMaterialText] = useState<string | null>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/competency/extract-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, fileName: file.name, fileType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract text from this file.');
      setMaterialText(data.text);
      setMaterialFileName(file.name);
    } catch (err: any) {
      setError(err.message || 'Failed to process uploaded material.');
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetch('/api/competency/taxonomy')
      .then((res) => res.json())
      .then((data) => setTaxonomy(data.competencies || []))
      .catch(() => setTaxonomy([]));
  }, []);

  const domainCompetencies = useMemo(() => taxonomy.filter((c) => c.domain === domain), [taxonomy, domain]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generateAssessment = async () => {
    if (selected.size === 0 || !activeLearner) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/competency/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competencyIds: [...selected],
          language: activeLearner.language || 'English',
          difficulty,
          ...(materialText ? { materialText } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate assessment');
      setQuiz(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate assessment.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (result: { score: number; total: number; answers: QuizAnswerRecord[] }) => {
    if (!activeLearner) return;

    const byCompetency = new Map<string, { correct: number; total: number }>();
    for (const a of result.answers) {
      const id = a.question.competencyId;
      if (!id) continue;
      const entry = byCompetency.get(id) || { correct: 0, total: 0 };
      entry.total += 1;
      if (a.correct) entry.correct += 1;
      byCompetency.set(id, entry);
    }

    const computed: CompetencyResult[] = [];
    for (const [competencyId, { correct, total }] of byCompetency) {
      const def = taxonomy.find((c) => c.id === competencyId);
      const scorePct = Math.round((correct / total) * 100);
      computed.push({ competencyId, name: def?.name || competencyId, correct, total, scorePct });
      await fetch('/api/competency/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: activeLearner.id, competencyId, score: scorePct, source: materialText ? 'material-quiz' : 'assessment' }),
      }).catch((err) => console.error('Failed to record competency score:', err));
    }

    setResults(computed);
    refresh();
  };

  if (!activeLearner) {
    return (
      <div className="h-full flex items-center justify-center text-center text-zinc-600">
        <p className="text-xs uppercase tracking-widest font-bold">Create or select a learner profile first.</p>
      </div>
    );
  }

  if (quiz && !results) {
    return <QuizView quiz={quiz} onBack={() => setQuiz(null)} onComplete={handleComplete} />;
  }

  if (results) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
          <h2 className="text-2xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase mb-1">Assessment Complete</h2>
          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-6">Per-competency scores recorded to your profile.</p>

          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.competencyId} className="p-3 border border-zinc-800 bg-black flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-200">{r.name}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{r.correct} / {r.total} correct</p>
                </div>
                <span className={`text-lg font-['Bebas_Neue'] tracking-wider ${r.scorePct >= 70 ? 'text-green-400' : r.scorePct >= 40 ? 'text-orange-400' : 'text-red-400'}`}>{r.scorePct}%</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setQuiz(null); setResults(null); setSelected(new Set()); setMaterialText(null); setMaterialFileName(null); }}
            className="mt-6 w-full bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold tracking-widest uppercase py-3 rounded-none text-xs transition-all drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]"
          >
            Run Another Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="relative w-full max-w-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 p-6 sm:p-8 flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)]">
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-zinc-900">
          <div className="w-12 h-12 bg-zinc-900 text-pink-500 rounded-none flex items-center justify-center border border-zinc-800 shadow-[0_0_14px_-2px_rgba(236,72,153,0.35)]">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Competency Assessment</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pick competencies and a difficulty — at least 10 questions per assessment.</p>
          </div>
        </div>

        <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Domain</label>
        <div className="flex flex-wrap bg-black border border-zinc-900 p-1 mb-5 gap-1">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={`flex-1 min-w-[120px] py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${domain === d ? 'bg-zinc-900 text-orange-500 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {d}
            </button>
          ))}
        </div>

        <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Difficulty</label>
        <div className="flex bg-black border border-zinc-900 p-1 mb-5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${difficulty === d ? 'bg-zinc-900 text-orange-500 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {d}
            </button>
          ))}
        </div>

        <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Competencies ({selected.size} selected)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto pr-1">
          {domainCompetencies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-2 p-2.5 border text-left text-xs transition-colors ${selected.has(c.id) ? 'border-pink-500 bg-pink-500/10 text-pink-300' : 'border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700'}`}
            >
              {selected.has(c.id) ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
              {c.name}
            </button>
          ))}
        </div>

        <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Upload Material (Optional — PDF, DOCX, or PPTX)</label>
        <p className="text-[10px] text-zinc-600 mb-2 leading-relaxed">If provided, questions are generated from this material's actual content instead of general knowledge — the result still updates the competencies selected above.</p>
        {materialText ? (
          <div className="flex items-center justify-between p-3 mb-6 border border-green-500/40 bg-green-500/10">
            <div className="flex items-center gap-2 text-green-400 text-xs min-w-0">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{materialFileName} ({materialText.length.toLocaleString()} chars extracted)</span>
            </div>
            <button onClick={() => { setMaterialText(null); setMaterialFileName(null); }} className="text-zinc-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="w-full mb-6 bg-zinc-900 border border-zinc-800 hover:border-orange-500 hover:text-orange-500 text-zinc-400 font-bold uppercase tracking-wider py-2.5 text-[10px] transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {extracting ? 'Extracting text...' : 'Upload Training Material'}
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleMaterialUpload} accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="hidden" />

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 text-red-400 text-xs border border-red-900/50 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={generateAssessment}
          disabled={loading || selected.size === 0}
          className="w-full bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold tracking-widest uppercase py-4 rounded-none text-[12px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating assessment...</> : <><Zap className="w-5 h-5" /> Start Assessment</>}
        </button>
      </div>
    </div>
  );
}
