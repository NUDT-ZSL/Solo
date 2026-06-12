import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';

const root = document.getElementById('root');
if (root) {
  const rootContainer = ReactDOM.createRoot(root);
  rootContainer.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
