/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Section } from './types';
import Layout from './components/Layout';
import Home from './components/Home';
import Assistant from './components/Assistant';
import LoadingScreen from './components/LoadingScreen';
import LearnerProfilePage from './components/LearnerProfile';
import CompetencyAssessment from './components/CompetencyAssessment';
import LearningPaths from './components/LearningPaths';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
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
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [initialLoading, setInitialLoading] = useState(true);

  return (
    <>
      {initialLoading && <LoadingScreen onComplete={() => setInitialLoading(false)} />}

      <Layout currentSection={currentSection} onNavigate={setCurrentSection}>
        <AnimatePresence mode="wait">
          {currentSection === 'home' && <PageTransition sectionId="home"><Home onNavigate={setCurrentSection} /></PageTransition>}
          {currentSection === 'profile' && <PageTransition sectionId="profile"><LearnerProfilePage /></PageTransition>}
          {currentSection === 'assessment' && <PageTransition sectionId="assessment"><CompetencyAssessment /></PageTransition>}
          {currentSection === 'learning' && <PageTransition sectionId="learning"><LearningPaths /></PageTransition>}
          {currentSection === 'dashboard' && <PageTransition sectionId="dashboard"><EmployeeDashboard /></PageTransition>}
          {currentSection === 'admin' && <PageTransition sectionId="admin"><AdminDashboard /></PageTransition>}
          {currentSection === 'assistant' && <PageTransition sectionId="assistant"><Assistant /></PageTransition>}
        </AnimatePresence>
      </Layout>
    </>
  );
}
