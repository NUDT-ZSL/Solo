import { Vec3 } from './vector';

export interface Face {
  vertices: number[];
  normal: Vec3;
}

export interface Geometry {
  vertices: Vec3[];
  faces: Face[];
  type: string;
}

export function createCube(size: number = 1): Geometry {
  const s = size / 2;
  const vertices: Vec3[] = [
    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
    { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
    { x: s, y: s, z: s }, { x: -s, y: s, z: s }
  ];

  const faces: Face[] = [
    { vertices: [0, 1, 2, 3], normal: { x: 0, y: 0, z: -1 } },
    { vertices: [5, 4, 7, 6], normal: { x: 0, y: 0, z: 1 } },
    { vertices: [4, 0, 3, 7], normal: { x: -1, y: 0, z: 0 } },
    { vertices: [1, 5, 6, 2], normal: { x: 1, y: 0, z: 0 } },
    { vertices: [3, 2, 6, 7], normal: { x: 0, y: 1, z: 0 } },
    { vertices: [4, 5, 1, 0], normal: { x: 0, y: -1, z: 0 } }
  ];

  return { vertices, faces, type: 'cube' };
}

export function createSphere(radius: number = 0.5, segments: number = 12): Geometry {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];

  for (let lat = 0; lat <= segments; lat++) {
    const theta = lat * Math.PI / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= segments; lon++) {
      const phi = lon * 2 * Math.PI / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      vertices.push({
        x: radius * sinTheta * cosPhi,
        y: radius * cosTheta,
        z: radius * sinTheta * sinPhi
      });
    }
  }

  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;

      const v1 = vertices[first];
      const v2 = vertices[second];
      const v3 = vertices[first + 1];
      const v4 = vertices[second + 1];

      const normal1 = calculateFaceNormal(v1, v2, v3);
      faces.push({
        vertices: [first, second, first + 1],
        normal: normal1
      });

      const normal2 = calculateFaceNormal(v2, v4, v3);
      faces.push({
        vertices: [second, second + 1, first + 1],
        normal: normal2
      });
    }
  }

  return { vertices, faces, type: 'sphere' };
}

export function createCone(radius: number = 0.5, height: number = 1, segments: number = 12): Geometry {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];

  vertices.push({ x: 0, y: height / 2, z: 0 });

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push({
      x: radius * Math.cos(angle),
      y: -height / 2,
      z: radius * Math.sin(angle)
    });
  }

  for (let i = 1; i <= segments; i++) {
    const v1 = vertices[0];
    const v2 = vertices[i];
    const v3 = vertices[i + 1];
    faces.push({
      vertices: [0, i, i + 1],
      normal: calculateFaceNormal(v1, v2, v3)
    });
  }

  const bottomVertices: number[] = [];
  for (let i = segments; i >= 1; i--) {
    bottomVertices.push(i);
  }
  const bottomFaceVerts = bottomVertices.map(i => vertices[i]);
  faces.push({
    vertices: bottomVertices,
    normal: { x: 0, y: -1, z: 0 }
  });

  return { vertices, faces, type: 'cone' };
}

export function createCylinder(radius: number = 0.5, height: number = 1, segments: number = 12): Geometry {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];

  const halfHeight = height / 2;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    vertices.push({ x, y: halfHeight, z });
    vertices.push({ x, y: -halfHeight, z });
  }

  for (let i = 0; i < segments; i++) {
    const i0 = i * 2;
    const i1 = i * 2 + 1;
    const i2 = (i + 1) * 2;
    const i3 = (i + 1) * 2 + 1;

    const v1 = vertices[i0];
    const v2 = vertices[i1];
    const v3 = vertices[i2];
    const v4 = vertices[i3];

    faces.push({
      vertices: [i0, i1, i3, i2],
      normal: calculateFaceNormal(v1, v2, v3)
    });
  }

  const topCenterIdx = vertices.length;
  vertices.push({ x: 0, y: halfHeight, z: 0 });
  for (let i = 0; i < segments; i++) {
    const i0 = i * 2;
    const i2 = (i + 1) * 2;
    faces.push({
      vertices: [topCenterIdx, i2, i0],
      normal: { x: 0, y: 1, z: 0 }
    });
  }

  const bottomCenterIdx = vertices.length;
  vertices.push({ x: 0, y: -halfHeight, z: 0 });
  for (let i = 0; i < segments; i++) {
    const i1 = i * 2 + 1;
    const i3 = (i + 1) * 2 + 1;
    faces.push({
      vertices: [bottomCenterIdx, i1, i3],
      normal: { x: 0, y: -1, z: 0 }
    });
  }

  return { vertices, faces, type: 'cylinder' };
}

export function createTorus(majorRadius: number = 0.6, minorRadius: number = 0.2, segments: number = 16, rings: number = 12): Geometry {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j <= rings; j++) {
      const v = (j / rings) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      vertices.push({
        x: (majorRadius + minorRadius * cosV) * cosU,
        y: minorRadius * sinV,
        z: (majorRadius + minorRadius * cosV) * sinU
      });
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rings; j++) {
      const a = i * (rings + 1) + j;
      const b = a + rings + 1;
      const c = a + 1;
      const d = b + 1;

      const v1 = vertices[a];
      const v2 = vertices[b];
      const v3 = vertices[c];
      const v4 = vertices[d];

      faces.push({
        vertices: [a, b, d, c],
        normal: calculateFaceNormal(v1, v2, v3)
      });
    }
  }

  return { vertices, faces, type: 'torus' };
}

export function createOctahedron(size: number = 0.6): Geometry {
  const s = size;
  const vertices: Vec3[] = [
    { x: 0, y: s, z: 0 },
    { x: 0, y: -s, z: 0 },
    { x: s, y: 0, z: 0 },
    { x: -s, y: 0, z: 0 },
    { x: 0, y: 0, z: s },
    { x: 0, y: 0, z: -s }
  ];

  const faces: Face[] = [
    { vertices: [0, 2, 4], normal: calculateFaceNormal(vertices[0], vertices[2], vertices[4]) },
    { vertices: [0, 4, 3], normal: calculateFaceNormal(vertices[0], vertices[4], vertices[3]) },
    { vertices: [0, 3, 5], normal: calculateFaceNormal(vertices[0], vertices[3], vertices[5]) },
    { vertices: [0, 5, 2], normal: calculateFaceNormal(vertices[0], vertices[5], vertices[2]) },
    { vertices: [1, 4, 2], normal: calculateFaceNormal(vertices[1], vertices[4], vertices[2]) },
    { vertices: [1, 3, 4], normal: calculateFaceNormal(vertices[1], vertices[3], vertices[4]) },
    { vertices: [1, 5, 3], normal: calculateFaceNormal(vertices[1], vertices[5], vertices[3]) },
    { vertices: [1, 2, 5], normal: calculateFaceNormal(vertices[1], vertices[2], vertices[5]) }
  ];

  return { vertices, faces, type: 'octahedron' };
}

function calculateFaceNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  const ax = v2.x - v1.x;
  const ay = v2.y - v1.y;
  const az = v2.z - v1.z;

  const bx = v3.x - v1.x;
  const by = v3.y - v1.y;
  const bz = v3.z - v1.z;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return { x: 0, y: 1, z: 0 };

  return { x: nx / len, y: ny / len, z: nz / len };
}
