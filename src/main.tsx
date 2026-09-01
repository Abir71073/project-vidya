import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AccessibilityProvider } from './context/AccessibilityContext.tsx';
import { LearnerProvider } from './context/LearnerContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <LearnerProvider>
        <App />
      </LearnerProvider>
    </AccessibilityProvider>
  </StrictMode>,
);
