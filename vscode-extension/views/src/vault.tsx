import React from 'react';
import { createRoot } from 'react-dom/client';
import VaultApp from './organisms/VaultApp';
import './index.css';

createRoot(document.getElementById('root')!).render(<VaultApp />);
