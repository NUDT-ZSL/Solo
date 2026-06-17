const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { activities: {} };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Map();

function broadcastToActivity(activityId, message, excludeSenderId) {
  const msg = JSON.stringify(message);
  clients.forEach((client, clientId) => {
    if (client.activityId === activityId && client.ws.readyState === WebSocket.OPEN) {
      if (excludeSenderId && clientId === excludeSenderId) return;
      client.ws.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, activityId: null, role: 'member' });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'JOIN_ACTIVITY': {
          const client = clients.get(clientId);
          client.activityId = msg.activityId;
          client.role = msg.role || 'member';
          const data = readData();
          const activity = data.activities[msg.activityId];
          if (activity) {
            ws.send(JSON.stringify({ type: 'ACTIVITY_STATE', payload: activity, activityId: msg.activityId, senderId: 'server' }));
          }
          broadcastToActivity(msg.activityId, { type: 'MEMBER_JOIN', payload: { clientId, role: client.role }, activityId: msg.activityId, senderId: clientId }, clientId);
          break;
        }
        case 'ROUTE_UPDATE': {
          const data = readData();
          const activity = data.activities[msg.activityId];
          if (activity) {
            activity.waypoints = msg.payload.waypoints;
            if (msg.payload.status) activity.status = msg.payload.status;
            if (msg.payload.startedAt) activity.startedAt = msg.payload.startedAt;
            if (msg.payload.completedAt) activity.completedAt = msg.payload.completedAt;
            writeData(data);
            broadcastToActivity(msg.activityId, msg, clientId);
          }
          break;
        }
        case 'SUPPLY_POINT_ADD': {
          const data = readData();
          const activity = data.activities[msg.activityId];
          if (activity) {
            activity.supplyPoints.push(msg.payload);
            writeData(data);
            broadcastToActivity(msg.activityId, msg, clientId);
          }
          break;
        }
        case 'SUPPLY_POINT_APPROVE':
        case 'SUPPLY_POINT_REJECT': {
          const data = readData();
          const activity = data.activities[msg.activityId];
          if (activity) {
            const sp = activity.supplyPoints.find((s) => s.id === msg.payload.id);
            if (sp) {
              sp.approved = msg.type === 'SUPPLY_POINT_APPROVE';
              writeData(data);
              broadcastToActivity(msg.activityId, msg, clientId);
            }
          }
          break;
        }
        case 'MEMBER_GPS': {
          broadcastToActivity(msg.activityId, msg, clientId);
          break;
        }
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
  });
});

app.post('/api/activities', (req, res) => {
  const data = readData();
  const id = uuidv4();
  const activity = {
    id,
    name: req.body.name,
    startLat: req.body.startLat || 0,
    startLng: req.body.startLng || 0,
    endLat: req.body.endLat || 0,
    endLng: req.body.endLng || 0,
    totalDistance: req.body.totalDistance || 0,
    difficulty: req.body.difficulty || 'moderate',
    waypoints: [],
    supplyPoints: [],
    status: 'planning',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };
  data.activities[id] = activity;
  writeData(data);
  res.json(activity);
});

app.get('/api/activities', (_req, res) => {
  const data = readData();
  res.json(Object.values(data.activities));
});

app.get('/api/activities/:id', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    res.json(activity);
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.put('/api/activities/:id', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    Object.assign(activity, req.body, { id: req.params.id });
    writeData(data);
    res.json(activity);
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.post('/api/activities/:id/waypoints', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    const wp = {
      id: uuidv4(),
      name: req.body.name || '途经点' + (activity.waypoints.length + 1),
      lat: req.body.lat,
      lng: req.body.lng,
      altitude: req.body.altitude || 0,
      estimatedArrival: req.body.estimatedArrival || '',
      note: req.body.note || '',
      order: activity.waypoints.length,
    };
    activity.waypoints.push(wp);
    writeData(data);
    res.json(wp);
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.put('/api/activities/:id/waypoints/:wpId', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    const wp = activity.waypoints.find((w) => w.id === req.params.wpId);
    if (wp) {
      Object.assign(wp, req.body, { id: req.params.wpId });
      writeData(data);
      res.json(wp);
    } else {
      res.status(404).json({ error: 'Waypoint not found' });
    }
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.delete('/api/activities/:id/waypoints/:wpId', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    activity.waypoints = activity.waypoints.filter((w) => w.id !== req.params.wpId);
    activity.waypoints.forEach((w, i) => { w.order = i; });
    writeData(data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.post('/api/activities/:id/supply-points', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    const sp = {
      id: uuidv4(),
      name: req.body.name,
      lat: req.body.lat,
      lng: req.body.lng,
      waterLiters: req.body.waterLiters || 0,
      foodPortions: req.body.foodPortions || 0,
      addedAt: new Date().toISOString(),
      approved: false,
      addedBy: req.body.addedBy || 'unknown',
    };
    activity.supplyPoints.push(sp);
    writeData(data);
    res.json(sp);
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.put('/api/activities/:id/supply-points/:spId/approve', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    const sp = activity.supplyPoints.find((s) => s.id === req.params.spId);
    if (sp) {
      sp.approved = true;
      writeData(data);
      res.json(sp);
    } else {
      res.status(404).json({ error: 'Supply point not found' });
    }
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.put('/api/activities/:id/supply-points/:spId/reject', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (activity) {
    activity.supplyPoints = activity.supplyPoints.filter((s) => s.id !== req.params.spId);
    writeData(data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.get('/api/activities/:id/report', (req, res) => {
  const data = readData();
  const activity = data.activities[req.params.id];
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const waypoints = activity.waypoints.sort((a, b) => a.order - b.order);
  let totalActualDistance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const w = waypoints[i];
    const R = 6371;
    const dLat = (w.lat - prev.lat) * Math.PI / 180;
    const dLon = (w.lng - prev.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(w.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    totalActualDistance += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const plannedDistance = activity.totalDistance;
  const deviation = plannedDistance > 0 ? ((totalActualDistance - plannedDistance) / plannedDistance * 100) : 0;

  const segments = waypoints.slice(1).map((w, i) => {
    const prev = waypoints[i];
    const R = 6371;
    const dLat = (w.lat - prev.lat) * Math.PI / 180;
    const dLon = (w.lng - prev.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(w.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const segDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return {
      from: prev.name,
      to: w.name,
      distance: segDist,
    };
  });

  const totalDuration = activity.startedAt && activity.completedAt
    ? (new Date(activity.completedAt).getTime() - new Date(activity.startedAt).getTime()) / 1000 / 60
    : 0;

  const report = {
    activityName: activity.name,
    totalDuration,
    plannedDistance,
    actualDistance: totalActualDistance,
    deviationPercent: Math.round(deviation * 100) / 100,
    segments,
    supplyPoints: activity.supplyPoints,
    startedAt: activity.startedAt,
    completedAt: activity.completedAt,
  };

  res.json(report);
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
