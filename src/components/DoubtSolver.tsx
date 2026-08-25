import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertTriangle, Clapperboard, RefreshCw, ImagePlus, Sparkles, BookMarked, ClipboardCheck, MessageCircleQuestion, FileUp, ListChecks, MousePointerClick, Send, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { DoubtResponse, GradingResult, DetectedQuestion, DiagramEntity } from '../types';
import { stripForSpeech } from '../utils/textToSpeech';
import GradingBreakdown from './GradingBreakdown';
import ProcessingPipeline from './ProcessingPipeline';

type Mode = 'explain' | 'grade';

// Keep in sync with MAX_UPLOAD_MB in server.ts.
const MAX_UPLOAD_MB = 15;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

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
  const [mode, setMode] = useState<Mode>('explain');
  const [image, setImage] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DoubtResponse | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfQuestions, setPdfQuestions] = useState<DetectedQuestion[] | null>(null);
  const [explainStyle, setExplainStyle] = useState<'full' | 'hints'>('full');
  const [hints, setHints] = useState<string[] | null>(null);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [hintsError, setHintsError] = useState<string | null>(null);
  const [revealedHintCount, setRevealedHintCount] = useState(1);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [diagramEntities, setDiagramEntities] = useState<DiagramEntity[]>([]);
  const [diagramAnalyzing, setDiagramAnalyzing] = useState(false);
  const [tappedEntity, setTappedEntity] = useState<DiagramEntity | null>(null);
  const [entityQuestion, setEntityQuestion] = useState('');
  const [entityAnswer, setEntityAnswer] = useState<string | null>(null);
  const [entityAnswerLoading, setEntityAnswerLoading] = useState(false);
  const [entityAnswerError, setEntityAnswerError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const toggleReadAloud = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!response?.explanation) return;
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(response.explanation));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const resetHintState = () => {
    setHints(null);
    setHintsLoading(false);
    setHintsError(null);
    setRevealedHintCount(1);
    setShowFullAnswer(false);
  };

  const resetDiagramState = () => {
    setDiagramEntities([]);
    setDiagramAnalyzing(false);
    setTappedEntity(null);
    setEntityQuestion('');
    setEntityAnswer(null);
    setEntityAnswerLoading(false);
    setEntityAnswerError(null);
  };

  const switchMode = (nextMode: Mode) => {
    if (mode === nextMode) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setMode(nextMode);
    setResponse(null);
    setGradingResult(null);
    setError(null);
    setVideoUrl(null);
    setVideoError(null);
    setPdfQuestions(null);
    setPdfError(null);
    resetHintState();
    resetDiagramState();
  };

  const analyzeDiagram = async (imageDataUrl: string) => {
    setDiagramAnalyzing(true);
    try {
      const res = await fetch('/api/doubt/analyze-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageDataUrl })
      });
      const data = await res.json();
      setDiagramEntities(data.confident ? data.entities : []);
    } catch (err) {
      console.error('Diagram analysis failed', err);
      setDiagramEntities([]);
    } finally {
      setDiagramAnalyzing(false);
    }
  };

  const tapEntity = (entity: DiagramEntity) => {
    setTappedEntity(entity);
    setEntityQuestion('');
    setEntityAnswer(null);
    setEntityAnswerError(null);
  };

  const askAboutEntity = async () => {
    if (!image || !tappedEntity) return;
    setEntityAnswerLoading(true);
    setEntityAnswerError(null);
    setEntityAnswer(null);
    try {
      const res = await fetch('/api/doubt/ask-about-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          entityLabel: tappedEntity.label,
          question: entityQuestion,
          language,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to answer this question.');
      }
      setEntityAnswer(data.answer);
    } catch (err: any) {
      setEntityAnswerError(err.message || 'Failed to answer this question.');
    } finally {
      setEntityAnswerLoading(false);
    }
  };

  const fetchHints = async (explanation: string) => {
    setHintsLoading(true);
    setHintsError(null);
    try {
      const res = await fetch('/api/doubt/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explanation, language })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate hints.');
      }
      setHints(data.hints);
      setRevealedHintCount(1);
    } catch (err: any) {
      setHintsError(err.message || 'Failed to generate hints.');
    } finally {
      setHintsLoading(false);
    }
  };

  const switchExplainStyle = (style: 'full' | 'hints') => {
    if (explainStyle === style) return;
    setExplainStyle(style);
    resetHintState();
    if (style === 'hints' && response?.explanation) {
      fetchHints(response.explanation);
    }
  };

  const showNextHint = () => {
    if (!hints) return;
    setRevealedHintCount((c) => Math.min(c + 1, hints.length));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      resetDiagramState();
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const processed = await preprocessImage(reader.result as string);
          setImage(processed);
          if (mode === 'explain') analyzeDiagram(processed);
        } catch (err) {
          console.error("Failed to preprocess, using original", err);
          const original = reader.result as string;
          setImage(original);
          if (mode === 'explain') analyzeDiagram(original);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    resetDiagramState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setPdfError(`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB, which is over the ${MAX_UPLOAD_MB}MB limit. Try a smaller file.`);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    setPdfParsing(true);
    setPdfError(null);
    setPdfQuestions(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read the file from disk.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/doubt/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, fileName: file.name })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not process this PDF.');
      }

      if (data.questions.length === 1) {
        setTextQuery(data.questions[0].text);
      } else {
        setPdfQuestions(data.questions);
      }
    } catch (err: any) {
      setPdfError(err.message || 'Failed to process this PDF.');
    } finally {
      setPdfParsing(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const selectPdfQuestion = (question: DetectedQuestion) => {
    setTextQuery(question.text);
    setPdfQuestions(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'grade') {
      if (!image) {
        setError('Please upload a photo of your worked solution to grade.');
        return;
      }
    } else if (!image && !textQuery.trim()) {
      setError('Please upload an image or type a question.');
      return;
    }

    window.speechSynthesis.cancel();
    setSpeaking(false);
    setLoading(true);
    setError(null);
    setResponse(null);
    setGradingResult(null);
    setVideoUrl(null);
    setVideoError(null);
    resetHintState();

    try {
      const endpoint = mode === 'grade' ? '/api/examiner/grade' : '/api/solve-doubt';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          text: textQuery,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get a result');
      }

      if (mode === 'grade') {
        setGradingResult(data);
      } else {
        setResponse(data);
        if (explainStyle === 'hints') {
          fetchHints(data.explanation);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!response?.explanation) return;

    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);

    try {
      const res = await fetch('/api/doubt/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explanation: response.explanation,
          mathExpression: response.mathExpression,
          language,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate the video explanation.');
      }

      setVideoUrl(data.videoPath);
    } catch (err: any) {
      setVideoError(err.message || 'Failed to generate the video explanation.');
    } finally {
      setVideoLoading(false);
    }
  };

  const isGrade = mode === 'grade';

  return (
    <div className="flex flex-col gap-5 lg:h-full">
      {/* Mode Toggle */}
      <div className="shrink-0 flex gap-2">
        <button
          type="button"
          onClick={() => switchMode('explain')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 border text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${
            !isGrade
              ? 'bg-zinc-900 border-pink-500 text-pink-400 shadow-[0_0_16px_-4px_rgba(236,72,153,0.4)]'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
          }`}
        >
          <MessageCircleQuestion className="w-4 h-4" /> Explain My Doubt
        </button>
        <button
          type="button"
          onClick={() => switchMode('grade')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 border text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${
            isGrade
              ? 'bg-zinc-900 border-orange-500 text-orange-400 shadow-[0_0_16px_-4px_rgba(249,115,22,0.4)]'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> Grade My Attempt
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-5 lg:h-full min-h-0">
        {/* Input Panel */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:h-full">
          <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 flex-1 flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
            <div className={`absolute top-0 left-0 right-0 h-px ${isGrade ? 'panel-accent-orange' : 'panel-accent-pink'}`} />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 shrink-0 bg-zinc-900 border border-zinc-800 flex items-center justify-center ${isGrade ? 'text-orange-500 shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]' : 'text-pink-500 shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]'}`}>
                  {isGrade ? <ClipboardCheck className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                </div>
                <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">
                  {isGrade ? 'Input: Your Worked Solution' : 'Input: Multimodal Upload'}
                </h3>
              </div>
              {loading && <span className="text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded-none font-bold uppercase tracking-widest flex items-center shadow-[0_0_8px_rgba(236,72,153,0.8)]"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Processing...</span>}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
              <div className="flex-1 border border-zinc-800 bg-black flex flex-col p-4 relative overflow-hidden group">
                {image ? (
                  <>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                    <div className="z-10 w-full h-full bg-zinc-900 shadow-sm border border-zinc-800 relative overflow-hidden flex items-center justify-center">
                      <div className="relative inline-block max-w-full max-h-full">
                        <img src={image} alt="Uploaded doubt" className="block max-h-full max-w-full object-contain filter contrast-125" />
                        {!isGrade && diagramEntities.map((entity) => (
                          <button
                            key={entity.id}
                            type="button"
                            onClick={() => tapEntity(entity)}
                            title={`Ask about: ${entity.label}`}
                            className={`absolute border-2 transition-colors ${tappedEntity?.id === entity.id ? 'border-pink-400 bg-pink-500/25' : 'border-pink-500/60 bg-pink-500/10 hover:bg-pink-500/20 hover:border-pink-400'}`}
                            style={{
                              left: `${entity.box.x * 100}%`,
                              top: `${entity.box.y * 100}%`,
                              width: `${entity.box.width * 100}%`,
                              height: `${entity.box.height * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      {!isGrade && diagramAnalyzing && (
                        <span className="absolute bottom-2 left-2 text-[9px] bg-black/80 text-zinc-400 px-2 py-1 border border-zinc-800 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Scanning diagram...
                        </span>
                      )}
                      {!isGrade && diagramEntities.length > 0 && (
                        <span className="absolute bottom-2 left-2 text-[9px] bg-black/80 text-pink-400 px-2 py-1 border border-pink-500/40 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <MousePointerClick className="w-3 h-3" /> Tap a component to ask about it
                        </span>
                      )}
                      <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-pink-600 text-white p-1.5 rounded-none hover:bg-pink-500 transition-colors shadow-[0_0_8px_rgba(236,72,153,0.6)]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center text-zinc-600 hover:border-pink-500/60 hover:text-pink-500 hover:bg-zinc-900/40 border border-dashed border-zinc-800 transition-all duration-300 cursor-pointer bg-zinc-950"
                  >
                    <div className="w-14 h-14 flex items-center justify-center border border-zinc-800 mb-3 text-zinc-600 group-hover:border-pink-500/50 group-hover:text-pink-500 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-[12px] font-bold tracking-widest uppercase">
                      {isGrade ? 'Click to upload your worked solution' : 'Click to upload image'}
                    </p>
                    <p className="text-[10px] mt-1 tracking-wider uppercase text-zinc-700 text-center max-w-[220px]">
                      {isGrade ? 'Photo must show your own step-by-step working, not just the question' : 'Handwritten questions supported'}
                    </p>
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

              {!isGrade && tappedEntity && (
                <div className="border border-pink-500/40 bg-pink-500/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Asking about: {tappedEntity.label}</span>
                    <button type="button" onClick={() => setTappedEntity(null)} className="text-zinc-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={entityQuestion}
                      onChange={(e) => setEntityQuestion(e.target.value)}
                      placeholder={`e.g. "What does ${tappedEntity.label} do here?"`}
                      className="flex-1 rounded-none border border-zinc-800 p-2.5 text-xs focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none bg-black text-zinc-200 placeholder:text-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={askAboutEntity}
                      disabled={entityAnswerLoading}
                      className="bg-pink-600 hover:bg-pink-500 text-white p-2.5 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {entityAnswerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  {entityAnswerError && (
                    <p className="mt-2 text-[11px] text-red-400">{entityAnswerError}</p>
                  )}
                  {entityAnswer && (
                    <div className="mt-2 text-xs text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{entityAnswer}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {!isGrade && (
                <div>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={pdfParsing}
                    className="w-full bg-zinc-900 border border-zinc-800 hover:border-orange-500 hover:text-orange-500 text-zinc-400 font-bold uppercase tracking-wider py-2.5 rounded-none text-[10px] transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {pdfParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {pdfParsing ? 'Reading PDF...' : 'Or Upload a PDF of Your Question(s)'}
                  </button>
                  <input
                    type="file"
                    ref={pdfInputRef}
                    onChange={handlePdfUpload}
                    accept=".pdf,application/pdf"
                    className="hidden"
                  />

                  {pdfError && (
                    <div className="mt-2 p-2.5 bg-red-950/50 text-red-400 rounded-none text-[11px] border border-red-900/50 flex items-start font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                      <p>{pdfError}</p>
                    </div>
                  )}

                  {pdfQuestions && pdfQuestions.length > 0 && (
                    <div className="mt-2 border border-orange-500/40 bg-orange-500/5 p-3">
                      <div className="flex items-center gap-2 mb-2 text-orange-400">
                        <ListChecks className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Found {pdfQuestions.length} questions — pick one</span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {pdfQuestions.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => selectPdfQuestion(q)}
                            className="w-full text-left px-3 py-2 bg-black border border-zinc-800 hover:border-orange-500 hover:text-orange-400 text-zinc-300 text-xs transition-colors"
                          >
                            {q.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                  {isGrade ? 'Extra Context (Optional, e.g. total marks)' : 'Additional Context (Optional)'}
                </label>
                <textarea
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  placeholder={isGrade ? 'e.g. "This question is worth 5 marks"' : 'Type here...'}
                  className="w-full rounded-none border border-zinc-800 p-3 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none h-16 bg-black text-zinc-200 placeholder:text-zinc-700 transition-colors"
                />
              </div>

              {!isGrade && (
                <div className="flex bg-black border border-zinc-900 p-1">
                  <button
                    type="button"
                    onClick={() => switchExplainStyle('full')}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${explainStyle === 'full' ? 'bg-zinc-900 text-pink-400 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    Full Explanation
                  </button>
                  <button
                    type="button"
                    onClick={() => switchExplainStyle('hints')}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${explainStyle === 'hints' ? 'bg-zinc-900 text-pink-400 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    Guided Hints
                  </button>
                </div>
              )}

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
                  {loading ? (isGrade ? 'Grading...' : 'Solving...') : (isGrade ? 'Grade My Attempt' : 'Solve Doubt')}
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
          <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-5 flex flex-col h-full overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
            <div className={`absolute top-0 left-0 right-0 h-px ${isGrade ? 'panel-accent-pink' : 'panel-accent-orange'}`} />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 shrink-0 bg-zinc-900 border border-zinc-800 flex items-center justify-center ${isGrade ? 'text-pink-500 shadow-[0_0_12px_-2px_rgba(236,72,153,0.3)]' : 'text-orange-500 shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]'}`}>
                  {isGrade ? <ClipboardCheck className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <h3 className="font-['Bebas_Neue'] tracking-widest text-xl text-zinc-100 uppercase">
                  {isGrade ? 'Examiner Feedback' : 'AI Explanation'}
                </h3>
                {!isGrade && response?.verificationStatus === 'verified' && (
                  <span className="text-[10px] bg-green-500/20 border border-green-500 text-green-400 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">Verified Solution</span>
                )}
                {!isGrade && response?.verificationStatus === 'failed' && (
                  <span className="text-[10px] bg-red-500/20 border border-red-500 text-red-400 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Unverified</span>
                )}
              </div>
              {!isGrade && response && explainStyle === 'full' && (
                <button
                  type="button"
                  onClick={toggleReadAloud}
                  title={speaking ? 'Stop reading aloud' : 'Read explanation aloud'}
                  className={`p-2 rounded-none transition-all duration-300 shrink-0 ${speaking ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.8)]' : 'bg-zinc-900 text-zinc-400 hover:text-pink-500 border border-zinc-800'}`}
                >
                  {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            {!isGrade && response?.citation && (
              <div className="mb-4 px-3 py-2 bg-orange-500/10 rounded-none text-[10px] uppercase tracking-wider text-orange-400 border border-orange-500/30 flex items-start gap-2">
                <BookMarked className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p><span className="font-bold">Grounded in:</span> {response.citation}</p>
              </div>
            )}

            {!isGrade && response?.verificationStatus === 'failed' && response.verificationDetails && (
              <div className="mb-4 p-3 bg-red-950/30 rounded-none text-[10px] uppercase tracking-wider text-red-400 border border-red-900/50">
                <span className="font-bold">Note:</span> Symbolic check failed ({response.verificationDetails}).
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 text-sm leading-relaxed pr-2 custom-scrollbar bg-black p-6 border border-zinc-900">
              {isGrade ? (
                <>
                  {loading && <ProcessingPipeline />}
                  {!gradingResult && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-center">
                      <div className="w-16 h-16 flex items-center justify-center border border-zinc-800 mb-5 text-zinc-700">
                        <ClipboardCheck className="w-7 h-7" />
                      </div>
                      <p className="text-[10px] font-bold tracking-widest uppercase max-w-[240px] leading-relaxed">Upload a photo of your worked solution to see a step-by-step scored breakdown here.</p>
                    </div>
                  )}
                  {!loading && gradingResult && <GradingBreakdown result={gradingResult} />}
                </>
              ) : (
                <>
                  {loading && <ProcessingPipeline />}
                  {!response && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-center">
                      <div className="w-16 h-16 flex items-center justify-center border border-zinc-800 mb-5 text-zinc-700">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <p className="text-[10px] font-bold tracking-widest uppercase max-w-[220px] leading-relaxed">Upload a doubt to see the explanation here.</p>
                    </div>
                  )}

                  {response && explainStyle === 'full' && (
                    <div className="prose prose-invert prose-p:text-zinc-300 prose-headings:font-['Bebas_Neue'] prose-headings:tracking-wider prose-headings:text-pink-400 prose-a:text-orange-400 prose-strong:text-zinc-100 text-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {response.explanation}
                      </ReactMarkdown>
                    </div>
                  )}

                  {response && explainStyle === 'hints' && (
                    <>
                      {showFullAnswer ? (
                        <div className="prose prose-invert prose-p:text-zinc-300 prose-headings:font-['Bebas_Neue'] prose-headings:tracking-wider prose-headings:text-pink-400 prose-a:text-orange-400 prose-strong:text-zinc-100 text-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {response.explanation}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <>
                          {hintsLoading && (
                            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest font-bold">
                              <Loader2 className="w-4 h-4 animate-spin" /> Preparing guided hints...
                            </div>
                          )}

                          {hintsError && (
                            <div className="p-3 bg-red-950/50 text-red-400 rounded-none text-xs border border-red-900/50 flex items-start font-medium">
                              <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                              <p>{hintsError}</p>
                            </div>
                          )}

                          {hints && (
                            <div className="space-y-3">
                              {hints.slice(0, revealedHintCount).map((hint, i) => (
                                <div key={i} className="p-4 border border-pink-500/30 bg-pink-500/5">
                                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block mb-1.5">Hint {i + 1} of {hints.length}</span>
                                  <p className="text-sm text-zinc-200 leading-relaxed">{hint}</p>
                                </div>
                              ))}

                              <div className="flex gap-2 pt-2">
                                {revealedHintCount < hints.length && (
                                  <button
                                    type="button"
                                    onClick={showNextHint}
                                    className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-pink-500 hover:text-pink-400 text-zinc-300 font-bold uppercase tracking-widest py-2.5 text-[10px] transition-all duration-300"
                                  >
                                    Show Next Hint
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setShowFullAnswer(true)}
                                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-orange-500 hover:text-orange-400 text-zinc-300 font-bold uppercase tracking-widest py-2.5 text-[10px] transition-all duration-300"
                                >
                                  Just Show Me The Answer
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {!isGrade && response && (
              <div className="mt-4 pt-4 border-t border-zinc-900 shrink-0">
              {!videoUrl && (
                <button
                  onClick={generateVideo}
                  disabled={videoLoading}
                  className="w-full bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold tracking-widest uppercase py-3 px-4 rounded-none text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                >
                  {videoLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating Video...
                    </>
                  ) : (
                    <>
                      <Clapperboard className="w-4 h-4" /> Generate Video Explanation
                    </>
                  )}
                </button>
              )}

              {videoLoading && (
                <p className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold text-center leading-relaxed">
                  Narrating each step, rendering slides, and stitching the video — this can take a minute or two.
                </p>
              )}

              {videoError && (
                <div className="mt-3 p-3 bg-red-950/50 text-red-400 rounded-none text-xs border border-red-900/50 flex items-start font-medium">
                  <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0 mt-0.5" />
                  <p>{videoError}</p>
                </div>
              )}

              {videoUrl && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Video Explanation</h4>
                    <button
                      onClick={generateVideo}
                      disabled={videoLoading}
                      className="text-[10px] text-zinc-500 hover:text-pink-500 uppercase tracking-widest font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {videoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regenerate
                    </button>
                  </div>
                  <video controls src={videoUrl} className="w-full border border-zinc-800 bg-black" />
                </div>
              )}
            </div>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}
