import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { EventBus } from './EventBus';
import './index.css';

const eventBus = new EventBus();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App eventBus={eventBus} />
  </React.StrictMode>
);
