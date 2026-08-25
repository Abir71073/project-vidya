/** Strips markdown/LaTeX formatting into readable plain speech text. */
export function stripForSpeech(text: string): string {
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => inner.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, ''))
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\overline\{([^}]*)\}/g, 'NOT $1')
    .replace(/\\quad|\\\\|&/g, ' ')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[#_`]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
