import { BookOpen, HelpCircle, FileText, Menu, X, BrainCircuit, Library, LayoutDashboard, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Section } from '../types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AccessibilityPanel from './AccessibilityPanel';
import WhatsAppButton from './WhatsAppButton';

interface LayoutProps {
  children: React.ReactNode;
  currentSection: Section;
  onNavigate: (section: Section) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

export default function Layout({ children, currentSection, onNavigate, language, onLanguageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-zinc-950 to-black border-r border-zinc-900 flex flex-col transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-[8px_0_32px_-16px_rgba(0,0,0,0.9)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between lg:justify-start gap-3 border-b border-zinc-900 relative">
          <div className="flex items-center gap-3">
            <span className="font-['Bebas_Neue'] text-3xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">VIDYA AI</span>
          </div>
          <button className="lg:hidden p-1 text-zinc-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 h-px panel-accent-pink" />
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 px-2 heading-font">Workspace Modules</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-none text-sm transition-all duration-300 border-l-4 ${
                currentSection === item.id
                  ? 'bg-gradient-to-r from-pink-500/15 via-zinc-900 to-zinc-900 border-pink-500 text-white font-medium shadow-[0_0_20px_-4px_rgba(236,72,153,0.35)]'
                  : 'text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200 border-transparent hover:border-zinc-700'
              }`}
            >
              <span className={currentSection === item.id ? 'text-pink-400' : ''}>{item.icon}</span>
              <span className="uppercase tracking-wider font-semibold text-xs">{item.label}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence initial={false}>
          {settingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <AccessibilityPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* No real accounts yet — this is a static placeholder profile row that
            also doubles as the settings entry point (expands AccessibilityPanel). */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="p-4 border-t border-zinc-900 bg-black/60 flex items-center gap-3 hover:bg-zinc-900/60 transition-colors text-left"
        >
          <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-[11px] font-bold text-white uppercase">S</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate">Student</p>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Settings &amp; Accessibility</p>
          </div>
          <Settings className="w-4 h-4 text-zinc-600 shrink-0" />
          {settingsOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 relative shadow-[0_1px_0_rgba(0,0,0,0.6),0_12px_24px_-12px_rgba(0,0,0,0.8)]">
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
              <div className="w-2 h-2 bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] animate-pulse"></div>
              Network Online
            </div>
          </div>
        </header>

        <div className="ambient-surface flex-1 overflow-y-auto p-4 sm:p-6 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
          <div className="h-full relative z-10">
            {children}
          </div>
        </div>
      </main>

      <WhatsAppButton starterMessage="Hi! I have a doubt I'd like help with." />
    </div>
  );
}
