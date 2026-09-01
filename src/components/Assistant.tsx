import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, BookOpen } from 'lucide-react';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion, AnimatePresence } from 'motion/react';

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I can help with questions about competencies, courses, or how this platform works. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 overflow-hidden max-w-4xl mx-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)]">
      <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink z-10" />
      <div className="p-4 border-b border-zinc-900 bg-black shrink-0 flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 bg-zinc-900 text-pink-500 border border-zinc-800 flex items-center justify-center shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase">Learner Support</h2>
          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Ask about competencies, courses, or the platform itself.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blend-overlay bg-black/40 relative">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10`}
            >
              <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-none flex items-center justify-center shrink-0 mt-0.5 border ${
                  msg.role === 'user' ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-pink-600 border-pink-500 text-white shadow-[0_0_8px_rgba(236,72,153,0.6)]'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={`p-4 rounded-none text-sm border shadow-[0_12px_28px_-16px_rgba(0,0,0,0.9)] ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 border-orange-500/50 text-white'
                    : 'bg-black border-pink-500/50 text-zinc-200'
                }`}>
                  <div className="prose max-w-none prose-sm prose-invert prose-p:leading-relaxed prose-headings:font-['Bebas_Neue'] prose-headings:tracking-wider prose-headings:text-pink-400 prose-a:text-orange-400">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start relative z-10">
            <div className="flex gap-3 max-w-[85%] flex-row">
              <div className="w-8 h-8 rounded-none flex items-center justify-center shrink-0 mt-0.5 border bg-pink-600 border-pink-500 text-white shadow-[0_0_8px_rgba(236,72,153,0.6)]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-none bg-black border border-pink-500/50 flex items-center gap-2">
                <div className="w-2 h-2 bg-pink-500 rounded-none animate-ping" />
                <div className="w-2 h-2 bg-orange-500 rounded-none animate-ping" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-yellow-500 rounded-none animate-ping" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-black border-t border-zinc-900 shrink-0 shadow-[0_-12px_28px_-20px_rgba(0,0,0,0.9)]">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-none text-sm focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all text-zinc-100 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
