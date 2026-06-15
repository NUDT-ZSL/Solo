import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ItineraryProvider } from './context/ItineraryContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ItineraryProvider>
      <App />
    </ItineraryProvider>
  </React.StrictMode>
);
