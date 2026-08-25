import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { SYLLABUS_SOURCES } from './sources';
import { SyllabusChunk, GroundingMatch } from './types';

const require = createRequire(import.meta.url);

const SOURCES_DIR = path.join(process.cwd(), 'server', 'syllabus', 'sources');
const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 100;
// Below this score, a "match" is more likely coincidental keyword overlap than a
// genuinely relevant chapter — better to solve ungrounded than cite the wrong source.
const MIN_RELEVANCE_SCORE = 0.15;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);
}

function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

interface Index {
  chunks: SyllabusChunk[];
  chunkTokens: string[][];
  idf: Map<string, number>;
}

let indexPromise: Promise<Index> | null = null;

async function buildIndex(): Promise<Index> {
  const pdf = await import('pdf-parse/lib/pdf-parse.js').then((m: any) => m.default || m);

  const chunks: SyllabusChunk[] = [];
  for (const source of SYLLABUS_SOURCES) {
    const filePath = path.join(SOURCES_DIR, source.file);
    const buffer = await fs.readFile(filePath);
    const data = await pdf(buffer);
    for (const text of chunkText(data.text)) {
      if (text.length < 100) continue; // skip trailing scraps
      chunks.push({ sourceId: source.id, citation: source.citation, text });
    }
  }

  const chunkTokens = chunks.map((c) => tokenize(c.text));

  const df = new Map<string, number>();
  for (const tokens of chunkTokens) {
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((chunks.length + 1) / (count + 1)) + 1);
  }

  return { chunks, chunkTokens, idf };
}

function getIndex(): Promise<Index> {
  if (!indexPromise) {
    indexPromise = buildIndex();
  }
  return indexPromise;
}

/**
 * Simple local TF-IDF keyword search over the indexed NCERT chapters (see
 * server/syllabus/sources.ts for exactly what's loaded). Returns the single
 * best-matching short excerpt plus its citation, or null if nothing indexed is
 * relevant enough — callers should treat null as "solve ungrounded", not an error.
 */
export async function findGroundingContext(query: string): Promise<GroundingMatch | null> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  const { chunks, chunkTokens, idf } = await getIndex();
  if (chunks.length === 0) return null;

  const queryTermSet = new Set(queryTokens);

  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < chunks.length; i++) {
    const tokens = chunkTokens[i];
    if (tokens.length === 0) continue;

    const termFreq = new Map<string, number>();
    for (const term of tokens) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }

    let score = 0;
    for (const term of queryTermSet) {
      const tf = (termFreq.get(term) || 0) / tokens.length;
      if (tf === 0) continue;
      score += tf * (idf.get(term) || 0);
    }
    // Mild length normalization so this behaves like a bounded relevance score
    // rather than growing unbounded with the number of matching query terms.
    score = score / Math.sqrt(queryTermSet.size);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex === -1 || bestScore < MIN_RELEVANCE_SCORE) {
    return null;
  }

  const best = chunks[bestIndex];
  return { excerpt: best.text, citation: best.citation, score: bestScore };
}
