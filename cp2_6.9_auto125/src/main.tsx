import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WebSocketProvider } from './components/WebSocketProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </React.StrictMode>
  );
}
