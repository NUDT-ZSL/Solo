import React from 'react';
import ReactDOM from 'react-dom/client';
import GameBoard from './GameBoard';
import { Engine } from './gameEngine';
import './index.css';

const engine = new Engine();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameBoard engine={engine} />
  </React.StrictMode>,
);
