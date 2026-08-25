import { useState } from 'react';

interface WhatsAppButtonProps {
  /** Pre-fills the WhatsApp chat via wa.me's text= query param. Optional. */
  starterMessage?: string;
}

// A wa.me link just opens the visitor's own WhatsApp app with a chat pre-loaded
// to this number and an optional pre-filled message — they still have to hit
// Send themselves, this never sends anything on their behalf.
//
// NOT LIVE YET: there is currently no Meta-approved WhatsApp Business number
// (or even a Cloud API sandbox test number) connected to server/whatsapp's
// webhook. Until VITE_WHATSAPP_NUMBER is set, this button stays visibly
// disabled rather than linking to a number nobody is listening on — see
// WHATSAPP.md for the exact steps to register a free sandbox test number
// that CAN send/receive real messages, which is enough to demo this live.
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;

export default function WhatsAppButton({ starterMessage }: WhatsAppButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const configured = Boolean(WHATSAPP_NUMBER);

  const href = configured
    ? `https://wa.me/${WHATSAPP_NUMBER}${starterMessage ? `?text=${encodeURIComponent(starterMessage)}` : ''}`
    : undefined;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && (
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-none shadow-[0_8px_20px_-6px_rgba(0,0,0,0.8)]">
          {configured ? 'Chat with us on WhatsApp' : 'Demo only — number not connected yet'}
        </span>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!configured}
        onClick={(e) => {
          if (!configured) e.preventDefault();
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.8)] ${
          configured
            ? 'bg-[#25D366] border-[#1ebe5a] hover:bg-[#2be873] hover:scale-110 active:scale-95 cursor-pointer drop-shadow-[0_0_14px_rgba(37,211,102,0.45)]'
            : 'bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed'
        }`}
      >
        <WhatsAppIcon className={`w-7 h-7 ${configured ? 'text-white' : 'text-zinc-600'}`} />
      </a>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.14c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.6-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.64-.14.26.09 1.66.78 1.94.93.28.14.47.21.53.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}
