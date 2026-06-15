import { GameEngine } from './game/engine';
import { GameSocket } from './network/socket';

async function main() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  const socket = new GameSocket();
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  try {
    console.log('Connecting to:', wsUrl);
    await socket.connect(wsUrl);
    
    const engine = new GameEngine(canvas, socket);
    engine.start();
    
    console.log('Game started successfully!');
  } catch (error) {
    console.error('Failed to connect to server:', error);
    
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 24px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('连接服务器失败', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px Segoe UI';
    ctx.fillText('请确保服务器已启动并刷新页面重试', canvas.width / 2, canvas.height / 2 + 20);
  }
}

main().catch(console.error);
