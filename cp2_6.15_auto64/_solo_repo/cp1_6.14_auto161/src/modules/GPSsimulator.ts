import { PlannedRoute, TrackPoint } from '../types';
import { eventBus } from '../eventBus';

interface GPSState {
  isRunning: boolean;
  isPaused: boolean;
  currentPoint: TrackPoint | null;
  totalDistance: number;
  elapsedTime: number;
  avgSpeed: number;
}

interface TerrainSegment {
  startProgress: number;
  endProgress: number;
  slopePercent: number;
  baseAltitude: number;
}

class GPSSimulator {
  private route: PlannedRoute | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private currentIndex: number = 0;
  private fraction: number = 0;
  private totalDistance: number = 0;
  private elapsedTime: number = 0;
  private lastPoint: TrackPoint | null = null;
  private startTimestamp: number = 0;
  private pausedElapsed: number = 0;
  private isPaused: boolean = false;
  private isRunning: boolean = false;

  private terrainSegments: TerrainSegment[] = [];
  private routeTotalDistanceKm: number = 0;
  private sineHillPhase: number = 0;
  private sineHillCount: number = 3;
  private cumulativeDistanceAtPoint: number[] = [];
  private prevSmoothAlt: number | null = null;
  private roadGradeCache: Map<number, number> = new Map();

  private static readonly TICK_INTERVAL = 2000;
  private static readonly SPEED_FLAT_MIN = 17;
  private static readonly SPEED_FLAT_MAX = 24;
  private static readonly SPEED_MIN_CLIMB = 7;
  private static readonly SPEED_MAX_DESCENT = 32;
  private static readonly MICRO_NOISE_M = 0.4;
  private static readonly ELEVATION_SMOOTH_WINDOW = 3;
  private static readonly MIN_CLIMB_DELTA_M = 0.8;

  start(route: PlannedRoute): void {
    if (this.isRunning) {
      this.stop();
    }

    this.route = route;
    this.currentIndex = 0;
    this.fraction = 0;
    this.totalDistance = 0;
    this.elapsedTime = 0;
    this.lastPoint = null;
    this.startTimestamp = Date.now();
    this.pausedElapsed = 0;
    this.isPaused = false;
    this.isRunning = true;
    this.prevSmoothAlt = null;
    this.roadGradeCache.clear();

    this.routeTotalDistanceKm = route.totalDistance;
    this.sineHillPhase = Math.random() * Math.PI * 2;
    this.sineHillCount = Math.max(
      2,
      Math.min(6, Math.floor(Math.max(1, this.routeTotalDistanceKm) / 3 + 2))
    );
    this.buildTerrainSegments();
    this.precomputeCumulativeDistances();

    this.timerId = setInterval(() => this.tick(), GPSSimulator.TICK_INTERVAL);
  }

  stop(): GPSState {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    return this.getState();
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.pausedElapsed = this.elapsedTime;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.startTimestamp = Date.now() - this.pausedElapsed * 1000;
    this.timerId = setInterval(() => this.tick(), GPSSimulator.TICK_INTERVAL);
  }

  getState(): GPSState {
    const avgSpeed =
      this.elapsedTime > 0
        ? this.totalDistance / (this.elapsedTime / 3600)
        : 0;

    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentPoint: this.lastPoint,
      totalDistance: Math.round(this.totalDistance * 10) / 10,
      elapsedTime: this.elapsedTime,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
    };
  }

  private buildTerrainSegments(): void {
    this.terrainSegments = [];

    const numSegs = this.sineHillCount * 2;
    for (let i = 0; i < numSegs; i++) {
      const startProgress = i / numSegs;
      const endProgress = (i + 1) / numSegs;
      const isUp = i % 2 === 0;

      const base = 40 + Math.random() * 30;
      const slopeMag = isUp
        ? 1.5 + Math.random() * 3.5
        : -(1.0 + Math.random() * 3.0);

      this.terrainSegments.push({
        startProgress,
        endProgress,
        slopePercent: slopeMag,
        baseAltitude: base,
      });
    }
  }

  private precomputeCumulativeDistances(): void {
    this.cumulativeDistanceAtPoint = [];
    if (!this.route) return;
    let cum = 0;
    const coords = this.route.coordinates;
    for (let i = 0; i < coords.length; i++) {
      if (i === 0) {
        this.cumulativeDistanceAtPoint.push(0);
      } else {
        cum += this.haversine(
          coords[i - 1].lat,
          coords[i - 1].lng,
          coords[i].lat,
          coords[i].lng
        );
        this.cumulativeDistanceAtPoint.push(cum);
      }
    }
  }

  private tick(): void {
    if (!this.route || !this.isRunning || this.isPaused) return;

    const coords = this.route.coordinates;
    if (this.currentIndex >= coords.length - 1) {
      this.stop();
      return;
    }

    const curSpeed = this.currentSpeedKmH();
    const tickDistanceKm = (curSpeed * GPSSimulator.TICK_INTERVAL) / 1000 / 3600;

    if (this.cumulativeDistanceAtPoint.length === coords.length) {
      this.advanceAlongRouteByDistance(tickDistanceKm);
    } else {
      this.advanceAlongRouteLegacy(tickDistanceKm);
    }

    if (this.currentIndex >= coords.length - 1) {
      const last = coords[coords.length - 1];
      const finalPoint = this.createTrackPoint(
        last.lat,
        last.lng,
        this.simulateAltitude(1.0, last.altitude),
        0
      );
      this.lastPoint = finalPoint;
      this.totalDistance = this.route.totalDistance;
      this.elapsedTime = (Date.now() - this.startTimestamp) / 1000;
      eventBus.emit('gps:update', finalPoint);
      this.stop();
      return;
    }

    const from = coords[this.currentIndex];
    const to = coords[this.currentIndex + 1];
    const t = Math.min(1, Math.max(0, this.fraction));

    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;

    const progress = this.getOverallProgress();
    const routeAltitude = from.altitude + (to.altitude - from.altitude) * t;
    const altitude = this.simulateAltitude(progress, routeAltitude);

    const segmentGradePercent = this.computeRoadGrade(this.currentIndex, t);
    const speed = this.simulateSpeed(segmentGradePercent);

    const point: TrackPoint = {
      lat: Math.round(lat * 1000000) / 1000000,
      lng: Math.round(lng * 1000000) / 1000000,
      altitude: Math.round(altitude * 10) / 10,
      timestamp: Date.now(),
      speed: Math.round(speed * 10) / 10,
    };

    if (this.lastPoint) {
      const segDist = this.haversine(
        this.lastPoint.lat,
        this.lastPoint.lng,
        point.lat,
        point.lng
      );
      this.totalDistance += segDist;
    }

    this.elapsedTime = (Date.now() - this.startTimestamp) / 1000;
    this.lastPoint = point;
    eventBus.emit('gps:update', point);
  }

  private advanceAlongRouteByDistance(distanceKm: number): void {
    if (!this.route) return;
    const coords = this.route.coordinates;
    const cumDists = this.cumulativeDistanceAtPoint;

    const currentCumulative =
      (cumDists[this.currentIndex] || 0) +
      this.fraction *
        ((cumDists[this.currentIndex + 1] || cumDists[this.currentIndex]) -
          (cumDists[this.currentIndex] || 0));

    const targetCumulative = currentCumulative + distanceKm;

    while (
      this.currentIndex < coords.length - 1 &&
      targetCumulative >= (cumDists[this.currentIndex + 1] || 0)
    ) {
      this.currentIndex++;
    }

    if (this.currentIndex < coords.length - 1) {
      const segStart = cumDists[this.currentIndex] || 0;
      const segEnd = cumDists[this.currentIndex + 1] || segStart;
      const segLen = segEnd - segStart;

      if (segLen <= 0) {
        this.fraction = 0;
      } else {
        this.fraction = Math.min(
          1,
          Math.max(0, (targetCumulative - segStart) / segLen)
        );
      }
    }
  }

  private advanceAlongRouteLegacy(distanceKm: number): void {
    if (!this.route) return;
    const coords = this.route.coordinates;
    const totalRouteKm = this.route.totalDistance || 1;
    const coordsN = coords.length;
    const fractionPerKm = Math.max(1, coordsN - 1) / totalRouteKm;
    const advanceFrac = distanceKm * fractionPerKm;

    this.fraction += advanceFrac;

    while (this.fraction >= 1 && this.currentIndex < coords.length - 1) {
      this.fraction -= 1;
      this.currentIndex++;
    }
  }

  private getOverallProgress(): number {
    if (!this.route || this.route.totalDistance === 0) return 0;
    return Math.min(1, this.totalDistance / this.route.totalDistance);
  }

  private computeRoadGrade(index: number, frac: number): number {
    if (!this.route) return 0;
    const coords = this.route.coordinates;
    const cacheKey = index * 10000 + Math.round(frac * 1000);

    if (this.roadGradeCache.has(cacheKey)) {
      return this.roadGradeCache.get(cacheKey)!;
    }

    const WINDOW = 6;
    const startIdx = Math.max(0, index - WINDOW);
    const endIdx = Math.min(coords.length - 1, index + WINDOW);

    const startAlt = coords[startIdx].altitude;
    const endAlt = coords[endIdx].altitude;
    let horizDistKm = 0;

    for (let i = startIdx; i < endIdx; i++) {
      horizDistKm += this.haversine(
        coords[i].lat,
        coords[i].lng,
        coords[i + 1].lat,
        coords[i + 1].lng
      );
    }

    if (horizDistKm < 0.001) return 0;

    const vertDeltaM = endAlt - startAlt;
    const horizDistM = horizDistKm * 1000;

    const grade = (vertDeltaM / horizDistM) * 100;
    const clamped = Math.max(-15, Math.min(15, grade));
    this.roadGradeCache.set(cacheKey, clamped);
    return clamped;
  }

  private simulateAltitude(progress: number, routeBaseAltitude: number): number {
    const hillAmpMajor = 18 + Math.min(35, this.routeTotalDistanceKm * 4);
    const hillAmpMinor = 5 + Math.min(12, this.routeTotalDistanceKm * 1.5);

    const smoothSine =
      Math.sin(this.sineHillPhase + progress * Math.PI * 2 * this.sineHillCount) *
        hillAmpMajor +
      Math.sin(
        this.sineHillPhase * 0.6 + progress * Math.PI * 2 * (this.sineHillCount * 2.1 + 1.3)
      ) *
        hillAmpMinor;

    let baseSegAlt = routeBaseAltitude;
    for (const seg of this.terrainSegments) {
      if (progress >= seg.startProgress && progress <= seg.endProgress) {
        const segLen = seg.endProgress - seg.startProgress || 1;
        const segProgress = (progress - seg.startProgress) / segLen;
        const climbM =
          (seg.slopePercent / 100) * (this.routeTotalDistanceKm * 1000 * segLen);
        baseSegAlt = seg.baseAltitude + segProgress * climbM;
        break;
      }
    }

    const segmentWeight = 0.6;
    const combined =
      baseSegAlt * segmentWeight +
      (routeBaseAltitude + smoothSine) * (1 - segmentWeight);

    const microNoise = (Math.random() - 0.5) * 2 * GPSSimulator.MICRO_NOISE_M;
    const withNoise = combined + microNoise;

    if (this.prevSmoothAlt !== null) {
      const smoothFactor = 0.65;
      const smoothed =
        this.prevSmoothAlt * smoothFactor + withNoise * (1 - smoothFactor);
      this.prevSmoothAlt = smoothed;
      return Math.round(smoothed * 10) / 10;
    } else {
      this.prevSmoothAlt = withNoise;
      return Math.round(withNoise * 10) / 10;
    }
  }

  private simulateSpeed(gradePercent: number): number {
    const base =
      GPSSimulator.SPEED_FLAT_MIN +
      Math.random() * (GPSSimulator.SPEED_FLAT_MAX - GPSSimulator.SPEED_FLAT_MIN);

    let speed: number;

    if (gradePercent >= 0) {
      const climbFactor = Math.max(
        0.35,
        1 - gradePercent / 12
      );
      speed = base * climbFactor;
      speed = Math.max(GPSSimulator.SPEED_MIN_CLIMB, speed);
    } else {
      const descentFactor = Math.min(
        1.55,
        1 + Math.abs(gradePercent) / 10
      );
      speed = base * descentFactor;
      speed = Math.min(GPSSimulator.SPEED_MAX_DESCENT, speed);
    }

    const windJitter = (Math.random() - 0.5) * 2.0;
    speed += windJitter;

    return Math.max(5, Math.round(speed * 10) / 10);
  }

  private currentSpeedKmH(): number {
    if (this.lastPoint) return this.lastPoint.speed;
    return (GPSSimulator.SPEED_FLAT_MIN + GPSSimulator.SPEED_FLAT_MAX) / 2;
  }

  private createTrackPoint(
    lat: number,
    lng: number,
    altitude: number,
    speed: number
  ): TrackPoint {
    return {
      lat,
      lng,
      altitude,
      timestamp: Date.now(),
      speed,
    };
  }

  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static get MIN_CLIMB_DELTA(): number {
    return GPSSimulator.MIN_CLIMB_DELTA_M;
  }
}

export const gpsSimulator = new GPSSimulator();
export { GPSSimulator };
