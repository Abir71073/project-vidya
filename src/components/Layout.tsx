import { BookOpen, HelpCircle, FileText, FlaskConical, Menu, X, BrainCircuit, Library } from 'lucide-react';
import { Section } from '../types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  currentSection: Section;
  onNavigate: (section: Section) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

export default function Layout({ children, currentSection, onNavigate, language, onLanguageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'doubt', label: 'Doubt Solver', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'notes', label: 'Notes Vault', icon: <FileText className="w-5 h-5" /> },
    { id: 'quiz', label: 'Quiz Generator', icon: <BrainCircuit className="w-5 h-5" /> },
    { id: 'assistant', label: 'Subject Assistant', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'research', label: 'Research', icon: <Library className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between lg:justify-start gap-3 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <span className="font-['Bebas_Neue'] text-3xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">VIDYA AI</span>
          </div>
          <button className="lg:hidden p-1 text-zinc-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 px-2 heading-font">Workspace Modules</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-none text-sm transition-all duration-300 ${
                currentSection === item.id 
                  ? 'bg-zinc-900 border-l-4 border-pink-500 text-white font-medium drop-shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border-l-4 border-transparent'
              }`}
            >
              {item.icon}
              <span className="uppercase tracking-wider font-semibold text-xs">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-900 bg-black">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-500">Research Mode</span>
            <div className="w-10 h-5 bg-zinc-900 rounded-none border border-zinc-800 relative p-0.5 cursor-pointer">
              <div className="w-4 h-4 bg-orange-500 rounded-none shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest leading-relaxed">System offline</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-none lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="lg:hidden font-['Bebas_Neue'] text-xl tracking-widest text-zinc-100">
              {navItems.find(i => i.id === currentSection)?.label}
            </span>
            <div className="hidden lg:flex bg-zinc-900 p-1 rounded-none border border-zinc-800">
              <button 
                onClick={() => onLanguageChange('English')}
                className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-none transition-colors ${language === 'English' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
              >
                ENG
              </button>
              <button 
                onClick={() => onLanguageChange('Hindi')}
                className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-none transition-colors ${language === 'Hindi' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
              >
                HIN
              </button>
              <button 
                onClick={() => onLanguageChange('Bengali')}
                className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-none transition-colors ${language === 'Bengali' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
              >
                BEN
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-zinc-500">
              <div className="w-2 h-2 bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div>
              Network Online
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
          <div className="h-full relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
