import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const express = require('express');
const { createServer: createViteServer } = require('vite');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  
  app.use(vite.middlewares);
  
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  const players = new Map();
  const asteroids = [];
  const meteors = [];
  let asteroidIdCounter = 0;
  let meteorIdCounter = 0;
  
  const MAP_WIDTH = 2000;
  const MAP_HEIGHT = 1500;
  const BASE_X = MAP_WIDTH / 2;
  const BASE_Y = MAP_HEIGHT / 2;
  
  function spawnAsteroid() {
    const types = ['iron', 'copper', 'crystal'];
    const weights = [0.5, 0.35, 0.15];
    const rand = Math.random();
    let type = 'iron';
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        type = types[i];
        break;
      }
    }
    
    let x, y;
    do {
      x = Math.random() * MAP_WIDTH;
      y = Math.random() * MAP_HEIGHT;
    } while (Math.hypot(x - BASE_X, y - BASE_Y) < 200);
    
    return {
      id: asteroidIdCounter++,
      x,
      y,
      size: 20 + Math.random() * 30,
      type,
      volume: 100,
      vertices: generatePolygonVertices(6 + Math.floor(Math.random() * 4))
    };
  }
  
  function generatePolygonVertices(sides) {
    const vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const radius = 0.7 + Math.random() * 0.3;
      vertices.push({ angle, radius });
    }
    return vertices;
  }
  
  for (let i = 0; i < 30; i++) {
    asteroids.push(spawnAsteroid());
  }
  
  function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }
  
  wss.on('connection', (ws) => {
    const playerId = Date.now() + Math.random();
    const colors = ['#ff5252', '#448aff', '#69f0ae', '#ffd740'];
    const names = ['玩家1', '玩家2', '玩家3', '玩家4'];
    const playerIndex = players.size % 4;
    
    const player = {
      id: playerId,
      name: names[playerIndex],
      color: colors[playerIndex],
      x: BASE_X + (Math.random() - 0.5) * 100,
      y: BASE_Y + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      rotation: -Math.PI / 2,
      shield: 100,
      maxShield: 100,
      cargo: [],
      cargoCapacity: 10,
      miningSpeed: 0.1,
      level: 1,
      targetAsteroid: null,
      miningProgress: 0,
      score: 0,
      asteroidsMined: 0
    };
    
    players.set(playerId, player);
    
    ws.send(JSON.stringify({
      type: 'init',
      playerId,
      player,
      players: Array.from(players.values()),
      asteroids
    }));
    
    broadcast({
      type: 'playerJoin',
      player
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'input':
            const p = players.get(playerId);
            if (p) {
              p.input = message.input;
              if (message.input.mouseX !== undefined) {
                p.mouseX = message.input.mouseX;
                p.mouseY = message.input.mouseY;
              }
            }
            break;
            
          case 'targetAsteroid':
            const player = players.get(playerId);
            if (player) {
              player.targetAsteroid = message.asteroidId;
            }
            break;
            
          case 'chat':
            const sender = players.get(playerId);
            if (sender) {
              broadcast({
                type: 'chat',
                playerId: sender.id,
                playerName: sender.name,
                message: message.message,
                timestamp: Date.now()
              });
            }
            break;
            
          case 'upgrade':
            const upgrader = players.get(playerId);
            if (!upgrader) break;
            
            const upgradeType = message.upgradeType;
            let canUpgrade = false;
            
            const ironCount = upgrader.cargo.filter(o => o === 'iron').length;
            const copperCount = upgrader.cargo.filter(o => o === 'copper').length;
            const crystalCount = upgrader.cargo.filter(o => o === 'crystal').length;
            
            if (upgradeType === 'cargo' && ironCount >= 10 && copperCount >= 5) {
              for (let i = 0; i < 10; i++) {
                const idx = upgrader.cargo.indexOf('iron');
                if (idx >= 0) upgrader.cargo.splice(idx, 1);
              }
              for (let i = 0; i < 5; i++) {
                const idx = upgrader.cargo.indexOf('copper');
                if (idx >= 0) upgrader.cargo.splice(idx, 1);
              }
              upgrader.cargoCapacity += 5;
              canUpgrade = true;
            } else if (upgradeType === 'shield' && crystalCount >= 8) {
              for (let i = 0; i < 8; i++) {
                const idx = upgrader.cargo.indexOf('crystal');
                if (idx >= 0) upgrader.cargo.splice(idx, 1);
              }
              upgrader.maxShield = 150;
              upgrader.shield = 150;
              canUpgrade = true;
            } else if (upgradeType === 'mining' && crystalCount >= 6 && ironCount >= 4) {
              for (let i = 0; i < 6; i++) {
                const idx = upgrader.cargo.indexOf('crystal');
                if (idx >= 0) upgrader.cargo.splice(idx, 1);
              }
              for (let i = 0; i < 4; i++) {
                const idx = upgrader.cargo.indexOf('iron');
                if (idx >= 0) upgrader.cargo.splice(idx, 1);
              }
              upgrader.miningSpeed = 0.15;
              canUpgrade = true;
            }
            
            if (canUpgrade) {
              upgrader.level++;
              ws.send(JSON.stringify({
                type: 'upgradeSuccess',
                upgradeType,
                player: upgrader
              }));
            }
            break;
        }
      } catch (e) {
        console.error('Message error:', e);
      }
    });
    
    ws.on('close', () => {
      players.delete(playerId);
      broadcast({
        type: 'playerLeave',
        playerId
      });
    });
  });
  
  let lastTime = Date.now();
  let meteorTimer = 0;
  let alarmActive = false;
  let alarmTimer = 0;
  let gameTime = 30 * 60 * 1000;
  
  function gameLoop() {
    const now = Date.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    
    gameTime -= delta * 1000;
    if (gameTime <= 0) {
      gameTime = 0;
    }
    
    meteorTimer += delta * 1000;
    if (meteorTimer >= 30000 && !alarmActive) {
      alarmActive = true;
      alarmTimer = 5000;
      meteorTimer = 0;
      broadcast({ type: 'meteorAlarm' });
    }
    
    if (alarmActive) {
      alarmTimer -= delta * 1000;
      if (alarmTimer <= 0) {
        alarmActive = false;
        for (let i = 0; i < 10; i++) {
          const side = Math.floor(Math.random() * 4);
          let x, y, vx, vy;
          
          switch (side) {
            case 0:
              x = Math.random() * MAP_WIDTH;
              y = -20;
              vx = (Math.random() - 0.5) * 200;
              vy = 300 + Math.random() * 200;
              break;
            case 1:
              x = MAP_WIDTH + 20;
              y = Math.random() * MAP_HEIGHT;
              vx = -(300 + Math.random() * 200);
              vy = (Math.random() - 0.5) * 200;
              break;
            case 2:
              x = Math.random() * MAP_WIDTH;
              y = MAP_HEIGHT + 20;
              vx = (Math.random() - 0.5) * 200;
              vy = -(300 + Math.random() * 200);
              break;
            default:
              x = -20;
              y = Math.random() * MAP_HEIGHT;
              vx = 300 + Math.random() * 200;
              vy = (Math.random() - 0.5) * 200;
          }
          
          meteors.push({
            id: meteorIdCounter++,
            x, y, vx, vy,
            size: 15,
            rotation: Math.atan2(vy, vx)
          });
        }
        broadcast({ type: 'meteorSpawn', meteors });
      }
    }
    
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * delta;
      m.y += m.vy * delta;
      m.rotation = Math.atan2(m.vy, m.vx);
      
      if (m.x < -100 || m.x > MAP_WIDTH + 100 || m.y < -100 || m.y > MAP_HEIGHT + 100) {
        meteors.splice(i, 1);
        continue;
      }
      
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const a = asteroids[j];
        if (Math.hypot(m.x - a.x, m.y - a.y) < a.size + m.size) {
          asteroids.splice(j, 1);
          meteors.splice(i, 1);
          broadcast({ type: 'asteroidDestroyed', asteroidId: a.id, x: a.x, y: a.y });
          break;
        }
      }
      
      if (meteors[i]) {
        for (const [pid, player] of players) {
          if (Math.hypot(m.x - player.x, m.y - player.y) < 20 + m.size) {
            player.shield -= 30;
            player.damaged = true;
            player.damageTimer = 200;
            meteors.splice(i, 1);
            broadcast({ type: 'playerDamaged', playerId: pid, shield: player.shield });
            
            if (player.shield <= 0) {
              player.x = BASE_X;
              player.y = BASE_Y;
              player.shield = player.maxShield;
              player.cargo = [];
              broadcast({ type: 'playerDestroyed', playerId: pid });
            }
            break;
          }
        }
      }
    }
    
    players.forEach(player => {
      if (player.damageTimer !== undefined) {
        player.damageTimer -= delta * 1000;
        if (player.damageTimer <= 0) {
          player.damaged = false;
          player.damageTimer = undefined;
        }
      }
      
      if (player.input) {
        const speed = 150;
        let targetVx = 0;
        let targetVy = 0;
        
        if (player.input.keys.w || player.input.keys.ArrowUp) targetVy -= speed;
        if (player.input.keys.s || player.input.keys.ArrowDown) targetVy += speed;
        if (player.input.keys.a || player.input.keys.ArrowLeft) targetVx -= speed;
        if (player.input.keys.d || player.input.keys.ArrowRight) targetVx += speed;
        
        player.vx += (targetVx - player.vx) * 0.2;
        player.vy += (targetVy - player.vy) * 0.2;
        
        player.x += player.vx * delta;
        player.y += player.vy * delta;
        
        player.x = Math.max(20, Math.min(MAP_WIDTH - 20, player.x));
        player.y = Math.max(20, Math.min(MAP_HEIGHT - 20, player.y));
        
        if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
          player.rotation = Math.atan2(player.vy, player.vx);
        }
      }
      
      if (player.targetAsteroid !== null) {
        const asteroid = asteroids.find(a => a.id === player.targetAsteroid);
        if (asteroid) {
          const dist = Math.hypot(asteroid.x - player.x, asteroid.y - player.y);
          
          if (dist > 30) {
            const angle = Math.atan2(asteroid.y - player.y, asteroid.x - player.x);
            player.x += Math.cos(angle) * 150 * delta;
            player.y += Math.sin(angle) * 150 * delta;
            player.rotation = angle;
          } else {
            asteroid.volume -= player.miningSpeed * 100 * delta;
            player.miningProgress = 1 - asteroid.volume / 100;
            
            if (asteroid.volume <= 0) {
              if (player.cargo.length < player.cargoCapacity) {
                player.cargo.push(asteroid.type);
                player.asteroidsMined++;
                const values = { iron: 10, copper: 25, crystal: 100 };
                player.score += values[asteroid.type];
              }
              
              const idx = asteroids.findIndex(a => a.id === asteroid.id);
              if (idx >= 0) {
                asteroids.splice(idx, 1);
                asteroids.push(spawnAsteroid());
              }
              player.targetAsteroid = null;
              player.miningProgress = 0;
              
              broadcast({
                type: 'asteroidMined',
                asteroidId: asteroid.id,
                playerId: player.id,
                oreType: asteroid.type,
                newAsteroid: asteroids[asteroids.length - 1]
              });
            }
          }
        } else {
          player.targetAsteroid = null;
          player.miningProgress = 0;
        }
      }
    });
    
    broadcast({
      type: 'state',
      players: Array.from(players.values()),
      asteroids,
      meteors,
      gameTime,
      alarmActive,
      timestamp: now
    });
    
    setTimeout(gameLoop, 16);
  }
  
  gameLoop();
  
  const PORT = process.env.PORT || 5173;
  server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  星尘矿脉 - 太空采矿模拟器`);
    console.log(`========================================`);
    console.log(`  服务器已启动: http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`========================================`);
    console.log(`  运行说明:`);
    console.log(`  1. 在浏览器中打开 http://localhost:${PORT}`);
    console.log(`  2. 最多支持4名玩家同时游戏`);
    console.log(`  3. WASD 控制飞船移动`);
    console.log(`  4. 鼠标左键点击小行星进行开采`);
    console.log(`  5. 返回屏幕中央基地可升级飞船`);
    console.log(`  6. 小心流星空袭！`);
    console.log(`========================================\n`);
  });
}

startServer().catch(console.error);
