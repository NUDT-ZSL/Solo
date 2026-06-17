import { NetworkManager } from './network';
import { CardGame } from './cardGame';
import { AIPlayer } from './aiPlayer';
import type { GameStateData } from '../shared/types';

const PLAYER_ID = 'local-player';
const WS_URL = 'localhost:3001';

async function bootstrap(): Promise<void> {
  const network = new NetworkManager(PLAYER_ID);
  const cardGame = new CardGame(network, PLAYER_ID);
  const aiPlayer = new AIPlayer(network, cardGame);

  network.on({
    onStateSync: (state: GameStateData) => {
      aiPlayer.updateState(state);
    },
    onAck: (_sequence: number, state: GameStateData) => {
      if (state) {
        aiPlayer.updateState(state);
      }
    },
  });

  try {
    await network.connect(WS_URL);
    console.log('Connected to game server');
  } catch (err) {
    console.error('Failed to connect:', err);
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.background = '#161b22';
    errorDiv.style.padding = '32px';
    errorDiv.style.borderRadius = '12px';
    errorDiv.style.border = '1px solid #ef5350';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerHTML = `
      <h2 style="color: #ef5350; margin-bottom: 16px;">连接失败</h2>
      <p style="margin-bottom: 16px;">请确保后端服务已启动 (npm run dev)</p>
      <button onclick="location.reload()" style="padding: 8px 24px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer;">重试</button>
    `;
    document.body.appendChild(errorDiv);
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
