import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

const loadingElement = document.getElementById('loading');
if (loadingElement) {
  loadingElement.classList.add('hidden');
  setTimeout(() => loadingElement.remove(), 500);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
