import { useState, useRef } from 'react';
import { FileText, Wand2, Volume2, Loader2, UploadCloud } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function NotesManager() {
  const [rawNotes, setRawNotes] = useState('');
  const [processedNotes, setProcessedNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
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
          setRawNotes((prev) => prev ? prev + '\n\n' + data.text : data.text);
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

  const processNotes = async () => {
    if (!rawNotes.trim()) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/process-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawNotes })
      });
      const data = await res.json();
      if (data.notes) {
        setProcessedNotes(data.notes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      // Strip markdown for speech
      const textToSpeak = processedNotes.replace(/[#*`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  return (
    <div className="flex flex-col lg:h-full">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:h-full">
        {/* Input */}
        <div className="col-span-12 lg:col-span-5 bg-zinc-950/80 backdrop-blur-md rounded-none border border-zinc-800 p-4 flex flex-col h-[400px] lg:h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">Your Notes Vault</h3>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-bold">Paste raw text or upload a PDF/DOCX to structure into clean notes.</p>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-pink-500 hover:text-pink-500 text-zinc-300 font-bold uppercase tracking-wider py-2 rounded-none text-xs transition-all duration-300 disabled:opacity-70 flex items-center justify-center shrink-0 shadow-sm"
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
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Paste notes here..."
            className="flex-1 w-full rounded-none border border-zinc-800 p-3 text-sm focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none mb-4 bg-black text-zinc-200 placeholder:text-zinc-700"
          />
          
          <button 
            onClick={processNotes}
            disabled={loading || !rawNotes.trim()}
            className="w-full bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold uppercase tracking-widest py-3 rounded-none text-xs transition-all disabled:opacity-50 flex items-center justify-center shrink-0 drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Structure & Summarize
          </button>
        </div>

        {/* Output */}
        <div className="col-span-12 lg:col-span-7 bg-zinc-950/80 backdrop-blur-md rounded-none border border-zinc-800 p-4 flex flex-col min-h-[500px] lg:h-full lg:min-h-0 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
            <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">Processed Notes</h3>
            
            {processedNotes && (
              <div className="flex gap-2">
                <button 
                  onClick={toggleSpeech}
                  className={`p-2 rounded-none transition-all duration-300 ${speaking ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.8)]' : 'bg-zinc-900 text-zinc-400 hover:text-pink-500 border border-zinc-800'}`}
                  title="Listen to notes"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 bg-black rounded-none p-6 border border-zinc-900 overflow-y-auto">
            {processedNotes ? (
              <div className="prose prose-invert prose-p:text-zinc-300 prose-headings:font-['Bebas_Neue'] prose-headings:tracking-wider prose-headings:text-pink-400 prose-a:text-orange-400 prose-strong:text-zinc-100 text-sm max-w-none">
                <ReactMarkdown>{processedNotes}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                <FileText className="w-12 h-12 mb-3 text-zinc-800" />
                <p className="text-[10px] uppercase font-bold tracking-widest">Processed notes will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
