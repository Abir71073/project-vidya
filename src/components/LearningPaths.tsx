import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, AlertTriangle, Clock, CheckCircle2, Loader2, BookmarkPlus, Compass, XCircle } from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import type { Course, Enrolment, RecommendationFactor } from '../../server/competency/types';
import { consumePendingCourseScroll } from '../utils/courseNavigation';

interface Recommendation {
  competencyId: string;
  gap: number;
  course: Course;
  score: number;
  factors: RecommendationFactor[];
}

const FACTOR_LABELS: Record<RecommendationFactor, string> = {
  gap: 'skill gap',
  'department-priority': 'department priority',
  'career-path': 'career path',
  'emerging-tech': 'emerging tech',
  variety: 'variety',
};

export default function LearningPaths() {
  const { activeLearner } = useLearner();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [careerPathRecommendations, setCareerPathRecommendations] = useState<Recommendation[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(null);
  const [unavailableNotice, setUnavailableNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeLearner) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [recRes, enrRes] = await Promise.all([
        fetch(`/api/recommendations/${activeLearner.id}`),
        fetch(`/api/enrolments/${activeLearner.id}`),
      ]);
      if (!recRes.ok || !enrRes.ok) throw new Error('The server had trouble loading your learning paths.');
      const recData = await recRes.json();
      const enrData = await enrRes.json();
      setRecommendations(recData.recommendations || []);
      setCareerPathRecommendations(recData.careerPathRecommendations || []);
      setEnrolments(enrData.enrolments || []);
    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setLoadError(err.message || 'Could not load learning paths right now. Please try again.');
      setRecommendations([]);
      setCareerPathRecommendations([]);
      setEnrolments([]);
    } finally {
      setLoading(false);
    }
  }, [activeLearner]);

  useEffect(() => {
    load();
  }, [load]);

  // Section 3: a course card clicked on the Employee Dashboard leaves a pending
  // course id (see src/utils/courseNavigation.ts). Once this page's data has
  // loaded, resolve it: scroll+highlight if it's one of the currently-listed
  // recommendations, otherwise check the catalogue directly to tell "exists but
  // isn't currently recommended" apart from "removed/renamed from the
  // catalogue entirely" — the latter is the graceful "course unavailable" case.
  useEffect(() => {
    if (loading) return;
    const pendingId = consumePendingCourseScroll();
    if (!pendingId) return;

    const allCards = [...recommendations, ...careerPathRecommendations];
    const isListed = allCards.some((r) => r.course.id === pendingId);
    if (isListed) {
      setHighlightedCourseId(pendingId);
      requestAnimationFrame(() => {
        document.getElementById(`course-${pendingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      const timer = setTimeout(() => setHighlightedCourseId(null), 2500);
      return () => clearTimeout(timer);
    }

    fetch(`/api/courses/id/${pendingId}`)
      .then((res) => {
        if (res.status === 404) {
          setUnavailableNotice('That course is no longer available in the catalogue (it may have been removed or renamed).');
        } else if (res.ok) {
          setUnavailableNotice("That course exists but isn't currently among your recommendations.");
        } else {
          setUnavailableNotice("Couldn't check that course's availability right now.");
        }
      })
      .catch((err) => {
        console.error('Failed to verify course availability:', err);
        setUnavailableNotice("Couldn't check that course's availability right now.");
      });
    // recommendations/careerPathRecommendations intentionally excluded — this
    // should run once per page load (when loading flips false), not re-run
    // every time load() refreshes the lists after an enrol/complete click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const enrolmentFor = (courseId: string) => enrolments.find((e) => e.courseId === courseId);

  const enrol = async (courseId: string) => {
    if (!activeLearner) return;
    setBusyCourseId(courseId);
    try {
      const res = await fetch('/api/enrolments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: activeLearner.id, courseId }),
      });
      if (!res.ok) throw new Error('Enrolment failed');
      await load();
    } catch (err) {
      console.error('Failed to enrol:', err);
      setLoadError('Could not enrol in that course right now. Please try again.');
    } finally {
      setBusyCourseId(null);
    }
  };

  const complete = async (enrolmentId: string) => {
    setBusyCourseId(enrolmentId);
    try {
      const res = await fetch(`/api/enrolments/${enrolmentId}/complete`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Completion failed');
      await load();
    } catch (err) {
      console.error('Failed to mark complete:', err);
      setLoadError('Could not mark that course complete right now. Please try again.');
    } finally {
      setBusyCourseId(null);
    }
  };

  if (!activeLearner) {
    return (
      <div className="h-full flex items-center justify-center text-center text-zinc-600">
        <p className="text-xs uppercase tracking-widest font-bold">Create or select a learner profile first.</p>
      </div>
    );
  }

  const renderCard = (rec: Recommendation) => {
    const enrolment = enrolmentFor(rec.course.id);
    const busy = busyCourseId === rec.course.id || busyCourseId === enrolment?.id;
    const isHighlighted = highlightedCourseId === rec.course.id;
    return (
      <div
        key={rec.course.id}
        id={`course-${rec.course.id}`}
        className={`relative bg-zinc-950/80 border p-4 flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-25px_rgba(0,0,0,0.9)] scroll-mt-4 transition-colors duration-500 ${isHighlighted ? 'border-pink-500 shadow-[0_0_0_1px_rgba(236,72,153,0.6),0_0_24px_-4px_rgba(236,72,153,0.5)]' : 'border-zinc-800/80'}`}
      >
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-orange" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 uppercase tracking-widest">Gap: {rec.gap}pts</span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{rec.course.provider}</span>
        </div>
        <h3 className="text-sm font-bold text-zinc-100 mb-1">{rec.course.title}</h3>
        <p className="text-xs text-zinc-500 mb-2 flex-1">{rec.course.description}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {rec.factors.map((f) => (
            <span key={f} className="text-[8px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 uppercase tracking-wider">{FACTOR_LABELS[f] || f}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[9px] text-zinc-600 uppercase tracking-widest mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rec.course.durationHours}h</span>
          <span>{rec.course.level}</span>
        </div>

        {!enrolment && (
          <button onClick={() => enrol(rec.course.id)} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold uppercase tracking-widest py-2.5 text-[10px] transition-all disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />} Enrol
          </button>
        )}
        {enrolment?.status === 'enrolled' && (
          <button onClick={() => complete(enrolment.id)} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-green-500 hover:text-green-400 text-zinc-300 font-bold uppercase tracking-widest py-2.5 text-[10px] transition-all disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Mark Complete
          </button>
        )}
        {enrolment?.status === 'completed' && (
          <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/40 text-green-400 font-bold uppercase tracking-widest py-2.5 text-[10px]">
            <GraduationCap className="w-3.5 h-3.5" /> Completed
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-4">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Learning Paths</h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">Recommended training, weighing your gaps, department priorities, career path, and more.</p>
      </div>

      <div className="flex items-start gap-2 p-3 mb-6 bg-orange-500/10 border border-orange-500/40 text-orange-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <span className="font-bold uppercase tracking-wider">Demo integration</span> — not connected to live iGOT Karmayogi / NSSTA APIs.
          Courses below are a small local sample catalogue (see server/competency/catalogue.ts). Enrolment and completion are tracked locally too.
        </p>
      </div>

      {loadError && (
        <div className="p-3 mb-6 bg-red-950/50 text-red-400 text-xs border border-red-900/50">{loadError}</div>
      )}

      {unavailableNotice && (
        <div className="flex items-start gap-2 p-3 mb-6 bg-zinc-900/60 border border-zinc-800 text-zinc-400">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
          <div className="flex-1">
            <p className="text-[11px] leading-relaxed">{unavailableNotice}</p>
          </div>
          <button onClick={() => setUnavailableNotice(null)} className="text-zinc-600 hover:text-zinc-300 text-[10px] uppercase font-bold tracking-widest shrink-0">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-600"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-pink-500" />
              <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">For Your Current Gaps</span>
            </div>
            {recommendations.length === 0 ? (
              <div className="border border-zinc-800 bg-zinc-950/60 p-6 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">No gaps identified yet — run a competency assessment first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{recommendations.map(renderCard)}</div>
            )}
          </div>

          {activeLearner.targetRole && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">For Your Career Path — {activeLearner.targetRole}</span>
              </div>
              {careerPathRecommendations.length === 0 ? (
                <div className="border border-zinc-800 bg-zinc-950/60 p-6 text-center">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">No additional gaps found for your target role right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{careerPathRecommendations.map(renderCard)}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
