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
  private altitudeAccumulator: number = 0;

  private static readonly TICK_INTERVAL = 2000;
  private static readonly SPEED_BASE_MIN = 15;
  private static readonly SPEED_BASE_MAX = 25;
  private static readonly ALTITUDE_VARIATION = 3.5;

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
    this.altitudeAccumulator = 0;

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

  private tick(): void {
    if (!this.route || !this.isRunning || this.isPaused) return;

    const coords = this.route.coordinates;
    if (this.currentIndex >= coords.length - 1) {
      this.stop();
      return;
    }

    const advanceRate = 0.8 + Math.random() * 0.4;
    this.fraction += advanceRate;

    while (this.fraction >= 1 && this.currentIndex < coords.length - 1) {
      this.fraction -= 1;
      this.currentIndex++;
    }

    if (this.currentIndex >= coords.length - 1) {
      const finalPoint = this.createTrackPoint(
        coords[coords.length - 1],
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
    const t = this.fraction;

    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;
    const baseAlt = from.altitude + (to.altitude - from.altitude) * t;

    const altitudeDrift = (Math.random() - 0.5) * 2 * GPSSimulator.ALTITUDE_VARIATION;
    this.altitudeAccumulator += altitudeDrift;
    this.altitudeAccumulator *= 0.85;
    const altitude = baseAlt + this.altitudeAccumulator;

    const elevationChange = to.altitude - from.altitude;
    const gradeFactor = elevationChange > 0
      ? 1 - Math.min(0.4, Math.abs(elevationChange) / 50)
      : elevationChange < 0
        ? 1 + Math.min(0.3, Math.abs(elevationChange) / 60)
        : 1;

    const baseSpeed =
      GPSSimulator.SPEED_BASE_MIN +
      Math.random() * (GPSSimulator.SPEED_BASE_MAX - GPSSimulator.SPEED_BASE_MIN);
    const speed = Math.max(5, baseSpeed * gradeFactor + (Math.random() - 0.5) * 4);

    const point: TrackPoint = {
      lat: Math.round(lat * 1000000) / 1000000,
      lng: Math.round(lng * 1000000) / 1000000,
      altitude: Math.round(altitude * 10) / 10,
      timestamp: Date.now(),
      speed: Math.round(speed * 10) / 10,
    };

    if (this.lastPoint) {
      const segDist = this.haversineDistance(
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

  private createTrackPoint(coord: { lat: number; lng: number; altitude: number }, speed: number): TrackPoint {
    return {
      lat: coord.lat,
      lng: coord.lng,
      altitude: coord.altitude,
      timestamp: Date.now(),
      speed,
    };
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const gpsSimulator = new GPSSimulator();
export { GPSSimulator };
