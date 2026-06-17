import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const REGIONS = ["east", "south", "west", "north", "center"] as const;
type Region = (typeof REGIONS)[number];

const RUSH_HOURS = new Set([7, 8, 9, 17, 18, 19]);

interface TrafficPoint {
  intersectionId: string;
  x: number;
  y: number;
  hour: number;
  vehicleCount: number;
  avgSpeed: number;
  congestionIndex: number;
  region: Region;
  directions: {
    east: number;
    south: number;
    west: number;
    north: number;
  };
}

interface Intersection {
  id: string;
  x: number;
  y: number;
  region: Region;
}

const CONFIG_PATH = join(__dirname, "data", "config.json");

const DEFAULT_CONFIG = {
  timeSlot: 12,
  congestionFilter: 0,
  region: "all",
  viewMode: "perspective",
  cameraPosition: { x: 0, y: 40, z: 40 },
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function generateIntersections(count: number): Intersection[] {
  const intersections: Intersection[] = [];
  const perRegion = Math.floor(count / REGIONS.length);

  for (const region of REGIONS) {
    for (let i = 0; i < perRegion; i++) {
      intersections.push({
        id: uuidv4(),
        x: randFloat(-50, 50),
        y: randFloat(-50, 50),
        region,
      });
    }
  }

  return intersections;
}

function generateTrafficData(): TrafficPoint[] {
  const intersections = generateIntersections(50);
  const points: TrafficPoint[] = [];

  for (const intersection of intersections) {
    const hours = new Set<number>();
    while (hours.size < 6) {
      hours.add(rand(0, 23));
    }

    for (const hour of hours) {
      const isRush = RUSH_HOURS.has(hour);

      const vehicleCount = isRush ? rand(350, 800) : rand(50, 400);
      const avgSpeed = isRush ? rand(10, 40) : rand(30, 80);
      const congestionIndex = isRush ? randFloat(5, 10) : randFloat(0, 5);

      points.push({
        intersectionId: intersection.id,
        x: intersection.x,
        y: intersection.y,
        hour,
        vehicleCount,
        avgSpeed,
        congestionIndex,
        region: intersection.region,
        directions: {
          east: rand(0, 200),
          south: rand(0, 200),
          west: rand(0, 200),
          north: rand(0, 200),
        },
      });
    }
  }

  return points;
}

const trafficData = generateTrafficData();

app.get("/api/traffic", (_req, res) => {
  res.json(trafficData);
});

app.get("/api/config", (_req, res) => {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    res.json(JSON.parse(raw));
  } catch {
    res.json(DEFAULT_CONFIG);
  }
});

app.put("/api/config", (req, res) => {
  try {
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
