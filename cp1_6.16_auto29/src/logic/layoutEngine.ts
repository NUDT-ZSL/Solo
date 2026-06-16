import { PlacedExhibit, LayoutPosition, Waypoint, Artwork } from '../types';

export interface WallConfig {
  index: number;
  width: number;
  height: number;
  position: [number, number, number];
  normal: [number, number, number];
}

export function generateLayout(
  exhibits: Artwork[],
  wallWidth: number,
  wallHeight: number,
  wallNormal: [number, number, number] = [0, 0, -1],
  wallPosition: [number, number, number] = [0, 0, 0]
): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  const padding = 1;
  const verticalCenter = wallHeight / 2;
  const availableWidth = wallWidth - padding * 2;

  let totalWidth = 0;
  exhibits.forEach(artwork => {
    totalWidth += artwork.width + padding;
  });
  if (exhibits.length > 0) {
    totalWidth -= padding;
  }

  let startX = -totalWidth / 2;

  exhibits.forEach((artwork) => {
    const x = startX + artwork.width / 2;
    const y = verticalCenter - artwork.height / 2;
    const z = 0.05;

    const worldX = wallPosition[0] + x * Math.abs(wallNormal[2]);
    const worldY = wallPosition[1] + y;
    const worldZ = wallPosition[2] + z * wallNormal[2] * -1;

    positions.push({
      x: worldX,
      y: worldY,
      z: worldZ
    });

    startX += artwork.width + padding;
  });

  return positions;
}

export function generateZigzagPath(
  exhibits: PlacedExhibit[],
  roomSize: { width: number; depth: number; height: number } = { width: 20, depth: 20, height: 6 },
  waypointSpacing: number = 2
): Waypoint[] {
  if (exhibits.length === 0) {
    return [
      { position: [0, roomSize.height / 2, roomSize.depth / 2 - 1] }
    ];
  }

  const sortedExhibits = [...exhibits].sort((a, b) => {
    if (a.wallIndex !== b.wallIndex) return a.wallIndex - b.wallIndex;
    return a.positionX - b.positionX;
  });

  const waypoints: Waypoint[] = [];
  const viewerHeight = roomSize.height / 2;
  const viewerDistance = 3;

  const groupedByWall = new Map<number, PlacedExhibit[]>();
  sortedExhibits.forEach(exhibit => {
    const group = groupedByWall.get(exhibit.wallIndex) || [];
    group.push(exhibit);
    groupedByWall.set(exhibit.wallIndex, group);
  });

  let wallIndex = 0;
  const wallCount = 3;
  const wallIndices = Array.from(groupedByWall.keys()).sort((a, b) => a - b);

  wallIndices.forEach((wIdx) => {
    const wallExhibits = groupedByWall.get(wIdx)!;
    const sorted = [...wallExhibits].sort((a, b) => a.positionX - b.positionX);

    if (wallIndex % 2 === 1) {
      sorted.reverse();
    }

    sorted.forEach((exhibit) => {
      let viewX = exhibit.positionX;
      let viewZ = exhibit.positionZ;

      switch (wIdx) {
        case 0:
          viewZ = exhibit.positionZ + viewerDistance;
          break;
        case 1:
          viewX = exhibit.positionX - viewerDistance;
          break;
        case 2:
          viewZ = exhibit.positionZ - viewerDistance;
          break;
      }

      waypoints.push({
        position: [viewX, viewerHeight, viewZ],
        targetExhibitId: exhibit.exhibitId
      });
    });

    wallIndex++;
  });

  return waypoints;
}

export function generateSmoothPath(waypoints: Waypoint[]): THREE.CatmullRomCurve3 | null {
  if (waypoints.length < 2) return null;

  const points = waypoints.map(wp =>
    new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2])
  );

  const curve = new (require('three') as typeof import('three')).CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  curve.curveType = 'catmullrom';
  curve.tension = 0.5;

  return curve as any;
}

export function calculatePathPointCount(
  waypoints: Waypoint[],
  spacing: number = 2
): number {
  if (waypoints.length < 2) return 1;

  let totalLength = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].position[0] - waypoints[i - 1].position[0];
    const dy = waypoints[i].position[1] - waypoints[i - 1].position[1];
    const dz = waypoints[i].position[2] - waypoints[i - 1].position[2];
    totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return Math.max(Math.floor(totalLength / spacing), waypoints.length);
}
