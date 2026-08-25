import { useState, useRef } from 'react';
import { FileText, Wand2, Volume2, Loader2, UploadCloud, NotebookPen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Keep in sync with MAX_UPLOAD_MB in server.ts.
const MAX_UPLOAD_MB = 15;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

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

    // Check size up front so we never even try to base64-encode and upload an
    // oversized file — that would otherwise stall the browser tab and still
    // get rejected by the server.
    if (file.size > MAX_UPLOAD_BYTES) {
      alert(
        `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB, which is over the ${MAX_UPLOAD_MB}MB limit. ` +
        `Try splitting it into smaller sections or uploading a lighter file.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setExtracting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read the file from disk.'));
        reader.readAsDataURL(file);
      });

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

      if (!res.ok || data.error) {
        alert(data.error || 'Error extracting text from this file.');
        return;
      }

      if (data.text) {
        setRawNotes((prev) => prev ? prev + '\n\n' + data.text : data.text);
        if (data.truncated) {
          alert('This document was quite long, so only the first portion of the text was extracted. You can process this part, then upload the rest separately.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process file. Please check your connection and try again.');
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
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5 lg:h-full">
        {/* Input */}
        <div className="relative col-span-12 lg:col-span-5 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 flex flex-col h-[400px] lg:h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 shrink-0 bg-zinc-900 text-pink-500 border border-zinc-800 flex items-center justify-center shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]">
              <NotebookPen className="w-4 h-4" />
            </div>
            <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">Your Notes Vault</h3>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-bold pl-12">Paste raw text or upload a PDF/DOCX (max {MAX_UPLOAD_MB}MB) to structure into clean notes.</p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-pink-500 hover:text-pink-500 text-zinc-300 font-bold uppercase tracking-wider py-2.5 rounded-none text-xs transition-all duration-300 disabled:opacity-70 flex items-center justify-center shrink-0 shadow-sm"
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
            className="flex-1 w-full rounded-none border border-zinc-800 p-3 text-sm focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none mb-4 bg-black text-zinc-200 placeholder:text-zinc-700 transition-colors"
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
        <div className="relative col-span-12 lg:col-span-7 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 flex flex-col min-h-[500px] lg:h-full lg:min-h-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-orange" />
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 bg-zinc-900 text-orange-500 border border-zinc-800 flex items-center justify-center shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">Processed Notes</h3>
            </div>

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
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-center">
                <div className="w-16 h-16 flex items-center justify-center border border-zinc-800 mb-5 text-zinc-700">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest max-w-[220px] leading-relaxed">Processed notes will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
