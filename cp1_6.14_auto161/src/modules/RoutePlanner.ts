import { Coordinate, Waypoints, PlannedRoute } from '../types';
import { eventBus } from '../eventBus';

class RoutePlanner {
  calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371;
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLng = this.toRad(coord2.lng - coord1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.lat)) *
        Math.cos(this.toRad(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
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

  planRoute(waypoints: Waypoints): PlannedRoute {
    const allWaypoints = [waypoints.start, ...waypoints.vias, waypoints.end];
    const coordinates: Coordinate[] = [];

    for (let i = 0; i < allWaypoints.length - 1; i++) {
      const segmentPoints = this.generateRoadPath(allWaypoints[i], allWaypoints[i + 1]);
      if (i === 0) {
        coordinates.push(...segmentPoints);
      } else {
        coordinates.push(...segmentPoints.slice(1));
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

  generateRoadPath(from: Coordinate, to: Coordinate): Coordinate[] {
    const points: Coordinate[] = [from];

    const dLat = to.lat - from.lat;
    const dLng = to.lng - from.lng;
    const directDist = Math.sqrt(dLat * dLat + dLng * dLng);

    const perpLat = directDist > 0 ? -dLng / directDist : 0;
    const perpLng = directDist > 0 ? dLat / directDist : 0;

    const numIntermediate = 35;

    const angle = Math.atan2(dLng, dLat);
    const prefersCardinal = this.snapToCardinal(angle);

    const gridSteps = this.computeGridSteps(from, to, prefersCardinal, numIntermediate);

    for (const step of gridSteps) {
      const baseLat = from.lat + step.latRatio * dLat;
      const baseLng = from.lng + step.lngRatio * dLng;

      const offsetScale = (Math.random() - 0.5) * 2;
      const offsetMagnitude = 0.0005 + Math.random() * 0.0015;
      const curveOffset = offsetScale * offsetMagnitude;

      const lat = baseLat + perpLat * curveOffset;
      const lng = baseLng + perpLng * curveOffset;

      const altitude = this.simulateAltitude(
        step.progress,
        from.altitude,
        to.altitude,
        directDist
      );

      points.push({ lat, lng, altitude });
    }

    points.push(to);
    return points;
  }

  private snapToCardinal(angle: number): number {
    const cardinals = [0, Math.PI / 2, Math.PI, -Math.PI / 2, -Math.PI];
    let closest = cardinals[0];
    let minDiff = Math.abs(angle - closest);
    for (const c of cardinals) {
      const diff = Math.abs(angle - c);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    return closest;
  }

  private computeGridSteps(
    from: Coordinate,
    to: Coordinate,
    cardinalAngle: number,
    numSteps: number
  ): Array<{ latRatio: number; lngRatio: number; progress: number }> {
    const steps: Array<{ latRatio: number; lngRatio: number; progress: number }> = [];
    const dLat = to.lat - from.lat;
    const dLng = to.lng - from.lng;
    const absDLat = Math.abs(dLat);
    const absDLng = Math.abs(dLng);

    const ratio = absDLat + absDLng > 0 ? absDLat / (absDLat + absDLng) : 0.5;
    const primarySteps = Math.round(numSteps * ratio);
    const secondarySteps = numSteps - primarySteps;

    const primaryIsLat = absDLat >= absDLng;

    let progress = 0;

    if (primaryIsLat) {
      for (let i = 1; i <= primarySteps; i++) {
        progress = i / numSteps;
        const latRatio = Math.min(1, i / primarySteps);
        const lngRatio = 0;
        steps.push({ latRatio, lngRatio, progress });
      }
      for (let i = 1; i <= secondarySteps; i++) {
        progress = (primarySteps + i) / numSteps;
        const latRatio = 1;
        const lngRatio = i / secondarySteps;
        steps.push({ latRatio, lngRatio, progress });
      }
    } else {
      for (let i = 1; i <= secondarySteps; i++) {
        progress = i / numSteps;
        const latRatio = 0;
        const lngRatio = Math.min(1, i / secondarySteps);
        steps.push({ latRatio, lngRatio, progress });
      }
      for (let i = 1; i <= primarySteps; i++) {
        progress = (secondarySteps + i) / numSteps;
        const latRatio = i / primarySteps;
        const lngRatio = 1;
        steps.push({ latRatio, lngRatio, progress });
      }
    }

    return steps;
  }

  private simulateAltitude(
    progress: number,
    startAlt: number,
    endAlt: number,
    distance: number
  ): number {
    const baseAlt = startAlt + (endAlt - startAlt) * progress;
    const hillFreq1 = 2 + distance * 500;
    const hillFreq2 = 5 + distance * 300;
    const hill1 = Math.sin(progress * Math.PI * hillFreq1) * 15;
    const hill2 = Math.sin(progress * Math.PI * hillFreq2 + 1.2) * 8;
    const smallVar = Math.sin(progress * Math.PI * 20) * 2;
    return Math.round((baseAlt + hill1 + hill2 + smallVar) * 10) / 10;
  }

  getWaypointCoordinates(route: PlannedRoute): Coordinate[] {
    const { start, vias, end } = route.waypoints;
    return [start, ...vias, end];
  }
}

export const routePlanner = new RoutePlanner();
export { RoutePlanner };
