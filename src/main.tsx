import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './theme/variables.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);