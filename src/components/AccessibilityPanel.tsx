import { Type } from 'lucide-react';
import { useAccessibility, TextScale } from '../context/AccessibilityContext';

const SCALE_LABELS: { value: TextScale; label: string }[] = [
  { value: 'normal', label: 'A' },
  { value: 'large', label: 'A+' },
  { value: 'x-large', label: 'A++' },
];

export default function AccessibilityPanel() {
  const { dyslexiaFont, setDyslexiaFont, textScale, setTextScale } = useAccessibility();

  return (
    <div className="mx-4 mb-4 border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <Type className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Accessibility</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Dyslexia-Friendly Font</span>
        <button
          type="button"
          role="switch"
          aria-checked={dyslexiaFont}
          onClick={() => setDyslexiaFont(!dyslexiaFont)}
          className={`w-10 h-5 rounded-none border relative p-0.5 transition-colors ${dyslexiaFont ? 'bg-pink-500/20 border-pink-500' : 'bg-zinc-900 border-zinc-800'}`}
        >
          <div
            className={`w-4 h-4 rounded-none transition-transform ${dyslexiaFont ? 'bg-pink-500 translate-x-5 shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'bg-zinc-600 translate-x-0'}`}
          />
        </button>
      </div>

      <div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1.5">Text Size</span>
        <div className="flex bg-black border border-zinc-900 p-1">
          {SCALE_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTextScale(value)}
              className={`flex-1 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                textScale === value ? 'bg-zinc-900 text-pink-400 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
