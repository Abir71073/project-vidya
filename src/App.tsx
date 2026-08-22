/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Section } from './types';
import Layout from './components/Layout';
import DoubtSolver from './components/DoubtSolver';
import NotesManager from './components/NotesManager';
import QuizGenerator from './components/QuizGenerator';
import Assistant from './components/Assistant';
import Research from './components/Research';
import LoadingScreen from './components/LoadingScreen';
import { AnimatePresence, motion } from 'motion/react';

const PageTransition = ({ children, sectionId }: { children: React.ReactNode, sectionId: string }) => (
  <motion.div
    key={sectionId}
    initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
    exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="h-full w-full"
  >
    {children}
  </motion.div>
);

export default function App() {
  const [currentSection, setCurrentSection] = useState<Section>('doubt');
  const [initialLoading, setInitialLoading] = useState(true);

  return (
    <>
      {initialLoading && <LoadingScreen onComplete={() => setInitialLoading(false)} />}
      
      <Layout currentSection={currentSection} onNavigate={setCurrentSection}>
        <AnimatePresence mode="wait">
          {currentSection === 'doubt' && <PageTransition sectionId="doubt"><DoubtSolver /></PageTransition>}
          {currentSection === 'notes' && <PageTransition sectionId="notes"><NotesManager /></PageTransition>}
          {currentSection === 'quiz' && <PageTransition sectionId="quiz"><QuizGenerator /></PageTransition>}
          {currentSection === 'assistant' && <PageTransition sectionId="assistant"><Assistant /></PageTransition>}
          {currentSection === 'research' && <PageTransition sectionId="research"><Research /></PageTransition>}
        </AnimatePresence>
      </Layout>
    </>
  );
}
