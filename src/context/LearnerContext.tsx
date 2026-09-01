import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { LearnerProfile, CompetencyScore, CompetencyGap } from '../../server/competency/types';

// Same pattern as AccessibilityContext.tsx: a localStorage-backed active selection,
// fetched from the server on mount. This stands in for a real login/session — see
// server/competency/store.ts and SECURITY.md for the prototype-scope caveat.
const STORAGE_KEY = 'vidya-active-learner';

interface LearnerContextValue {
  learners: LearnerProfile[];
  activeLearner: LearnerProfile | null;
  scores: Record<string, CompetencyScore>;
  gaps: CompetencyGap[];
  loading: boolean;
  switchLearner: (id: string) => void;
  createLearner: (input: Omit<LearnerProfile, 'id' | 'createdAt'>) => Promise<LearnerProfile>;
  setLearnerLanguage: (language: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learners, setLearners] = useState<LearnerProfile[]>([]);
  const [activeLearnerId, setActiveLearnerId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [activeLearner, setActiveLearner] = useState<LearnerProfile | null>(null);
  const [scores, setScores] = useState<Record<string, CompetencyScore>>({});
  const [gaps, setGaps] = useState<CompetencyGap[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActiveLearnerData = useCallback(async (id: string) => {
    try {
      const [learnerRes, scoresRes, gapsRes] = await Promise.all([
        fetch(`/api/learners/${id}`),
        fetch(`/api/competency/scores/${id}`),
        fetch(`/api/competency/gaps/${id}`),
      ]);
      const learnerData = await learnerRes.json();
      const scoresData = await scoresRes.json();
      const gapsData = await gapsRes.json();
      setActiveLearner(learnerData.learner || null);
      setScores(scoresData.scores || {});
      setGaps(gapsData.gaps || []);
    } catch (err) {
      console.error('Failed to load active learner data:', err);
      setActiveLearner(null);
      setScores({});
      setGaps([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learners');
      const data = await res.json();
      const list: LearnerProfile[] = data.learners || [];
      setLearners(list);

      let idToLoad = activeLearnerId;
      if (idToLoad && !list.some((l) => l.id === idToLoad)) idToLoad = null;
      if (!idToLoad && list.length > 0) idToLoad = list[0].id;

      if (idToLoad) {
        setActiveLearnerId(idToLoad);
        try {
          localStorage.setItem(STORAGE_KEY, idToLoad);
        } catch {
          // Private browsing etc. — active learner just won't persist across reloads.
        }
        await loadActiveLearnerData(idToLoad);
      } else {
        setActiveLearner(null);
        setScores({});
        setGaps([]);
      }
    } catch (err) {
      console.error('Failed to load learners:', err);
    } finally {
      setLoading(false);
    }
    // activeLearnerId MUST be a dependency here — without it this closure goes
    // stale after switchLearner() and silently reverts the active learner back
    // to whatever was active when refresh() was first created (e.g. calling
    // refresh() after completing an assessment for a newly-switched-to learner
    // would bounce the UI back to the previous one). Found via manual multi-
    // profile testing, not by inspection.
  }, [loadActiveLearnerData, activeLearnerId]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchLearner = (id: string) => {
    setActiveLearnerId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
    setLoading(true);
    loadActiveLearnerData(id).finally(() => setLoading(false));
  };

  const createLearner = async (input: Omit<LearnerProfile, 'id' | 'createdAt'>): Promise<LearnerProfile> => {
    const res = await fetch('/api/learners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create learner');
    const learner: LearnerProfile = data.learner;
    setLearners((prev) => [...prev, learner]);
    switchLearner(learner.id);
    return learner;
  };

  // Optimistic local update (assessments read activeLearner.language immediately
  // after a click, no round-trip wait) + persisted to the profile so it survives
  // a switch-away-and-back or a reload.
  const setLearnerLanguage = async (language: string): Promise<void> => {
    if (!activeLearnerId) return;
    setActiveLearner((prev) => (prev ? { ...prev, language } : prev));
    try {
      await fetch(`/api/learners/${activeLearnerId}/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
    } catch (err) {
      console.error('Failed to persist language change:', err);
    }
  };

  return (
    <LearnerContext.Provider value={{ learners, activeLearner, scores, gaps, loading, switchLearner, createLearner, setLearnerLanguage, refresh }}>
      {children}
    </LearnerContext.Provider>
  );
}

export function useLearner(): LearnerContextValue {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error('useLearner must be used within a LearnerProvider');
  return ctx;
}
