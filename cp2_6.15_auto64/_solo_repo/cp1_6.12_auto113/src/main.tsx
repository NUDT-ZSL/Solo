import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #1A1A2E;
    color: #E0E0E0;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #root {
    width: 100%;
    height: 100%;
  }
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #2C2C54;
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #3A3A66;
    background-clip: content-box;
    border: 2px solid transparent;
  }
  ::selection {
    background: rgba(108, 99, 255, 0.35);
    color: #fff;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid #6C63FF;
    outline-offset: 2px;
  }
  input[type=range] {
    height: 24px;
  }
  .hljs {
    background: #1E1E1E !important;
    padding: 0 !important;
    font-family: 'Consolas', 'Fira Code', 'Courier New', monospace !important;
    font-size: 14px !important;
  }
`;
document.head.appendChild(style);
