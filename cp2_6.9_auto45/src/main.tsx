import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const loadingEl = document.getElementById('loading');
if (loadingEl) {
  loadingEl.style.display = 'none';
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
