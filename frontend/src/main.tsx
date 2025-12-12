import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import AdminApp from './AdminApp.tsx';
import RaceDisplay from './RaceDisplay.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/race" element={<RaceDisplay />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

function NotFound() {
  return (
    <div style={{ padding: '32px', color: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif' }}>
      <p style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
        Not found
      </p>
      <h1>Missing page</h1>
      <a href="/" style={{ color: '#93c5fd' }}>
        Return to lobby
      </a>
    </div>
  );
}
