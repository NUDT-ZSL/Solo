import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'server', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function generateTemperature(lat: number, lon: number, month: number): number {
  const latFactor = Math.cos((lat * Math.PI) / 180);
  const seasonFactor = Math.sin(((month - 1) / 12) * Math.PI * 2 - Math.PI / 2);
  const baseTemp = -40 + 80 * latFactor;
  const seasonalVariation = 25 * seasonFactor * (lat / 90);
  const noise = (Math.random() - 0.5) * 8;
  return Math.round((baseTemp + seasonalVariation + noise) * 10) / 10;
}

function generatePressure(lat: number, lon: number, month: number): number {
  const latBand = Math.abs(lat);
  let basePressure: number;
  if (latBand < 15) {
    basePressure = 1008 + Math.sin(((month - 1) / 12) * Math.PI * 2) * 3;
  } else if (latBand < 45) {
    basePressure = 1018 + Math.sin(((month - 1) / 12) * Math.PI * 2 + Math.PI / 2) * 5;
  } else if (latBand < 70) {
    basePressure = 1005 + Math.sin(((month - 1) / 12) * Math.PI * 2) * 8;
  } else {
    basePressure = 1015 + Math.sin(((month - 1) / 12) * Math.PI * 2 - Math.PI / 2) * 10;
  }
  const noise = (Math.random() - 0.5) * 6;
  return Math.round((basePressure + noise) * 10) / 10;
}

function generatePrecipitation(lat: number, lon: number, month: number): number {
  const latFactor = Math.cos((lat * Math.PI) / 180);
  const itczShift = Math.sin(((month - 1) / 12) * Math.PI * 2) * 10;
  const itczLat = itczShift;
  const distanceFromItcz = Math.abs(lat - itczLat);
  const itczFactor = Math.max(0, 1 - distanceFromItcz / 30);
  
  const landFactor = (Math.sin(lon * 0.05) + 1) / 2;
  
  const basePrecip = 50 + 350 * itczFactor * latFactor + 80 * landFactor;
  const noise = Math.random() * 60;
  return Math.round(Math.max(0, basePrecip + noise - 30) * 10) / 10;
}

function generateData(variable: string, month: number) {
  const records: Array<{ lat: number; lon: number; value: number }> = [];
  
  const latStep = 10;
  const lonStep = 10;
  
  for (let lat = -90; lat <= 90; lat += latStep) {
    for (let lon = -180; lon <= 180; lon += lonStep) {
      let value: number;
      switch (variable) {
        case 'temperature':
          value = generateTemperature(lat, lon, month);
          break;
        case 'pressure':
          value = generatePressure(lat, lon, month);
          break;
        case 'precipitation':
          value = generatePrecipitation(lat, lon, month);
          break;
        default:
          value = 0;
      }
      records.push({ lat, lon, value });
    }
  }
  
  return { records };
}

const variables = ['temperature', 'pressure', 'precipitation'];

for (const variable of variables) {
  for (let month = 1; month <= 12; month++) {
    const paddedMonth = String(month).padStart(2, '0');
    const filePath = path.join(dataDir, `${variable}_${paddedMonth}.json`);
    const data = generateData(variable, month);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Generated: ${variable}_${paddedMonth}.json (${data.records.length} records)`);
  }
}

console.log('\nAll climate data files generated successfully!');
