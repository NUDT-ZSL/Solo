import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const db = new Database(path.join(__dirname, '..', 'exhibition.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exhibits (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    artist TEXT,
    year TEXT,
    material TEXT,
    description TEXT,
    thumbnail TEXT,
    grid_x INTEGER,
    grid_y INTEGER,
    rotation INTEGER DEFAULT 0,
    spacing INTEGER DEFAULT 50,
    is_placed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );
`);

interface Exhibit {
  id: string;
  roomId: string;
  name: string;
  artist: string;
  year: string;
  material: string;
  description: string;
  thumbnail: string;
  gridX: number | null;
  gridY: number | null;
  rotation: number;
  spacing: number;
  isPlaced: boolean;
}

interface RoomState {
  exhibits: Exhibit[];
}

const roomStates: Map<string, RoomState> = new Map();

function loadRoomState(roomId: string): RoomState {
  if (roomStates.has(roomId)) {
    return roomStates.get(roomId)!;
  }

  const rows = db
    .prepare('SELECT * FROM exhibits WHERE room_id = ?')
    .all(roomId) as any[];

  const exhibits: Exhibit[] = rows.map((row) => ({
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    artist: row.artist || '',
    year: row.year || '',
    material: row.material || '',
    description: row.description || '',
    thumbnail: row.thumbnail || '',
    gridX: row.grid_x,
    gridY: row.grid_y,
    rotation: row.rotation || 0,
    spacing: row.spacing || 50,
    isPlaced: row.is_placed === 1,
  }));

  const state: RoomState = { exhibits };
  roomStates.set(roomId, state);
  return state;
}

function saveExhibit(exhibit: Exhibit) {
  db.prepare(
    `INSERT OR REPLACE INTO exhibits 
     (id, room_id, name, artist, year, material, description, thumbnail, grid_x, grid_y, rotation, spacing, is_placed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    exhibit.id,
    exhibit.roomId,
    exhibit.name,
    exhibit.artist,
    exhibit.year,
    exhibit.material,
    exhibit.description,
    exhibit.thumbnail,
    exhibit.gridX,
    exhibit.gridY,
    exhibit.rotation,
    exhibit.spacing,
    exhibit.isPlaced ? 1 : 0
  );
}

const sampleExhibits: Omit<Exhibit, 'roomId' | 'id'>[] = [
  {
    name: '星月夜',
    artist: '梵高',
    year: '1889',
    material: '布面油画 73.7×92.1cm',
    description: '<p>《星月夜》是荷兰后印象派画家文森特·梵高于1889年在法国圣雷米的一家精神病院里创作的一幅油画，是梵高的代表作之一。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '蒙娜丽莎',
    artist: '达芬奇',
    year: '1503-1519',
    material: '木板油画 77×53cm',
    description: '<p>《蒙娜丽莎》是意大利文艺复兴时期画家列奥纳多·达·芬奇创作的油画，现收藏于法国卢浮宫博物馆。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '呐喊',
    artist: '蒙克',
    year: '1893',
    material: '蛋彩画 91×73.5cm',
    description: '<p>《呐喊》是挪威表现主义画家爱德华·蒙克的代表作，作品表现了人类极端的孤独和苦闷。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '格尔尼卡',
    artist: '毕加索',
    year: '1937',
    material: '布面油画 349.3×776.6cm',
    description: '<p>《格尔尼卡》是西班牙立体主义画家毕加索于20世纪30年代创作的一幅巨型油画。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '记忆的永恒',
    artist: '达利',
    year: '1931',
    material: '布面油画 24.1×33cm',
    description: '<p>《记忆的永恒》是西班牙超现实主义画家萨尔瓦多·达利的代表作，以软表的形象闻名于世。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '戴珍珠耳环的少女',
    artist: '维米尔',
    year: '1665',
    material: '布面油画 44.5×39cm',
    description: '<p>《戴珍珠耳环的少女》是荷兰黄金时代画家约翰内斯·维米尔的代表作，被誉为"北方的蒙娜丽莎"。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '神奈川冲浪里',
    artist: '葛饰北斋',
    year: '1831',
    material: '木版画 25.7×37.8cm',
    description: '<p>《神奈川冲浪里》是日本浮世绘画家葛饰北斋的代表作，属于《富岳三十六景》系列。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
  {
    name: '向日葵',
    artist: '梵高',
    year: '1888',
    material: '布面油画 92.1×73cm',
    description: '<p>《向日葵》是荷兰画家文森特·梵高的代表作之一，他创作了多幅向日葵系列作品。</p>',
    thumbnail: '',
    gridX: null,
    gridY: null,
    rotation: 0,
    spacing: 50,
    isPlaced: false,
  },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', (roomName: string, callback) => {
    const roomId = generateId();
    db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').run(roomId, roomName);

    const state: RoomState = { exhibits: [] };
    sampleExhibits.forEach((exhibit, index) => {
      const exhibitId = `exhibit_${roomId}_${index}`;
      const newExhibit: Exhibit = {
        ...exhibit,
        id: exhibitId,
        roomId,
      };
      state.exhibits.push(newExhibit);
      saveExhibit(newExhibit);
    });

    roomStates.set(roomId, state);
    socket.join(roomId);
    callback({ success: true, roomId, roomName });
  });

  socket.on('join_room', (roomId: string, callback) => {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
    if (!room) {
      callback({ success: false, error: '房间不存在' });
      return;
    }

    const state = loadRoomState(roomId);
    socket.join(roomId);
    callback({
      success: true,
      roomId,
      roomName: room.name,
      exhibits: state.exhibits,
    });

    io.to(roomId).emit('user_joined', {
      userId: socket.id,
      userCount: io.sockets.adapter.rooms.get(roomId)?.size || 0,
    });
  });

  socket.on('place_exhibit', (roomId: string, exhibitId: string, gridX: number, gridY: number) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitId);
    if (!exhibit) return;

    const existingExhibit = state.exhibits.find(
      (e) => e.isPlaced && e.gridX === gridX && e.gridY === gridY && e.id !== exhibitId
    );

    if (existingExhibit) {
      existingExhibit.gridX = exhibit.gridX;
      existingExhibit.gridY = exhibit.gridY;
      if (existingExhibit.gridX === null || existingExhibit.gridY === null) {
        existingExhibit.isPlaced = false;
      }
      saveExhibit(existingExhibit);
    }

    exhibit.gridX = gridX;
    exhibit.gridY = gridY;
    exhibit.isPlaced = true;
    saveExhibit(exhibit);

    io.to(roomId).emit('exhibit_placed', {
      exhibitId,
      gridX,
      gridY,
      swappedId: existingExhibit?.id || null,
      swappedX: existingExhibit?.gridX || null,
      swappedY: existingExhibit?.gridY || null,
    });
  });

  socket.on('update_exhibit', (roomId: string, exhibitData: Partial<Exhibit>) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitData.id);
    if (!exhibit) return;

    Object.assign(exhibit, exhibitData);
    saveExhibit(exhibit);

    io.to(roomId).emit('exhibit_updated', exhibit);
  });

  socket.on('rotate_exhibit', (roomId: string, exhibitId: string, rotation: number) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitId);
    if (!exhibit) return;

    exhibit.rotation = rotation;
    saveExhibit(exhibit);

    io.to(roomId).emit('exhibit_rotated', { exhibitId, rotation });
  });

  socket.on('update_spacing', (roomId: string, exhibitId: string, spacing: number) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitId);
    if (!exhibit) return;

    exhibit.spacing = spacing;
    saveExhibit(exhibit);

    io.to(roomId).emit('spacing_updated', { exhibitId, spacing });
  });

  socket.on('generate_map', (roomId: string, callback) => {
    const state = roomStates.get(roomId);
    if (!state) {
      callback({ success: false, error: '房间不存在' });
      return;
    }

    const mapData = {
      roomId,
      generatedAt: new Date().toISOString(),
      gridSize: 15,
      exhibits: state.exhibits
        .filter((e) => e.isPlaced)
        .map((e) => ({
          id: e.id,
          name: e.name,
          artist: e.artist,
          year: e.year,
          material: e.material,
          description: e.description,
          gridX: e.gridX,
          gridY: e.gridY,
          rotation: e.rotation,
          spacing: e.spacing,
        })),
    };

    const previewUrl = `/preview/${roomId}`;
    callback({ success: true, mapData, previewUrl });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        io.to(roomId).emit('user_left', {
          userId: socket.id,
          userCount: (io.sockets.adapter.rooms.get(roomId)?.size || 0) - 1,
        });
      }
    });
  });
});

app.get('/preview/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).send('房间不存在');
    return;
  }

  const state = loadRoomState(roomId);
  const mapData = {
    roomId,
    roomName: room.name,
    gridSize: 15,
    exhibits: state.exhibits
      .filter((e) => e.isPlaced)
      .map((e, index) => ({
        number: index + 1,
        name: e.name,
        artist: e.artist,
        year: e.year,
        gridX: e.gridX,
        gridY: e.gridY,
        rotation: e.rotation,
      })),
  };

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${room.name} - 展览地图预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #333;
      overflow: hidden;
    }
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 24px;
      background: #fff;
      border-bottom: 1px solid #eee;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 20px; font-weight: 600; }
    .controls { display: flex; gap: 8px; }
    .control-btn {
      padding: 8px 16px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .control-btn:hover { background: #eee; }
    .map-container {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      cursor: grab;
    }
    .map-container:active { cursor: grabbing; }
    .map {
      transform-origin: 0 0;
      transition: transform 0.1s ease-out;
    }
    .grid-cell {
      position: absolute;
      border: 1px solid #f0f0f0;
      box-sizing: border-box;
    }
    .exhibit-booth {
      position: absolute;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease-out;
    }
    .exhibit-number {
      width: 28px;
      height: 28px;
      background: #2196F3;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .exhibit-thumb {
      width: 60%;
      height: 50%;
      background: #f5f5f5;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 24px;
    }
    .exhibit-name {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      text-align: center;
      padding: 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }
    .legend {
      position: fixed;
      bottom: 24px;
      left: 24px;
      background: #fff;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      max-height: 300px;
      overflow-y: auto;
    }
    .legend h3 { font-size: 14px; margin-bottom: 8px; }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 12px;
    }
    .legend-num {
      width: 20px;
      height: 20px;
      background: #2196F3;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${room.name}</h1>
    <div class="controls">
      <button class="control-btn" onclick="zoomIn()">放大</button>
      <button class="control-btn" onclick="zoomOut()">缩小</button>
      <button class="control-btn" onclick="resetView()">重置</button>
    </div>
  </div>
  <div class="map-container" id="mapContainer">
    <div class="map" id="map"></div>
  </div>
  <div class="legend">
    <h3>展品列表</h3>
    <div id="legendList"></div>
  </div>
  <script>
    const mapData = ${JSON.stringify(mapData)};
    const cellSize = 80;
    const gridSize = mapData.gridSize;
    
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX, startY;

    function initMap() {
      const map = document.getElementById('map');
      map.style.width = cellSize * gridSize + 'px';
      map.style.height = cellSize * gridSize + 'px';

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          cell.style.left = x * cellSize + 'px';
          cell.style.top = y * cellSize + 'px';
          cell.style.width = cellSize + 'px';
          cell.style.height = cellSize + 'px';
          map.appendChild(cell);
        }
      }

      mapData.exhibits.forEach((exhibit) => {
        const booth = document.createElement('div');
        booth.className = 'exhibit-booth';
        booth.style.left = exhibit.gridX * cellSize + 4 + 'px';
        booth.style.top = exhibit.gridY * cellSize + 4 + 'px';
        booth.style.width = cellSize - 8 + 'px';
        booth.style.height = cellSize - 8 + 'px';
        booth.style.transform = 'rotate(' + exhibit.rotation + 'deg)';
        
        booth.innerHTML = \`
          <div class="exhibit-number">\${exhibit.number}</div>
          <div class="exhibit-thumb">🖼️</div>
          <div class="exhibit-name">\${exhibit.name}</div>
        \`;
        map.appendChild(booth);
      });

      const legendList = document.getElementById('legendList');
      mapData.exhibits.forEach((exhibit) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = \`
          <span class="legend-num">\${exhibit.number}</span>
          <span>\${exhibit.name} - \${exhibit.artist}</span>
        \`;
        legendList.appendChild(item);
      });

      const container = document.getElementById('mapContainer');
      offsetX = (container.clientWidth - cellSize * gridSize) / 2;
      offsetY = (container.clientHeight - cellSize * gridSize) / 2 + 30;
      updateTransform();
    }

    function updateTransform() {
      const map = document.getElementById('map');
      map.style.transform = \`translate(\${offsetX}px, \${offsetY}px) scale(\${scale})\`;
    }

    function zoomIn() {
      scale *= 1.2;
      updateTransform();
    }

    function zoomOut() {
      scale /= 1.2;
      updateTransform();
    }

    function resetView() {
      const container = document.getElementById('mapContainer');
      scale = 1;
      offsetX = (container.clientWidth - cellSize * gridSize) / 2;
      offsetY = (container.clientHeight - cellSize * gridSize) / 2 + 30;
      updateTransform();
    }

    const container = document.getElementById('mapContainer');
    
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - offsetX;
      startY = e.clientY - offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      offsetX = e.clientX - startX;
      offsetY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale *= delta;
      updateTransform();
    });

    initMap();
  </script>
</body>
</html>`;

  res.send(html);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
