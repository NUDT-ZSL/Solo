import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from 'react-hot-toast';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontSize: '14px' },
          error: { style: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' } },
          success: { style: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
