import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket signaling server running on ws://localhost:${PORT}`);

const rooms = new Map();

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function broadcastToRoom(roomCode, message, excludeId = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const [playerId, ws] of room.players) {
    if (playerId !== excludeId && ws.readyState === 1) {
      ws.send(data);
    }
  }
}

function getRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  return {
    roomCode,
    players: Array.from(room.players.values()).map((ws) => ({
      id: ws.playerId,
      nickname: ws.nickname,
      score: ws.score,
      strokeCount: ws.strokeCount,
    })),
    currentPlayerIndex: room.currentPlayerIndex,
    strokes: room.strokes,
    maxPlayers: 4,
    gameStarted: room.gameStarted,
  };
}

wss.on('connection', (ws) => {
  ws.playerId = uuidv4();
  ws.nickname = 'Player';
  ws.score = 0;
  ws.strokeCount = 0;
  ws.roomCode = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'CREATE_ROOM': {
        const roomCode = generateRoomCode();
        ws.nickname = msg.nickname || 'Player 1';
        ws.roomCode = roomCode;
        rooms.set(roomCode, {
          players: new Map([[ws.playerId, ws]]),
          strokes: [],
          currentPlayerIndex: 0,
          gameStarted: false,
        });
        ws.send(
          JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode,
            playerId: ws.playerId,
            state: getRoomState(roomCode),
          })
        );
        break;
      }

      case 'JOIN_ROOM': {
        const room = rooms.get(msg.roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '房间不存在' }));
          return;
        }
        if (room.players.size >= 4) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '房间已满' }));
          return;
        }
        const idx = room.players.size + 1;
        ws.nickname = msg.nickname || `Player ${idx}`;
        ws.roomCode = msg.roomCode;
        room.players.set(ws.playerId, ws);
        ws.send(
          JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode: msg.roomCode,
            playerId: ws.playerId,
            state: getRoomState(msg.roomCode),
          })
        );
        broadcastToRoom(
          msg.roomCode,
          {
            type: 'PLAYER_JOINED',
            state: getRoomState(msg.roomCode),
          },
          ws.playerId
        );
        break;
      }

      case 'START_GAME': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        if (room.players.size < 1) return;
        room.gameStarted = true;
        room.currentPlayerIndex = 0;
        room.strokes = [];
        const playerArr = Array.from(room.players.values());
        for (const p of playerArr) {
          p.score = 0;
          p.strokeCount = 0;
        }
        broadcastToRoom(ws.roomCode, {
          type: 'GAME_STARTED',
          state: getRoomState(ws.roomCode),
        });
        break;
      }

      case 'STROKE_SUBMITTED': {
        const room = rooms.get(ws.roomCode);
        if (!room || !room.gameStarted) return;
        const playerArr = Array.from(room.players.values());
        const currentPlayer = playerArr[room.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.playerId !== ws.playerId) return;

        const stroke = {
          id: uuidv4(),
          playerId: ws.playerId,
          type: msg.strokeType,
          color: msg.color,
          width: msg.width,
          points: msg.points,
          timestamp: Date.now(),
        };
        room.strokes.push(stroke);
        ws.strokeCount += 1;
        if (msg.score) {
          ws.score += msg.score;
        }
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % playerArr.length;

        broadcastToRoom(ws.roomCode, {
          type: 'STROKE_BROADCAST',
          stroke,
          score: msg.score || 0,
          playerId: ws.playerId,
          nextPlayerId: playerArr[room.currentPlayerIndex].playerId,
          state: getRoomState(ws.roomCode),
        });
        break;
      }

      case 'SKIP_TURN': {
        const room = rooms.get(ws.roomCode);
        if (!room || !room.gameStarted) return;
        const playerArr = Array.from(room.players.values());
        if (playerArr.length === 0) return;
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % playerArr.length;
        broadcastToRoom(ws.roomCode, {
          type: 'TURN_SKIPPED',
          playerId: ws.playerId,
          nextPlayerId: playerArr[room.currentPlayerIndex].playerId,
          state: getRoomState(ws.roomCode),
        });
        break;
      }

      case 'NARRATIVE_MESSAGE': {
        broadcastToRoom(ws.roomCode, {
          type: 'NARRATIVE',
          text: msg.text,
          playerId: ws.playerId,
        });
        break;
      }

      case 'LEAVE_ROOM': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        room.players.delete(ws.playerId);
        if (room.players.size === 0) {
          rooms.delete(ws.roomCode);
        } else {
          if (room.currentPlayerIndex >= room.players.size) {
            room.currentPlayerIndex = 0;
          }
          broadcastToRoom(ws.roomCode, {
            type: 'PLAYER_LEFT',
            state: getRoomState(ws.roomCode),
          });
        }
        ws.roomCode = null;
        break;
      }
    }
  });

  ws.on('close', () => {
    if (ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (room) {
        room.players.delete(ws.playerId);
        if (room.players.size === 0) {
          rooms.delete(ws.roomCode);
        } else {
          if (room.currentPlayerIndex >= room.players.size) {
            room.currentPlayerIndex = 0;
          }
          broadcastToRoom(ws.roomCode, {
            type: 'PLAYER_LEFT',
            state: getRoomState(ws.roomCode),
          });
        }
      }
    }
  });
});
