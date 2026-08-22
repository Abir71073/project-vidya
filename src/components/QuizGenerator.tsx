import { useState, useRef } from 'react';
import { BrainCircuit, Loader2, Target, Zap, UploadCloud } from 'lucide-react';
import QuizView from './QuizView';
import { Quiz } from '../types';

export default function QuizGenerator() {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            fileType: file.type
          })
        });
        
        const data = await res.json();
        if (data.text) {
          setNotes((prev) => prev ? prev + '\n\n' + data.text : data.text);
        } else if (data.error) {
          alert('Error extracting text: ' + data.error);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Failed to process file');
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim() && !notes.trim()) return;
    setLoading(true);
    setQuiz(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, topic, difficulty })
      });
      const data = await res.json();
      if (data && data.questions) {
        setQuiz(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (quiz) {
    return <QuizView quiz={quiz} onBack={() => setQuiz(null)} />;
  }

  return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="w-full max-w-2xl bg-zinc-950/90 backdrop-blur-md rounded-none border border-zinc-800 p-6 sm:p-8 flex flex-col drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-900 pb-4">
          <div className="w-12 h-12 bg-zinc-900 text-pink-500 rounded-none flex items-center justify-center border border-zinc-800">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Custom Quiz Generator</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Generate targeted practice questions instantly.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Topic (Required)</label>
            <div className="relative">
              <Target className="w-4 h-4 text-zinc-600 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="e.g. Mitochondria, World War II, React Hooks..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-none border border-zinc-800 text-sm focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none bg-black text-zinc-200 placeholder:text-zinc-700 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest">Optional Notes Context</label>
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                className="w-full bg-zinc-900 border border-zinc-800 hover:border-orange-500 hover:text-orange-500 text-zinc-400 font-bold tracking-widest uppercase py-2 rounded-none text-[10px] transition-all duration-300 disabled:opacity-70 flex items-center justify-center shrink-0"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                {extracting ? 'Extracting Text...' : 'Upload PDF / DOCX'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                className="hidden" 
              />
            </div>
            <textarea 
              placeholder="Paste any specific notes or text you want the quiz to be based on..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-none border border-zinc-800 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none bg-black text-zinc-200 placeholder:text-zinc-700 min-h-[100px] resize-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Difficulty Level</label>
            <div className="flex bg-black border border-zinc-900 p-1 rounded-none">
              {['Easy', 'Medium', 'Hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase rounded-none transition-all duration-300 ${difficulty === level ? 'bg-zinc-900 text-orange-500 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={generateQuiz}
          disabled={loading || (!topic.trim() && !notes.trim())}
          className="mt-8 w-full bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold tracking-widest uppercase py-4 rounded-none text-[12px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating your quiz...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate Quiz
            </>
          )}
        </button>
      </div>
    </div>
  );
}
