import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide the loader after a set time (e.g., 4 seconds for cinematic effect)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to finish before notifying parent
      setTimeout(onComplete, 1200); 
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Subtle background texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          
          <div className="flex flex-col items-center justify-center flex-1 w-full relative z-10">
            {/* Logo container with continuous slow scale */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1.05, opacity: 1, filter: 'blur(0px)' }}
              transition={{ 
                scale: { duration: 6, ease: "easeOut" },
                opacity: { duration: 2, ease: "easeOut" },
                filter: { duration: 2, ease: "easeOut" }
              }}
              className="flex flex-col items-center"
            >
              <h1 className="font-['Bebas_Neue'] text-7xl md:text-[10rem] tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.3)] mb-2 md:mb-6 pl-4 md:pl-8 leading-none">
                VIDYA AI
              </h1>
              
              {/* Rockstar-style sub-text */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 1.5, ease: "easeOut" }}
                className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-[10px] md:text-sm text-center"
              >
                A Next-Gen Study Experience
              </motion.div>
            </motion.div>
          </div>
          
          {/* Credits bottom section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1.5 }}
            className="absolute bottom-10 md:bottom-16 left-0 right-0 px-6 text-center z-10 flex flex-col items-center"
          >
             <div className="h-[2px] w-16 bg-gradient-to-r from-transparent via-pink-500 to-transparent mb-6 opacity-60"></div>
             <p className="text-zinc-600 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[11px] mb-2">
               Developed By
             </p>
             <p className="text-zinc-300 font-bold uppercase tracking-widest text-[9px] md:text-xs max-w-4xl mx-auto leading-relaxed md:leading-loose">
               Abir Kumar Chakraborty <span className="text-pink-500 mx-2">&bull;</span> Sounok Ghosh <span className="text-pink-500 mx-2">&bull;</span> Srijoni Sarkar <br className="md:hidden" />
               <span className="hidden md:inline text-pink-500 mx-2">&bull;</span> Tuhin Dey <span className="text-pink-500 mx-2">&bull;</span> Moupriya Mondal <span className="text-pink-500 mx-2">&bull;</span> Krish Swaika
             </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
