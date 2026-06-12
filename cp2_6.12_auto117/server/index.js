const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadRoomData(roomId) {
  const filePath = path.join(DATA_DIR, `${roomId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

function saveRoomData(roomId, data) {
  const filePath = path.join(DATA_DIR, `${roomId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const roomStates = new Map();

const sampleExhibits = [
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

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function loadRoomState(roomId) {
  if (roomStates.has(roomId)) {
    return roomStates.get(roomId);
  }

  const saved = loadRoomData(roomId);
  if (saved) {
    roomStates.set(roomId, saved);
    return saved;
  }

  return null;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', (roomName, callback) => {
    const roomId = generateId();
    const exhibits = sampleExhibits.map((exhibit, index) => ({
      ...exhibit,
      id: `exhibit_${roomId}_${index}`,
      roomId,
    }));

    const state = {
      roomId,
      roomName,
      exhibits,
      createdAt: new Date().toISOString(),
    };

    roomStates.set(roomId, state);
    saveRoomData(roomId, state);
    socket.join(roomId);
    callback({ success: true, roomId, roomName, exhibits });
  });

  socket.on('join_room', (roomId, callback) => {
    const state = loadRoomState(roomId);
    if (!state) {
      callback({ success: false, error: '房间不存在' });
      return;
    }

    socket.join(roomId);
    callback({
      success: true,
      roomId,
      roomName: state.roomName,
      exhibits: state.exhibits,
    });

    const room = io.sockets.adapter.rooms.get(roomId);
    io.to(roomId).emit('user_joined', {
      userId: socket.id,
      userCount: room ? room.size : 0,
    });
  });

  socket.on('place_exhibit', (roomId, exhibitId, gridX, gridY) => {
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
    }

    exhibit.gridX = gridX;
    exhibit.gridY = gridY;
    exhibit.isPlaced = true;

    saveRoomData(roomId, state);

    io.to(roomId).emit('exhibit_placed', {
      exhibitId,
      gridX,
      gridY,
      swappedId: existingExhibit ? existingExhibit.id : null,
      swappedX: existingExhibit ? existingExhibit.gridX : null,
      swappedY: existingExhibit ? existingExhibit.gridY : null,
    });
  });

  socket.on('update_exhibit', (roomId, exhibitData) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitData.id);
    if (!exhibit) return;

    Object.assign(exhibit, exhibitData);
    saveRoomData(roomId, state);

    io.to(roomId).emit('exhibit_updated', exhibit);
  });

  socket.on('rotate_exhibit', (roomId, exhibitId, rotation) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitId);
    if (!exhibit) return;

    exhibit.rotation = rotation;
    saveRoomData(roomId, state);

    io.to(roomId).emit('exhibit_rotated', { exhibitId, rotation });
  });

  socket.on('update_spacing', (roomId, exhibitId, spacing) => {
    const state = roomStates.get(roomId);
    if (!state) return;

    const exhibit = state.exhibits.find((e) => e.id === exhibitId);
    if (!exhibit) return;

    exhibit.spacing = spacing;
    saveRoomData(roomId, state);

    io.to(roomId).emit('spacing_updated', { exhibitId, spacing });
  });

  socket.on('generate_map', (roomId, callback) => {
    const state = roomStates.get(roomId);
    if (!state) {
      callback({ success: false, error: '房间不存在' });
      return;
    }

    const mapData = {
      roomId,
      roomName: state.roomName,
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
        const room = io.sockets.adapter.rooms.get(roomId);
        io.to(roomId).emit('user_left', {
          userId: socket.id,
          userCount: room ? room.size : 0,
        });
      }
    });
  });
});

app.get('/preview/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const state = roomStates.get(roomId) || loadRoomData(roomId);
  if (!state) {
    res.status(404).send('房间不存在');
    return;
  }

  const placedExhibits = state.exhibits.filter((e) => e.isPlaced);
  const mapData = {
    roomId,
    roomName: state.roomName,
    gridSize: 15,
    exhibits: placedExhibits.map((e, index) => ({
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
  <title>${state.roomName} - 展览地图预览</title>
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
      position: relative;
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
      height: 40%;
      background: #f5f5f5;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 20px;
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
      z-index: 100;
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
    <h1>${state.roomName}</h1>
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
    <h3>展品列表 (${placedExhibits.length})</h3>
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
