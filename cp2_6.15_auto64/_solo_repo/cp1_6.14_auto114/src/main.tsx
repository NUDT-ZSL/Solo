import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { OrbitEngine } from './OrbitEngine';
import { planets } from './data/planets';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const orbitEngine = new OrbitEngine(planets);
const css2DRenderer = new CSS2DRenderer();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App orbitEngine={orbitEngine} planets={planets} css2DRenderer={css2DRenderer} />
  </React.StrictMode>
);
