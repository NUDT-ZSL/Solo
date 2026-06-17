import { NetworkManager } from './network';
import { CardGame } from './cardGame';
import { AIPlayer } from './aiPlayer';

async function initGame() {
  console.log('初始化卡牌游戏...');

  const network = new NetworkManager();
  const cardGame = new CardGame(network);
  const aiPlayer = new AIPlayer(network);

  cardGame.init();

  const WS_URL = 'ws://localhost:3001/ws';
  console.log('WebSocket URL:', WS_URL);
  
  try {
    await network.connect(WS_URL);
    console.log('游戏连接成功');
  } catch (error) {
    console.error('连接失败:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
