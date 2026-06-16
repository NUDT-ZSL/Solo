import express from 'express';
import cors from 'cors';
import * as THREE from 'three';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const vectorToObj = (v: THREE.Vector3) => ({ x: v.x, y: v.y, z: v.z });

const createBridgePathsData = () => {
  const ramp1Points = [
    new THREE.Vector3(-60, 0, -40),
    new THREE.Vector3(-50, 1, -35),
    new THREE.Vector3(-40, 3, -28),
    new THREE.Vector3(-30, 5, -18),
    new THREE.Vector3(-20, 7, -8),
    new THREE.Vector3(-12, 8, 0),
    new THREE.Vector3(-6, 8, 6),
    new THREE.Vector3(0, 8, 10),
    new THREE.Vector3(8, 8, 8),
    new THREE.Vector3(16, 8, 0),
    new THREE.Vector3(25, 7, -10),
    new THREE.Vector3(35, 5, -20),
    new THREE.Vector3(45, 3, -30),
    new THREE.Vector3(55, 1, -38),
    new THREE.Vector3(65, 0, -45),
  ];

  const ramp2Points = [
    new THREE.Vector3(60, 0, 40),
    new THREE.Vector3(50, 2, 32),
    new THREE.Vector3(38, 5, 20),
    new THREE.Vector3(26, 8, 8),
    new THREE.Vector3(14, 10, -2),
    new THREE.Vector3(4, 10, -6),
    new THREE.Vector3(-6, 10, -6),
    new THREE.Vector3(-16, 10, -2),
    new THREE.Vector3(-28, 8, 8),
    new THREE.Vector3(-40, 5, 20),
    new THREE.Vector3(-52, 2, 32),
    new THREE.Vector3(-65, 0, 42),
  ];

  const ramp3Points = [
    new THREE.Vector3(-55, 0, 45),
    new THREE.Vector3(-45, 2, 38),
    new THREE.Vector3(-32, 5, 25),
    new THREE.Vector3(-20, 8, 12),
    new THREE.Vector3(-10, 10, 2),
    new THREE.Vector3(-4, 11, -4),
    new THREE.Vector3(0, 11, -10),
    new THREE.Vector3(6, 11, -16),
    new THREE.Vector3(14, 10, -24),
    new THREE.Vector3(24, 8, -34),
    new THREE.Vector3(36, 5, -42),
    new THREE.Vector3(48, 2, -48),
    new THREE.Vector3(60, 0, -52),
  ];

  const ramp4Points = [
    new THREE.Vector3(45, 0, -55),
    new THREE.Vector3(38, 3, -48),
    new THREE.Vector3(25, 6, -36),
    new THREE.Vector3(12, 9, -22),
    new THREE.Vector3(2, 10, -12),
    new THREE.Vector3(-6, 10, -6),
    new THREE.Vector3(-12, 10, 0),
    new THREE.Vector3(-18, 9, 6),
    new THREE.Vector3(-26, 7, 14),
    new THREE.Vector3(-36, 4, 26),
    new THREE.Vector3(-46, 1, 38),
    new THREE.Vector3(-55, 0, 48),
  ];

  const ramp5Points = [
    new THREE.Vector3(-45, 0, -55),
    new THREE.Vector3(-35, 2, -45),
    new THREE.Vector3(-22, 5, -30),
    new THREE.Vector3(-10, 8, -14),
    new THREE.Vector3(-2, 10, -5),
    new THREE.Vector3(4, 10, 0),
    new THREE.Vector3(10, 10, 4),
    new THREE.Vector3(18, 8, 10),
    new THREE.Vector3(28, 5, 20),
    new THREE.Vector3(38, 2, 32),
    new THREE.Vector3(48, 0, 44),
  ];

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];

  return [
    {
      id: 0,
      name: 'Ramp 1',
      color: colors[0],
      controlPoints: ramp1Points.map(vectorToObj),
      level: 1,
    },
    {
      id: 1,
      name: 'Ramp 2',
      color: colors[1],
      controlPoints: ramp2Points.map(vectorToObj),
      level: 2,
    },
    {
      id: 2,
      name: 'Ramp 3',
      color: colors[2],
      controlPoints: ramp3Points.map(vectorToObj),
      level: 3,
    },
    {
      id: 3,
      name: 'Ramp 4',
      color: colors[3],
      controlPoints: ramp4Points.map(vectorToObj),
      level: 2,
    },
    {
      id: 4,
      name: 'Ramp 5',
      color: colors[4],
      controlPoints: ramp5Points.map(vectorToObj),
      level: 1,
    },
  ];
};

const vehicleColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];

app.get('/api/bridge-paths', (req, res) => {
  try {
    const data = createBridgePathsData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate bridge paths' });
  }
});

app.get('/api/vehicle-colors', (req, res) => {
  try {
    res.json({ success: true, data: vehicleColors });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get vehicle colors' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`GET /api/bridge-paths - Returns bridge ramp control points`);
  console.log(`GET /api/vehicle-colors - Returns vehicle color palette`);
});
