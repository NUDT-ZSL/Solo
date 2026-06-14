import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { OrbitEngine } from './OrbitEngine';
import { planets } from './data/planets';

const orbitEngine = new OrbitEngine(planets);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App orbitEngine={orbitEngine} planets={planets} />
  </React.StrictMode>
);
