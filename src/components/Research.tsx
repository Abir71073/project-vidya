import { ExternalLink, Search, Bookmark, Filter } from 'lucide-react';

export default function Research() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8 border-b border-zinc-900 pb-4">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Research Portal</h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">Dive deeper into advanced topics, papers, and conceptual extensions.</p>
      </div>

      <div className="flex-1 bg-zinc-950/90 backdrop-blur-md rounded-none border border-zinc-800 p-6 flex flex-col items-center justify-center text-center drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
        
        <div className="w-24 h-24 bg-black border border-pink-500 text-pink-500 rounded-none flex items-center justify-center mb-8 relative z-10 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
          <Search className="w-10 h-10" />
        </div>
        
        <h3 className="text-3xl font-['Bebas_Neue'] tracking-widest text-zinc-100 mb-4 uppercase relative z-10">Research Module Offline</h3>
        <p className="text-[12px] text-zinc-400 max-w-md mb-10 font-bold tracking-widest uppercase relative z-10 leading-relaxed">
          This section will connect to external academic APIs and advanced web search to help you perform deep research directly from your notes. Access restricted.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 relative z-10">
          <button className="flex items-center px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500 hover:text-orange-500 text-zinc-400 rounded-none transition-all duration-300 text-[10px] font-bold uppercase tracking-widest">
            <Bookmark className="w-4 h-4 mr-2" /> Saved Intel
          </button>
          <button className="flex items-center px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-pink-500 hover:text-pink-500 text-zinc-400 rounded-none transition-all duration-300 text-[10px] font-bold uppercase tracking-widest">
            <Filter className="w-4 h-4 mr-2" /> Parameters
          </button>
          <button className="flex items-center px-6 py-3 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white rounded-none transition-colors text-[10px] font-bold uppercase tracking-widest drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
            Explore Network <ExternalLink className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
