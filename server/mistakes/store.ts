import fs from 'fs/promises';
import path from 'path';

/**
 * PROTOTYPE-SCOPE STORAGE.
 * This app has no user accounts/auth yet, so there is no way to scope a "session"
 * to a specific student — this is a single JSON file on local disk, shared by
 * every visitor to this server instance. It's good enough to demo the resurfacing
 * mechanism (log a struggle, come back later, see it resurface), but a production
 * version needs real per-user accounts and a per-user database table, not one
 * shared flat file that mixes every student's history together.
 */
const STORE_PATH = path.join(process.cwd(), 'generated', 'mistake-log.json');
const MAX_ENTRIES = 500;
// A concept needs to show up as a "struggle" at least this many times before it's
// eligible to resurface as a practice nudge — one miss isn't a pattern yet.
const RECURRENCE_THRESHOLD = 2;

export interface MistakeLogEntry {
  id: string;
  timestamp: string;
  concept: string;
  source: 'explain' | 'grade';
  struggled: boolean;
  errorNote?: string;
}

async function readStore(): Promise<MistakeLogEntry[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeStore(entries: MistakeLogEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function logAttempt(
  concept: string,
  source: 'explain' | 'grade',
  struggled: boolean,
  errorNote?: string
): Promise<void> {
  if (!concept.trim()) return;
  const entries = await readStore();
  entries.push({
    id: `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    concept: concept.trim(),
    source,
    struggled,
    errorNote,
  });
  await writeStore(entries.slice(-MAX_ENTRIES));
}

/** Returns the concept with the most struggle entries that meets the recurrence threshold, or null. */
export async function findRecurringStruggle(): Promise<{ concept: string; count: number } | null> {
  const entries = await readStore();

  const counts = new Map<string, { concept: string; count: number }>();
  for (const e of entries) {
    if (!e.struggled) continue;
    const key = e.concept.toLowerCase();
    const existing = counts.get(key);
    counts.set(key, { concept: e.concept, count: (existing?.count || 0) + 1 });
  }

  let best: { concept: string; count: number } | null = null;
  for (const entry of counts.values()) {
    if (entry.count >= RECURRENCE_THRESHOLD && (!best || entry.count > best.count)) {
      best = entry;
    }
  }
  return best;
}

function computeStreakDays(entries: MistakeLogEntry[]): number {
  const activeDays = new Set(entries.map((e) => e.timestamp.slice(0, 10)));
  const cursor = new Date();
  if (!activeDays.has(cursor.toISOString().slice(0, 10))) {
    // No activity yet today — the streak is still "alive" if yesterday had activity,
    // just not extended to today yet. Start counting from yesterday instead.
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export interface DashboardStats {
  totalAttempts: number;
  struggledAttempts: number;
  distinctConcepts: number;
  streakDays: number;
  weakTopics: { concept: string; count: number }[];
  recentActivity: { concept: string; source: 'explain' | 'grade'; struggled: boolean; timestamp: string }[];
}

/** Aggregates the local mistake log into dashboard-ready stats (see the prototype-scope note above). */
export async function getDashboardStats(): Promise<DashboardStats> {
  const entries = await readStore();

  const conceptCounts = new Map<string, { concept: string; count: number }>();
  for (const e of entries) {
    if (!e.struggled) continue;
    const key = e.concept.toLowerCase();
    const existing = conceptCounts.get(key);
    conceptCounts.set(key, { concept: e.concept, count: (existing?.count || 0) + 1 });
  }
  const weakTopics = [...conceptCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    totalAttempts: entries.length,
    struggledAttempts: entries.filter((e) => e.struggled).length,
    distinctConcepts: new Set(entries.map((e) => e.concept.toLowerCase())).size,
    streakDays: computeStreakDays(entries),
    weakTopics,
    recentActivity: entries
      .slice(-10)
      .reverse()
      .map((e) => ({ concept: e.concept, source: e.source, struggled: e.struggled, timestamp: e.timestamp })),
  };
}
