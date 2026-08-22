import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { DoubtResponse } from '../types';

const preprocessImage = (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Contrast factor (increase contrast significantly)
      const contrast = 100; 
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      for (let i = 0; i < data.length; i += 4) {
        // 1. Grayscale
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // 2. Contrast Enhancement
        gray = factor * (gray - 128) + 128;
        
        // 3. Binarization / Thresholding to make characters distinct
        gray = gray > 140 ? 255 : 0;
        
        data[i] = gray;
        data[i+1] = gray;
        data[i+2] = gray;
        // Alpha remains the same
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    img.src = dataUrl;
  });
};

export default function DoubtSolver() {
  const [image, setImage] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DoubtResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const processed = await preprocessImage(reader.result as string);
          setImage(processed);
        } catch (err) {
          console.error("Failed to preprocess, using original", err);
          setImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image && !textQuery.trim()) {
      setError('Please upload an image or type a question.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/solve-doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          text: textQuery,
          language
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get answer');
      }

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:h-full">
      {/* Input Panel */}
      <section className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:h-full">
        <div className="bg-zinc-950/80 backdrop-blur-md rounded-none border border-zinc-800 p-4 flex-1 flex flex-col drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
            <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">Input: Multimodal Upload</h3>
            {loading && <span className="text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded-none font-bold uppercase tracking-widest flex items-center shadow-[0_0_8px_rgba(236,72,153,0.8)]"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Processing...</span>}
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
            <div className="flex-1 border border-zinc-800 bg-black flex flex-col p-4 relative overflow-hidden group">
              {image ? (
                <>
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                  <div className="z-10 w-full h-full bg-zinc-900 shadow-sm border border-zinc-800 relative overflow-hidden flex items-center justify-center">
                    <img src={image} alt="Uploaded doubt" className="max-h-full max-w-full object-contain filter contrast-125" />
                    <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-pink-600 text-white p-1.5 rounded-none hover:bg-pink-500 transition-colors shadow-[0_0_8px_rgba(236,72,153,0.6)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center text-zinc-600 hover:border-pink-500 hover:text-pink-500 border border-transparent transition-colors cursor-pointer bg-zinc-950"
                >
                  <Upload className="w-8 h-8 mb-3" />
                  <p className="text-[12px] font-bold tracking-widest uppercase">Click to upload image</p>
                  <p className="text-[10px] mt-1 tracking-wider uppercase text-zinc-700">Handwritten questions supported</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Additional Context (Optional)</label>
              <textarea
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="Type here..."
                className="w-full rounded-none border border-zinc-800 p-3 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none h-16 bg-black text-zinc-200 placeholder:text-zinc-700 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex-1 rounded-none border border-zinc-800 p-3 text-[10px] font-bold tracking-widest uppercase focus:ring-1 focus:ring-pink-500 focus:border-pink-500 bg-black text-zinc-300 outline-none cursor-pointer"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold tracking-widest uppercase py-3 px-4 rounded-none text-xs transition-all disabled:opacity-50 flex items-center justify-center drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]"
              >
                {loading ? 'Solving...' : 'Solve Doubt'}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="mt-3 p-3 bg-red-950/50 text-red-400 rounded-none text-xs border border-red-900/50 flex items-start font-medium">
              <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Output Panel */}
      <section className="col-span-12 lg:col-span-7 flex flex-col gap-4 lg:h-full min-h-[500px] lg:min-h-0">
        <div className="bg-zinc-950/80 backdrop-blur-md rounded-none border border-zinc-800 p-5 flex flex-col h-full overflow-hidden drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">AI Explanation</h3>
              {response?.verificationStatus === 'verified' && (
                <span className="text-[10px] bg-green-500/20 border border-green-500 text-green-400 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">Verified Solution</span>
              )}
              {response?.verificationStatus === 'failed' && (
                <span className="text-[10px] bg-red-500/20 border border-red-500 text-red-400 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Unverified</span>
              )}
            </div>
          </div>

          {response?.verificationStatus === 'failed' && response.verificationDetails && (
            <div className="mb-4 p-3 bg-red-950/30 rounded-none text-[10px] uppercase tracking-wider text-red-400 border border-red-900/50">
              <span className="font-bold">Note:</span> Symbolic check failed ({response.verificationDetails}).
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto space-y-4 text-sm leading-relaxed pr-2 custom-scrollbar bg-black p-6 border border-zinc-900">
            {!response && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                <p className="text-[10px] font-bold tracking-widest uppercase">Upload a doubt to see the explanation here.</p>
              </div>
            )}
            
            {response && (
              <div className="prose prose-invert prose-p:text-zinc-300 prose-headings:font-['Bebas_Neue'] prose-headings:tracking-wider prose-headings:text-pink-400 prose-a:text-orange-400 prose-strong:text-zinc-100 text-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {response.explanation}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
