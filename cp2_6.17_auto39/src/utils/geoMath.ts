import * as THREE from 'three';
import type { RoutePoint } from '../types';

export const GLOBE_RADIUS = 5;

export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function pointToVec3(p: RoutePoint, radius = GLOBE_RADIUS): THREE.Vector3 {
  return latLngToVector3(p.lat, p.lng, radius);
}

export function haversineDistance(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function computeArcHeight(distanceKm: number): number {
  const min = 0.2;
  const max = 1.5;
  const t = Math.min(1, distanceKm / 16000);
  return min + (max - min) * Math.pow(t, 0.7);
}

export function createBezierCurve(
  from: RoutePoint,
  to: RoutePoint,
  arcHeight: number,
  segments = 80
): THREE.Vector3[] {
  const start = pointToVec3(from);
  const end = pointToVec3(to);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const midLen = mid.length();
  if (midLen < 0.001) {
    mid.set(0, GLOBE_RADIUS + arcHeight, 0);
  } else {
    mid.normalize().multiplyScalar(GLOBE_RADIUS + arcHeight);
  }
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  return curve.getPoints(segments);
}

export function regionFromPoint(p: RoutePoint): string {
  const { lat, lng } = p;
  if (lat > 30 && lng > 100) return '东亚';
  if (lat > 0 && lng > 60 && lng < 100) return '南亚';
  if (lat < 10 && lat > -10 && lng > 90 && lng < 130) return '东南亚';
  if (lat < -10 && lng > 110) return '澳洲';
  if (lat > 35 && lng < 40 && lng > -10) return '欧洲';
  if (lat > 10 && lng > -10 && lng < 40) return '中东';
  if (lat < 35 && lat > 10 && lng < -70 && lng > -125) return '北美';
  if (lat < 10 && lng < -35) return '南美';
  if (lat < 0 && lng > 10 && lng < 40) return '南非';
  return '其他';
}

export function greatCircleMidpoint(a: RoutePoint, b: RoutePoint): RoutePoint {
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2
  };
}
