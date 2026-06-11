import { Vec3, vec3, vec3Normalize, vec3Sub, vec3Dot } from '../math/vector';
import { Mat4, mat4Identity, mat4Multiply, mat4Translate, mat4RotateY, mat4RotateX, mat4Scale, mat4Perspective, mat4LookAt, mat4TransformPoint, mat4TransformNormal } from '../math/matrix';
import { Color, colorToRgba, colorMultiply, colorLerp, ColorPresets } from '../math/color';

export interface Camera {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  near: number;
  far: number;
}

export interface Light {
  position: Vec3;
  color: Color;
  intensity: number;
  ambient: number;
}

export interface Material {
  color: Color;
  metalness: number;
  roughness: number;
  emissive: number;
  transparent: boolean;
  opacity: number;
}

export interface RenderFace {
  projectedPoints: { x: number; y: number }[];
  averageZ: number;
  normal: Vec3;
  color: Color;
  material: Material;
  objectId: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private zBuffer: Float32Array | null = null;
  private idBuffer: Int32Array | null = null;
  private imageData: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.floor(rect.width * dpr);
    this.height = Math.floor(rect.height * dpr);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.zBuffer = new Float32Array(this.width * this.height);
    this.idBuffer = new Int32Array(this.width * this.height);
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  getPixelId(x: number, y: number): number {
    if (!this.idBuffer) return -1;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.floor(x * dpr);
    const py = Math.floor(y * dpr);
    if (px < 0 || px >= this.width || py < 0 || py >= this.height) return -1;
    return this.idBuffer[py * this.width + px];
  }

  clear(bgColor1: Color, bgColor2: Color, mouseX: number = 0.5, mouseY: number = 0.5): void {
    if (this.zBuffer) {
      this.zBuffer.fill(Infinity);
    }
    if (this.idBuffer) {
      this.idBuffer.fill(-1);
    }

    const gradient = this.ctx.createRadialGradient(
      this.width * (0.5 + mouseX * 0.3),
      this.height * (0.4 + mouseY * 0.2),
      0,
      this.width * (0.5 + mouseX * 0.3),
      this.height * (0.4 + mouseY * 0.2),
      Math.max(this.width, this.height) * 0.8
    );
    gradient.addColorStop(0, colorToRgba(bgColor1));
    gradient.addColorStop(1, colorToRgba(bgColor2));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  renderScene(
    objects: RenderObject[],
    camera: Camera,
    light: Light,
    time: number
  ): void {
    const faces: RenderFace[] = [];
    const aspect = this.width / this.height;
    const projection = mat4Perspective(camera.fov * Math.PI / 180, aspect, camera.near, camera.far);
    const view = mat4LookAt(camera.position, camera.target, camera.up);
    const vpMatrix = mat4Multiply(projection, view);

    for (let objIdx = 0; objIdx < objects.length; objIdx++) {
      const obj = objects[objIdx];
      const objFaces = this.projectObject(obj, vpMatrix, light, objIdx);
      faces.push(...objFaces);
    }

    faces.sort((a, b) => b.averageZ - a.averageZ);

    for (const face of faces) {
      this.drawFace(face);
    }
  }

  private projectObject(
    obj: RenderObject,
    vpMatrix: Mat4,
    light: Light,
    objectId: number
  ): RenderFace[] {
    const result: RenderFace[] = [];
    const modelMatrix = this.computeModelMatrix(obj);
    const mvp = mat4Multiply(vpMatrix, modelMatrix);

    const transformedVertices: { x: number; y: number; z: number; screenX: number; screenY: number }[] = [];

    for (const v of obj.geometry.vertices) {
      const worldPos = mat4TransformPoint(modelMatrix, v);
      const screenPos = mat4TransformPoint(mvp, v);

      const screenX = (screenPos.x + 1) * 0.5 * this.width;
      const screenY = (1 - screenPos.y) * 0.5 * this.height;

      transformedVertices.push({
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        screenX,
        screenY
      });
    }

    for (const face of obj.geometry.faces) {
      const faceVerts = face.vertices.map(i => transformedVertices[i]);

      if (faceVerts.some(v => v.screenX < -100 || v.screenX > this.width + 100 || v.screenY < -100 || v.screenY > this.height + 100)) {
        // continue - but still process for z-sorting
      }

      const v1 = faceVerts[0];
      const v2 = faceVerts[1];
      const v3 = faceVerts[2];
      const cross = (v2.screenX - v1.screenX) * (v3.screenY - v1.screenY) -
                    (v2.screenY - v1.screenY) * (v3.screenX - v1.screenX);
      if (cross > 0) continue;

      const worldNormal = mat4TransformNormal(modelMatrix, face.normal);
      const normalLen = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2);
      const normalizedNormal = {
        x: worldNormal.x / normalLen,
        y: worldNormal.y / normalLen,
        z: worldNormal.z / normalLen
      };

      const avgZ = faceVerts.reduce((sum, v) => sum + v.z, 0) / faceVerts.length;
      const avgPos = {
        x: faceVerts.reduce((sum, v) => sum + v.x, 0) / faceVerts.length,
        y: faceVerts.reduce((sum, v) => sum + v.y, 0) / faceVerts.length,
        z: avgZ
      };

      const litColor = this.calculateLighting(
        obj.material.color,
        normalizedNormal,
        avgPos,
        light,
        obj.material
      );

      result.push({
        projectedPoints: faceVerts.map(v => ({ x: v.screenX, y: v.screenY })),
        averageZ: avgZ,
        normal: normalizedNormal,
        color: litColor,
        material: obj.material,
        objectId
      });
    }

    return result;
  }

  private computeModelMatrix(obj: RenderObject): Mat4 {
    let m = mat4Identity();
    m = mat4Multiply(m, mat4Translate(obj.position));
    m = mat4Multiply(m, mat4RotateY(obj.rotation.y));
    m = mat4Multiply(m, mat4RotateX(obj.rotation.x));
    m = mat4Multiply(m, mat4Scale(obj.scale));
    return m;
  }

  private calculateLighting(
    baseColor: Color,
    normal: Vec3,
    position: Vec3,
    light: Light,
    material: Material
  ): Color {
    const lightDir = vec3Normalize(vec3Sub(light.position, position));
    const diff = Math.max(0, vec3Dot(normal, lightDir));

    const ambientColor = colorMultiply(baseColor, light.ambient);
    const diffuseColor = colorMultiply(baseColor, diff * light.intensity);

    let result = {
      r: ambientColor.r + diffuseColor.r,
      g: ambientColor.g + diffuseColor.g,
      b: ambientColor.b + diffuseColor.b,
      a: material.opacity
    };

    if (material.emissive > 0) {
      result.r += baseColor.r * material.emissive;
      result.g += baseColor.g * material.emissive;
      result.b += baseColor.b * material.emissive;
    }

    result.r = Math.min(1, result.r);
    result.g = Math.min(1, result.g);
    result.b = Math.min(1, result.b);

    return result;
  }

  private drawFace(face: RenderFace): void {
    const points = face.projectedPoints;
    if (points.length < 3) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();

    const fillColor = face.color;
    if (face.material.transparent) {
      this.ctx.fillStyle = colorToRgba(fillColor, fillColor.a);
    } else {
      this.ctx.fillStyle = colorToRgba(fillColor);
    }
    this.ctx.fill();

    if (face.material.roughness < 0.3) {
      this.ctx.strokeStyle = colorToRgba(colorMultiply(face.color, 1.3), 0.3);
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  drawFloor(y: number, camera: Camera, time: number): void {
    const aspect = this.width / this.height;
    const projection = mat4Perspective(camera.fov * Math.PI / 180, aspect, camera.near, camera.far);
    const view = mat4LookAt(camera.position, camera.target, camera.up);
    const vpMatrix = mat4Multiply(projection, view);

    const size = 15;
    const corners = [
      { x: -size, y, z: -size },
      { x: size, y, z: -size },
      { x: size, y, z: size },
      { x: -size, y, z: size }
    ];

    const projected = corners.map(c => {
      const p = mat4TransformPoint(vpMatrix, c);
      return {
        x: (p.x + 1) * 0.5 * this.width,
        y: (1 - p.y) * 0.5 * this.height
      };
    });

    const gradient = this.ctx.createLinearGradient(
      projected[0].x, projected[0].y,
      projected[2].x, projected[2].y
    );
    gradient.addColorStop(0, 'rgba(79, 195, 247, 0.08)');
    gradient.addColorStop(0.5, 'rgba(124, 77, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(79, 195, 247, 0.08)');

    this.ctx.beginPath();
    this.ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      this.ctx.lineTo(projected[i].x, projected[i].y);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(79, 195, 247, 0.15)';
    this.ctx.lineWidth = 0.5;

    const gridSize = 2;
    for (let i = -size; i <= size; i += gridSize) {
      const line1 = [
        mat4TransformPoint(vpMatrix, { x: i, y, z: -size }),
        mat4TransformPoint(vpMatrix, { x: i, y, z: size })
      ];
      this.ctx.beginPath();
      this.ctx.moveTo((line1[0].x + 1) * 0.5 * this.width, (1 - line1[0].y) * 0.5 * this.height);
      this.ctx.lineTo((line1[1].x + 1) * 0.5 * this.width, (1 - line1[1].y) * 0.5 * this.height);
      this.ctx.stroke();

      const line2 = [
        mat4TransformPoint(vpMatrix, { x: -size, y, z: i }),
        mat4TransformPoint(vpMatrix, { x: size, y, z: i })
      ];
      this.ctx.beginPath();
      this.ctx.moveTo((line2[0].x + 1) * 0.5 * this.width, (1 - line2[0].y) * 0.5 * this.height);
      this.ctx.lineTo((line2[1].x + 1) * 0.5 * this.width, (1 - line2[1].y) * 0.5 * this.height);
      this.ctx.stroke();
    }
  }

  drawGlow(position: Vec3, camera: Camera, color: Color, size: number = 1): void {
    const aspect = this.width / this.height;
    const projection = mat4Perspective(camera.fov * Math.PI / 180, aspect, camera.near, camera.far);
    const view = mat4LookAt(camera.position, camera.target, camera.up);
    const vpMatrix = mat4Multiply(projection, view);

    const p = mat4TransformPoint(vpMatrix, position);
    const screenX = (p.x + 1) * 0.5 * this.width;
    const screenY = (1 - p.y) * 0.5 * this.height;

    if (p.z < -1 || p.z > 1) return;

    const perspectiveScale = 1 / (p.z + 2);
    const glowSize = size * 50 * perspectiveScale;

    const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowSize);
    gradient.addColorStop(0, colorToRgba(color, 0.6));
    gradient.addColorStop(0.3, colorToRgba(color, 0.3));
    gradient.addColorStop(1, colorToRgba(color, 0));

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, glowSize, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawSelectionOutline(
    obj: RenderObject,
    camera: Camera,
    time: number,
    color1: Color,
    color2: Color
  ): void {
    const aspect = this.width / this.height;
    const projection = mat4Perspective(camera.fov * Math.PI / 180, aspect, camera.near, camera.far);
    const view = mat4LookAt(camera.position, camera.target, camera.up);
    const vpMatrix = mat4Multiply(projection, view);
    const modelMatrix = this.computeModelMatrix(obj);
    const mvp = mat4Multiply(vpMatrix, modelMatrix);

    const flash = (Math.sin(time * 1.5) + 1) * 0.5;
    const outlineColor = colorLerp(color1, color2, flash);

    const edges: [number, number][] = [];
    const verts = obj.geometry.vertices;
    const seen = new Set<string>();

    for (const face of obj.geometry.faces) {
      for (let i = 0; i < face.vertices.length; i++) {
        const a = face.vertices[i];
        const b = face.vertices[(i + 1) % face.vertices.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([a, b]);
        }
      }
    }

    this.ctx.strokeStyle = colorToRgba(outlineColor, 0.8);
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = colorToRgba(outlineColor);
    this.ctx.shadowBlur = 10;

    for (const [a, b] of edges) {
      const pa = mat4TransformPoint(mvp, verts[a]);
      const pb = mat4TransformPoint(mvp, verts[b]);

      const sx1 = (pa.x + 1) * 0.5 * this.width;
      const sy1 = (1 - pa.y) * 0.5 * this.height;
      const sx2 = (pb.x + 1) * 0.5 * this.width;
      const sy2 = (1 - pb.y) * 0.5 * this.height;

      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy1);
      this.ctx.lineTo(sx2, sy2);
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;
  }

  drawReflection(
    objects: RenderObject[],
    camera: Camera,
    light: Light,
    floorY: number,
    time: number
  ): void {
    const reflectedObjects: RenderObject[] = objects.map(obj => ({
      ...obj,
      position: { ...obj.position, y: floorY * 2 - obj.position.y },
      rotation: { ...obj.rotation, x: -obj.rotation.x },
      material: {
        ...obj.material,
        opacity: 0.15,
        transparent: true
      }
    }));

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.renderScene(reflectedObjects, camera, light, time);
    this.ctx.restore();
  }
}

export interface RenderObject {
  geometry: import('../math/geometry').Geometry;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material: Material;
  id: number;
}
