import React from 'react';
import { createRoot } from 'react-dom/client';
import '@lako/ui/ui.css';
import 'katex/dist/katex.min.css';
import '../styles.css';
import './integration.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
