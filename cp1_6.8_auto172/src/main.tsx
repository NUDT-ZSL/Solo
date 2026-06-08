import React from 'react';
import ReactDOM from 'react-dom/client';
import { UILayer } from './UILayer';
import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '0';
document.body.appendChild(canvas);

const renderer = new Renderer(canvas);
const engine = new GameEngine(renderer);
engine.start();

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <UILayer engine={engine} />
  </React.StrictMode>
);
