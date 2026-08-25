import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type TextScale = 'normal' | 'large' | 'x-large';

const SCALE_VALUES: Record<TextScale, number> = { normal: 1, large: 1.15, 'x-large': 1.3 };
const STORAGE_KEY = 'vidya-accessibility';

interface AccessibilitySettings {
  dyslexiaFont: boolean;
  textScale: TextScale;
  setDyslexiaFont: (v: boolean) => void;
  setTextScale: (v: TextScale) => void;
}

const AccessibilityContext = createContext<AccessibilitySettings | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [textScale, setTextScale] = useState<TextScale>('normal');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.dyslexiaFont === 'boolean') setDyslexiaFont(parsed.dyslexiaFont);
      if (parsed.textScale in SCALE_VALUES) setTextScale(parsed.textScale);
    } catch {
      // Ignore malformed/unavailable localStorage — settings just default.
    }
  }, []);

  useEffect(() => {
    // Site-wide text scaling: Tailwind's text-* utilities use rem units, which
    // are relative to the root <html> font-size — scaling that one value
    // proportionally resizes every screen without touching each component.
    document.documentElement.style.fontSize = `${16 * SCALE_VALUES[textScale]}px`;
    document.documentElement.classList.toggle('a11y-dyslexia-font', dyslexiaFont);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dyslexiaFont, textScale }));
    } catch {
      // Private-browsing etc. — setting just won't persist across reloads.
    }
  }, [dyslexiaFont, textScale]);

  return (
    <AccessibilityContext.Provider value={{ dyslexiaFont, textScale, setDyslexiaFont, setTextScale }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilitySettings {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
