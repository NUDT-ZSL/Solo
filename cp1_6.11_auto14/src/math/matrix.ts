import { Vec3, vec3 } from './vector';

export type Mat4 = Float32Array;

export function mat4Identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = 1; m[4] = 0; m[8] = 0; m[12] = 0;
  m[1] = 0; m[5] = 1; m[9] = 0; m[13] = 0;
  m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
  m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
  return m;
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[j * 4 + i] =
        a[i] * b[j * 4] +
        a[4 + i] * b[j * 4 + 1] +
        a[8 + i] * b[j * 4 + 2] +
        a[12 + i] * b[j * 4 + 3];
    }
  }
  return result;
}

export function mat4Translate(v: Vec3): Mat4 {
  const m = mat4Identity();
  m[12] = v.x;
  m[13] = v.y;
  m[14] = v.z;
  return m;
}

export function mat4Scale(v: Vec3): Mat4 {
  const m = mat4Identity();
  m[0] = v.x;
  m[5] = v.y;
  m[10] = v.z;
  return m;
}

export function mat4RotateX(angle: number): Mat4 {
  const m = mat4Identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

export function mat4RotateY(angle: number): Mat4 {
  const m = mat4Identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

export function mat4RotateZ(angle: number): Mat4 {
  const m = mat4Identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

export function mat4Perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
  const m = new Float32Array(16);
  const f = 1.0 / Math.tan(fov / 2);
  m[0] = f / aspect;
  m[1] = 0;
  m[2] = 0;
  m[3] = 0;
  m[4] = 0;
  m[5] = f;
  m[6] = 0;
  m[7] = 0;
  m[8] = 0;
  m[9] = 0;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[12] = 0;
  m[13] = 0;
  m[14] = (2 * far * near) / (near - far);
  m[15] = 0;
  return m;
}

export function mat4LookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const z = normalize({
    x: eye.x - center.x,
    y: eye.y - center.y,
    z: eye.z - center.z
  });
  const x = normalize(cross(up, z));
  const y = cross(z, x);

  const m = new Float32Array(16);
  m[0] = x.x;
  m[1] = y.x;
  m[2] = z.x;
  m[3] = 0;
  m[4] = x.y;
  m[5] = y.y;
  m[6] = z.y;
  m[7] = 0;
  m[8] = x.z;
  m[9] = y.z;
  m[10] = z.z;
  m[11] = 0;
  m[12] = -dot(x, eye);
  m[13] = -dot(y, eye);
  m[14] = -dot(z, eye);
  m[15] = 1;
  return m;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return vec3(0, 0, 0);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function mat4TransformPoint(m: Mat4, p: Vec3): Vec3 {
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
  return {
    x: (m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12]) / w,
    y: (m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13]) / w,
    z: (m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14]) / w
  };
}

export function mat4TransformNormal(m: Mat4, n: Vec3): Vec3 {
  return {
    x: m[0] * n.x + m[4] * n.y + m[8] * n.z,
    y: m[1] * n.x + m[5] * n.y + m[9] * n.z,
    z: m[2] * n.x + m[6] * n.y + m[10] * n.z
  };
}

export function mat4Invert(m: Mat4): Mat4 {
  const inv = new Float32Array(16);
  
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
           m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
           m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
           m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];

  let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (det === 0) return mat4Identity();
  det = 1.0 / det;

  for (let i = 0; i < 16; i++) {
    inv[i] *= det;
  }

  return inv;
}
