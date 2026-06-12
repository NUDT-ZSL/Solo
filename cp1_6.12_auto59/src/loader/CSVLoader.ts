import Papa from 'papaparse';
import type { Point3D } from '@/types';
import { eventBus } from '@/utils/EventBus';

const MAX_POINTS = 10000;

export class CSVLoader {
  public async loadFromFile(file: File): Promise<Point3D[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          try {
            const points = this.parseResults(results.data as any[]);
            eventBus.emit('csv:loaded', points);
            resolve(points);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Parse error';
            eventBus.emit('csv:error', msg);
            reject(e);
          }
        },
        error: (err) => {
          eventBus.emit('csv:error', err.message);
          reject(err);
        }
      });
    });
  }

  public async loadFromInput(input: HTMLInputElement): Promise<Point3D[]> {
    if (!input.files || input.files.length === 0) {
      throw new Error('No file selected');
    }
    return this.loadFromFile(input.files[0]);
  }

  private parseResults(data: any[]): Point3D[] {
    if (!data || data.length === 0) {
      throw new Error('CSV file is empty');
    }

    const points: Point3D[] = [];
    const sampleRow = data[0];
    const keys = Object.keys(sampleRow).map(k => k.toLowerCase().trim());

    const findKey = (targets: string[]): string | undefined => {
      for (const t of targets) {
        const key = Object.keys(sampleRow).find(k => k.toLowerCase().trim() === t);
        if (key) return key;
      }
      return undefined;
    };

    const xKey = findKey(['x', 'posx', 'positionx', 'coordx', 'lon', 'longitude']);
    const yKey = findKey(['y', 'posy', 'positiony', 'coordy', 'lat', 'latitude']);
    const zKey = findKey(['z', 'posz', 'positionz', 'coordz', 'depth', 'height']);
    const dKey = findKey(['density', 'd', 'value', 'weight', 'intensity', 'count']);

    if (!xKey || !yKey || !zKey) {
      throw new Error(`CSV must contain x, y, z columns. Found columns: ${keys.join(', ')}`);
    }

    const limit = Math.min(data.length, MAX_POINTS);

    for (let i = 0; i < limit; i++) {
      const row = data[i];
      const x = Number(row[xKey]);
      const y = Number(row[yKey]);
      const z = Number(row[zKey]);
      const density = dKey ? Number(row[dKey]) : 1;

      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
      if (isNaN(density)) continue;

      points.push({ x, y, z, density: Math.max(0, density) });
    }

    if (points.length === 0) {
      throw new Error('No valid data points found in CSV');
    }

    return points;
  }
}
