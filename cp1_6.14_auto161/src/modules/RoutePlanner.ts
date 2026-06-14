import { Coordinate, Waypoints, PlannedRoute } from '../types';
import { eventBus } from '../eventBus';

type HighwayType = 'cycleway' | 'path' | 'residential' | 'tertiary' | 'secondary' | 'primary';

interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  timestamp?: string;
  version?: number;
  changeset?: number;
  uid?: number;
  user?: string;
  tags?: Record<string, string>;
}

interface OSMWay {
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

interface BikeWeightMap {
  cycleway: number;
  path: number;
  residential: number;
  tertiary: number;
  secondary: number;
  primary: number;
  default: number;
}

class RoutePlanner {
  private static readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  private static readonly OVERPASS_FALLBACK_URL = 'https://overpass.openstreetmap.ru/api/interpreter';

  private static readonly BIKE_WEIGHTS: BikeWeightMap = {
    cycleway: 1.0,
    path: 1.5,
    residential: 2.0,
    tertiary: 3.0,
    secondary: 4.0,
    primary: 5.5,
    default: 5.0,
  };

  private static readonly HIGHWAY_PRIORITY: HighwayType[] = [
    'cycleway',
    'path',
    'residential',
    'tertiary',
    'secondary',
    'primary',
  ];

  private overpassTimeoutMs = 15000;
  private lastOverpassError = false;

  calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(coord2.lat - coord1.lat);
    const dLng = toRad(coord2.lng - coord1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(coord1.lat)) *
        Math.cos(toRad(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getTotalDistance(coordinates: Coordinate[]): number {
    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
      total += this.calculateDistance(coordinates[i - 1], coordinates[i]);
    }
    return Math.round(total * 10) / 10;
  }

  estimateTime(distanceKm: number, avgSpeedKmH: number = 20): number {
    return Math.round((distanceKm / avgSpeedKmH) * 60);
  }

  async planRoute(waypoints: Waypoints): Promise<PlannedRoute> {
    const allWaypoints = [waypoints.start, ...waypoints.vias, waypoints.end];
    const coordinates: Coordinate[] = [];

    for (let i = 0; i < allWaypoints.length - 1; i++) {
      try {
        const segmentPoints = await this.fetchBikeRouteSegment(
          allWaypoints[i],
          allWaypoints[i + 1]
        );
        if (i === 0) {
          coordinates.push(...segmentPoints);
        } else {
          coordinates.push(...segmentPoints.slice(1));
        }
      } catch (err) {
        console.warn(
          `[RoutePlanner] Failed to fetch segment ${i} from OSM, using weighted bike path fallback:`,
          err
        );
        const fallbackPoints = this.generateWeightedBikePath(
          allWaypoints[i],
          allWaypoints[i + 1]
        );
        if (i === 0) {
          coordinates.push(...fallbackPoints);
        } else {
          coordinates.push(...fallbackPoints.slice(1));
        }
      }
    }

    const totalDistance = this.getTotalDistance(coordinates);
    const estimatedTime = this.estimateTime(totalDistance);

    const route: PlannedRoute = {
      coordinates,
      totalDistance,
      estimatedTime,
      waypoints,
    };

    eventBus.emit('route:planned', route);
    return route;
  }

  private async fetchBikeRouteSegment(
    from: Coordinate,
    to: Coordinate
  ): Promise<Coordinate[]> {
    if (this.lastOverpassError) {
      return this.generateWeightedBikePath(from, to);
    }

    const bbox = this.computeBBox(from, to);
    const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

    const highwayFilters = RoutePlanner.HIGHWAY_PRIORITY.map(
      (h) => `["highway"="${h}"]`
    ).join('');

    const query = `
      [out:json][timeout:${Math.floor(this.overpassTimeoutMs / 1000)}][bbox:${bboxStr}];
      (
        way${highwayFilters}["bicycle"!="no"];
        way["highway"]["bicycle"="designated"];
        way["highway"]["cycleway"];
        relation["route"="bicycle"];
      );
      out geom qt;
    `;

    try {
      const data = await this.overpassRequest(query);
      const bikeWays = this.extractBikeWays(data);

      if (bikeWays.length === 0) {
        throw new Error('No bike ways found in query region');
      }

      const nodeCoordMap = this.buildNodeCoordMap(data);
      const routePath = this.findWeightedPath(
        from,
        to,
        bikeWays,
        nodeCoordMap
      );

      if (routePath.length < 2) {
        throw new Error('Path too short, falling back');
      }

      return this.interpolateWithAltitude(routePath, from, to);
    } catch (err) {
      this.lastOverpassError = true;
      setTimeout(() => {
        this.lastOverpassError = false;
      }, 60000);
      throw err;
    }
  }

  private async overpassRequest(query: string): Promise<OverpassResponse> {
    const urls = [RoutePlanner.OVERPASS_URL, RoutePlanner.OVERPASS_FALLBACK_URL];
    let lastErr: Error | null = null;

    for (const url of urls) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), this.overpassTimeoutMs);
        const resp = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: ctrl.signal,
        });
        clearTimeout(timeout);

        if (!resp.ok) {
          throw new Error(`Overpass HTTP ${resp.status}`);
        }
        return (await resp.json()) as OverpassResponse;
      } catch (err) {
        lastErr = err as Error;
        console.warn(`[RoutePlanner] Overpass endpoint ${url} failed:`, err);
      }
    }

    throw lastErr || new Error('All Overpass endpoints failed');
  }

  private extractBikeWays(data: OverpassResponse): OSMWay[] {
    const ways: OSMWay[] = [];
    for (const el of data.elements) {
      if (el.type === 'way' && el.nodes && el.nodes.length >= 2) {
        ways.push({
          id: el.id,
          nodes: el.nodes,
          tags: el.tags || {},
          geometry: el.geometry,
        });
      }
    }
    return ways;
  }

  private buildNodeCoordMap(data: OverpassResponse): Map<number, { lat: number; lon: number }> {
    const map = new Map<number, { lat: number; lon: number }>();

    for (const el of data.elements) {
      if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
        map.set(el.id, { lat: el.lat, lon: el.lon });
      }
    }

    return map;
  }

  private getHighwayWeight(tags: Record<string, string> | undefined): number {
    if (!tags) return RoutePlanner.BIKE_WEIGHTS.default;

    if (tags['bicycle'] === 'designated' || tags['cycleway']) {
      return RoutePlanner.BIKE_WEIGHTS.cycleway;
    }

    const highway = (tags['highway'] || '') as HighwayType;
    if (highway && highway in RoutePlanner.BIKE_WEIGHTS) {
      return RoutePlanner.BIKE_WEIGHTS[highway];
    }

    return RoutePlanner.BIKE_WEIGHTS.default;
  }

  private findWeightedPath(
    from: Coordinate,
    to: Coordinate,
    ways: OSMWay[],
    nodeCoordMap: Map<number, { lat: number; lon: number }>
  ): Array<{ lat: number; lon: number }> {
    interface GraphNode {
      nodeId: number | null;
      lat: number;
      lon: number;
    }

    interface Edge {
      from: number;
      to: number;
      cost: number;
      coords: Array<{ lat: number; lon: number }>;
    }

    const nodes: GraphNode[] = [
      { nodeId: null, lat: from.lat, lon: from.lng },
      { nodeId: null, lat: to.lat, lon: to.lng },
    ];
    const nodeIndexMap = new Map<string, number>();
    nodeIndexMap.set(`src:${from.lat.toFixed(6)},${from.lng.toFixed(6)}`, 0);
    nodeIndexMap.set(`dst:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`, 1);

    const getOrAddNode = (nodeId: number, lat: number, lon: number): number => {
      const key = `n:${nodeId}`;
      if (nodeIndexMap.has(key)) {
        return nodeIndexMap.get(key)!;
      }
      const idx = nodes.length;
      nodes.push({ nodeId, lat, lon });
      nodeIndexMap.set(key, idx);
      return idx;
    };

    const edges: Edge[] = [];

    for (const way of ways) {
      const weight = this.getHighwayWeight(way.tags);

      if (way.geometry && way.geometry.length >= 2) {
        for (let i = 0; i < way.geometry.length - 1; i++) {
          const a = way.geometry[i];
          const b = way.geometry[i + 1];
          const haversine = this.haversine(a.lat, a.lon, b.lat, b.lon);
          const cost = haversine * weight;

          const idxA = nodes.length;
          nodes.push({ nodeId: null, lat: a.lat, lon: a.lon });
          const idxB = nodes.length;
          nodes.push({ nodeId: null, lat: b.lat, lon: b.lon });

          edges.push({
            from: idxA,
            to: idxB,
            cost,
            coords: [a, b],
          });
          edges.push({
            from: idxB,
            to: idxA,
            cost,
            coords: [b, a],
          });
        }
      } else if (way.nodes.length >= 2) {
        for (let i = 0; i < way.nodes.length - 1; i++) {
          const nidA = way.nodes[i];
          const nidB = way.nodes[i + 1];

          const coordA = nodeCoordMap.get(nidA);
          const coordB = nodeCoordMap.get(nidB);

          if (!coordA || !coordB) continue;

          const haversine = this.haversine(coordA.lat, coordA.lon, coordB.lat, coordB.lon);
          const cost = haversine * weight;

          const idxA = getOrAddNode(nidA, coordA.lat, coordA.lon);
          const idxB = getOrAddNode(nidB, coordB.lat, coordB.lon);

          edges.push({
            from: idxA,
            to: idxB,
            cost,
            coords: [coordA, coordB],
          });
          edges.push({
            from: idxB,
            to: idxA,
            cost,
            coords: [coordB, coordA],
          });
        }
      }
    }

    this.connectNearbyNodes(nodes, edges, 0);
    this.connectNearbyNodes(nodes, edges, 1);

    return this.runAStar(nodes, edges, 0, 1);
  }

  private connectNearbyNodes(
    nodes: Array<{ nodeId: number | null; lat: number; lon: number }>,
    edges: Edge[],
    targetIdx: number
  ) {
    const THRESHOLD_KM = 0.15;
    const target = nodes[targetIdx];

    interface Edge {
      from: number;
      to: number;
      cost: number;
      coords: Array<{ lat: number; lon: number }>;
    }

    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 2; i < nodes.length; i++) {
      const d = this.haversine(target.lat, target.lon, nodes[i].lat, nodes[i].lon);
      if (d < THRESHOLD_KM && d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    if (closestIdx > -1) {
      const walkWeight = 8;
      const cost = closestDist * walkWeight;
      const a = { lat: target.lat, lon: target.lon };
      const b = { lat: nodes[closestIdx].lat, lon: nodes[closestIdx].lon };

      edges.push({
        from: targetIdx,
        to: closestIdx,
        cost,
        coords: [a, b],
      });
      edges.push({
        from: closestIdx,
        to: targetIdx,
        cost,
        coords: [b, a],
      });
    }
  }

  private runAStar(
    nodes: Array<{ nodeId: number | null; lat: number; lon: number }>,
    edges: Edge[],
    startIdx: number,
    endIdx: number
  ): Array<{ lat: number; lon: number }> {
    interface Edge {
      from: number;
      to: number;
      cost: number;
      coords: Array<{ lat: number; lon: number }>;
    }

    const N = nodes.length;
    const adjacency: Map<number, Array<{ to: number; edge: Edge }>> = new Map();

    for (const e of edges) {
      if (!adjacency.has(e.from)) {
        adjacency.set(e.from, []);
      }
      adjacency.get(e.from)!.push({ to: e.to, edge: e });
    }

    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();
    const cameFrom = new Map<number, number>();
    const cameFromEdge = new Map<number, Edge>();

    gScore.set(startIdx, 0);
    fScore.set(startIdx, this.heuristic(nodes[startIdx], nodes[endIdx]));

    const openSet = new Set<number>();
    openSet.add(startIdx);

    while (openSet.size > 0) {
      let current = -1;
      let currentF = Infinity;
      for (const idx of openSet) {
        const f = fScore.get(idx) ?? Infinity;
        if (f < currentF) {
          currentF = f;
          current = idx;
        }
      }

      if (current === -1) break;
      if (current === endIdx) {
        return this.reconstructPath(cameFrom, cameFromEdge, startIdx, endIdx);
      }

      openSet.delete(current);
      const currentG = gScore.get(current) ?? Infinity;
      const neighbors = adjacency.get(current) ?? [];

      for (const n of neighbors) {
        const tentativeG = currentG + n.edge.cost;
        const existingG = gScore.get(n.to) ?? Infinity;

        if (tentativeG < existingG) {
          cameFrom.set(n.to, current);
          cameFromEdge.set(n.to, n.edge);
          gScore.set(n.to, tentativeG);
          fScore.set(
            n.to,
            tentativeG + this.heuristic(nodes[n.to], nodes[endIdx])
          );
          openSet.add(n.to);
        }
      }
    }

    return this.buildDirectPath(nodes[startIdx], nodes[endIdx]);
  }

  private heuristic(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
  ): number {
    return this.haversine(a.lat, a.lon, b.lat, b.lon);
  }

  private reconstructPath(
    cameFrom: Map<number, number>,
    cameFromEdge: Map<number, Edge>,
    startIdx: number,
    endIdx: number
  ): Array<{ lat: number; lon: number }> {
    interface Edge {
      from: number;
      to: number;
      cost: number;
      coords: Array<{ lat: number; lon: number }>;
    }

    const segments: Array<Array<{ lat: number; lon: number }>> = [];
    let cur = endIdx;

    while (cameFrom.has(cur)) {
      const edge = cameFromEdge.get(cur);
      if (edge) {
        segments.unshift(edge.coords);
      }
      cur = cameFrom.get(cur)!;
    }

    const result: Array<{ lat: number; lon: number }> = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (i === 0) {
        result.push(...seg);
      } else {
        result.push(...seg.slice(1));
      }
    }

    return result.length > 0
      ? result
      : this.buildDirectPath(
          { lat: 0, lon: 0 },
          { lat: 0, lon: 0 }
        );
  }

  private buildDirectPath(
    _a: { lat: number; lon: number },
    _b: { lat: number; lon: number }
  ): Array<{ lat: number; lon: number }> {
    return [];
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private interpolateWithAltitude(
    rawPath: Array<{ lat: number; lon: number }>,
    from: Coordinate,
    to: Coordinate
  ): Coordinate[] {
    if (rawPath.length < 2) {
      return this.generateWeightedBikePath(from, to);
    }

    const totalLen = rawPath.length;
    const minSpacingKm = 0.03;
    const result: Coordinate[] = [];

    let lastLat = -Infinity;
    let lastLng = -Infinity;

    const seed = (from.lat * 1000 + from.lng * 1000) % 100;

    for (let i = 0; i < totalLen; i++) {
      const p = rawPath[i];

      if (
        i > 0 &&
        i < totalLen - 1 &&
        this.haversine(lastLat, lastLng, p.lat, p.lon) < minSpacingKm
      ) {
        continue;
      }

      const progress = i / (totalLen - 1);
      const altitude = this.computeAltitude(progress, from.altitude, to.altitude, seed);

      result.push({
        lat: Math.round(p.lat * 1000000) / 1000000,
        lng: Math.round(p.lon * 1000000) / 1000000,
        altitude: Math.round(altitude * 10) / 10,
      });

      lastLat = p.lat;
      lastLng = p.lon;
    }

    if (result.length < 5) {
      return this.generateWeightedBikePath(from, to);
    }

    return result;
  }

  generateWeightedBikePath(from: Coordinate, to: Coordinate): Coordinate[] {
    const dLat = to.lat - from.lat;
    const dLng = to.lng - from.lng;
    const totalDistanceKm = this.haversine(from.lat, from.lng, to.lat, to.lng);

    const avgSpacing = 0.02;
    const totalSteps = Math.max(15, Math.min(120, Math.ceil(totalDistanceKm / avgSpacing)));

    const seed = (Math.abs(from.lat * 1000) + Math.abs(from.lng * 1000) + Math.abs(to.lat * 1000) + Math.abs(to.lng * 1000)) % 100;
    const pseudoRand = (n: number) => {
      const x = Math.sin(seed + n * 1.234) * 10000;
      return x - Math.floor(x);
    };

    const angle = Math.atan2(dLng, dLat);
    const cardinal = this.snapToCardinal(angle);
    const bikePrefWeight = 0.7;

    const perpLat = Math.cos(angle) * 0;
    const _perpLng = Math.sin(angle) * 0;
    void _perpLng;

    const cardPerpLat = Math.cos(cardinal + Math.PI / 2);
    const cardPerpLng = Math.sin(cardinal + Math.PI / 2);

    const numHills = Math.max(1, Math.floor(totalDistanceKm / 2));
    const hillPhase = (seed % 100) / 100 * Math.PI * 2;

    const points: Coordinate[] = [];

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;

      const bikeOffset = Math.sin(t * Math.PI * 3 + seed * 0.1) * 0.0008;
      const bikeOffset2 = Math.sin(t * Math.PI * 7 + seed * 0.3) * 0.0003;

      let lat = from.lat + dLat * t;
      let lng = from.lng + dLng * t;

      lat += (cardPerpLat * bikeOffset + perpLat * 0) * bikePrefWeight;
      lng += (cardPerpLng * bikeOffset + cardPerpLng * bikeOffset2 * 0.5) * bikePrefWeight;

      const wobbleLat = (pseudoRand(i) - 0.5) * 0.00025;
      const wobbleLng = (pseudoRand(i + totalSteps) - 0.5) * 0.00025;
      lat += wobbleLat;
      lng += wobbleLng;

      const altitude = this.computeAltitude(
        t,
        from.altitude,
        to.altitude,
        seed,
        numHills,
        hillPhase,
        totalDistanceKm
      );

      points.push({
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
        altitude: Math.round(altitude * 10) / 10,
      });
    }

    return points;
  }

  private computeAltitude(
    progress: number,
    startAlt: number,
    endAlt: number,
    seed: number,
    numHillsOverride?: number,
    phaseOverride?: number,
    distanceKmOverride?: number
  ): number {
    const base = startAlt + (endAlt - startAlt) * progress;

    const numHills = numHillsOverride ?? 3;
    const hillPhase = phaseOverride ?? 0;
    const distKm = distanceKmOverride ?? 5;

    const majorHillAmp = 25 + Math.min(50, distKm * 6);
    const medHillAmp = 10 + Math.min(20, distKm * 2.5);
    const smallHillAmp = 3.5;

    const majorFreq = numHills;
    const medFreq = numHills * 2.3 + (seed % 3);
    const smallFreq = numHills * 5.7;

    const major = Math.sin(hillPhase + progress * Math.PI * 2 * majorFreq) * majorHillAmp;
    const med = Math.sin(hillPhase * 0.7 + progress * Math.PI * 2 * medFreq + seed * 0.01) * medHillAmp;
    const small = Math.sin(hillPhase * 1.3 + progress * Math.PI * 2 * smallFreq) * smallHillAmp;

    const climbBias = (endAlt - startAlt) * progress * 0.3;

    const noisy = base + major + med + small + climbBias;
    return Math.max(0, Math.round(noisy * 10) / 10);
  }

  private snapToCardinal(angle: number): number {
    const cardinals = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    let best = cardinals[0];
    let bestDiff = Infinity;
    for (const c of cardinals) {
      let diff = Math.abs(angle - c);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }
    return best;
  }

  private computeBBox(a: Coordinate, b: Coordinate) {
    const pad = 0.008 + this.haversine(a.lat, a.lng, b.lat, b.lng) * 0.015;
    return {
      south: Math.min(a.lat, b.lat) - pad,
      north: Math.max(a.lat, b.lat) + pad,
      west: Math.min(a.lng, b.lng) - pad,
      east: Math.max(a.lng, b.lng) + pad,
    };
  }

  getWaypointCoordinates(route: PlannedRoute): Coordinate[] {
    const { start, vias, end } = route.waypoints;
    return [start, ...vias, end];
  }
}

export const routePlanner = new RoutePlanner();
export { RoutePlanner };
