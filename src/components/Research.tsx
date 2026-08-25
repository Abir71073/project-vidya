import { useEffect, useState } from 'react';
import { ExternalLink, Search, Bookmark, BookmarkCheck, Loader2, AlertTriangle, Quote, FileDown } from 'lucide-react';
import { ResearchPaper } from '../types';

const BOOKMARKS_KEY = 'vidya-research-bookmarks';

function loadBookmarks(): ResearchPaper[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(papers: ResearchPaper[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(papers));
  } catch {
    // localStorage can fail in private-browsing modes; bookmarking just won't persist.
  }
}

export default function Research() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [bookmarks, setBookmarks] = useState<ResearchPaper[]>([]);

  useEffect(() => {
    setBookmarks(loadBookmarks());
  }, []);

  const toggleBookmark = (paper: ResearchPaper) => {
    setBookmarks((prev) => {
      const exists = prev.some((p) => p.id === paper.id);
      const next = exists ? prev.filter((p) => p.id !== paper.id) : [paper, ...prev];
      saveBookmarks(next);
      return next;
    });
  };

  const isBookmarked = (id: string) => bookmarks.some((p) => p.id === id);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setShowSaved(false);

    try {
      const res = await fetch(`/api/research?query=${encodeURIComponent(query.trim())}&limit=12`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }
      setPapers(data.papers || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while searching.');
      setPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const listToShow = showSaved ? bookmarks : papers;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 pb-4 border-b border-zinc-900 flex items-center gap-4">
        <div className="w-11 h-11 shrink-0 bg-zinc-900 text-pink-500 border border-zinc-800 flex items-center justify-center shadow-[0_0_14px_-2px_rgba(236,72,153,0.35)]">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-3xl sm:text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Research Portal</h2>
          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-1">Search academic papers to dive deeper into a topic, powered by Semantic Scholar.</p>
        </div>
      </div>

      <form onSubmit={runSearch} className="flex gap-2 mb-4 shrink-0">
        <div className="flex-1 flex items-center bg-black border border-zinc-800 focus-within:border-pink-500 transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
          <Search className="w-4 h-4 text-zinc-600 ml-3 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic, e.g. conflict-aware shared memory in multi-agent LLMs"
            className="w-full bg-transparent p-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold uppercase tracking-widest px-6 rounded-none text-xs transition-all disabled:opacity-50 flex items-center justify-center shrink-0 drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      <div className="flex gap-2 mb-4 shrink-0">
        <button
          onClick={() => setShowSaved(false)}
          className={`flex items-center px-4 py-2 border rounded-none transition-all duration-300 text-[10px] font-bold uppercase tracking-widest ${
            !showSaved ? 'bg-zinc-900 border-pink-500 text-pink-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Search className="w-4 h-4 mr-2" /> Results
        </button>
        <button
          onClick={() => setShowSaved(true)}
          className={`flex items-center px-4 py-2 border rounded-none transition-all duration-300 text-[10px] font-bold uppercase tracking-widest ${
            showSaved ? 'bg-zinc-900 border-orange-500 text-orange-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Bookmark className="w-4 h-4 mr-2" /> Saved ({bookmarks.length})
        </button>
      </div>

      <div className="flex-1 bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 p-6 overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)] relative">
        <div className="absolute top-0 left-0 right-0 h-px panel-accent-orange z-10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 text-red-400 rounded-none text-xs border border-red-900/50 flex items-start font-medium relative z-10">
            <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {!hasSearched && !showSaved && !error && (
          <div className="h-full flex flex-col items-center justify-center text-center relative z-10">
            <div className="w-24 h-24 bg-black border border-pink-500 text-pink-500 rounded-none flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-['Bebas_Neue'] tracking-widest text-zinc-100 mb-4 uppercase">Search the literature</h3>
            <p className="text-[12px] text-zinc-400 max-w-md font-bold tracking-widest uppercase leading-relaxed">
              Type a topic above to pull real papers from Semantic Scholar's open academic graph.
            </p>
          </div>
        )}

        {showSaved && bookmarks.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center relative z-10">
            <Bookmark className="w-10 h-10 text-zinc-700 mb-4" />
            <p className="text-[12px] text-zinc-500 font-bold tracking-widest uppercase">No saved papers yet. Bookmark a result to keep it here.</p>
          </div>
        )}

        {hasSearched && !showSaved && !loading && !error && papers.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center relative z-10">
            <p className="text-[12px] text-zinc-500 font-bold tracking-widest uppercase">No papers found for "{query}". Try a broader or differently-worded search.</p>
          </div>
        )}

        <div className="space-y-4 relative z-10">
          {listToShow.map((paper) => (
            <div key={paper.id} className="bg-black border border-zinc-900 hover:border-pink-500/40 transition-all duration-300 p-5 shadow-[0_12px_28px_-20px_rgba(0,0,0,0.9)] hover:shadow-[0_16px_32px_-16px_rgba(236,72,153,0.15)]">
              <div className="flex items-start justify-between gap-4">
                <h4 className="text-base font-bold text-zinc-100 leading-snug">{paper.title}</h4>
                <button
                  onClick={() => toggleBookmark(paper)}
                  className={`shrink-0 p-2 border transition-all duration-300 ${
                    isBookmarked(paper.id)
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-pink-500 hover:border-pink-500'
                  }`}
                  title={isBookmarked(paper.id) ? 'Remove bookmark' : 'Save for later'}
                >
                  {isBookmarked(paper.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {paper.year && <span>{paper.year}</span>}
                {paper.venue && <span className="text-zinc-600">· {paper.venue}</span>}
                {paper.authors.length > 0 && (
                  <span className="text-zinc-600">· {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}</span>
                )}
                {paper.citationCount !== null && (
                  <span className="flex items-center text-zinc-600"><Quote className="w-3 h-3 mr-1" />{paper.citationCount} citations</span>
                )}
              </div>

              {paper.abstract && (
                <p className="mt-3 text-xs text-zinc-400 leading-relaxed line-clamp-4">{paper.abstract}</p>
              )}

              <div className="flex flex-wrap gap-3 mt-4">
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-pink-500 hover:text-pink-500 text-zinc-400 rounded-none transition-all duration-300 text-[10px] font-bold uppercase tracking-widest"
                  >
                    View Paper <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                )}
                {paper.pdfUrl && (
                  <a
                    href={paper.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-orange-500 hover:text-orange-500 text-zinc-400 rounded-none transition-all duration-300 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Open Access PDF <FileDown className="w-3 h-3 ml-2" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
