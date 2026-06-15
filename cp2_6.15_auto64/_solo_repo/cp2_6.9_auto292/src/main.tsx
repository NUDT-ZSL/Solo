import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const globalStyles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Noto Serif SC', serif; min-height: 100vh; }
#root { min-height: 100vh; }
`;

const styleElement = document.createElement('style');
styleElement.textContent = globalStyles;
document.head.appendChild(styleElement);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
