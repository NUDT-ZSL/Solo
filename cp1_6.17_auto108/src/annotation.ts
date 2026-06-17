import * as THREE from 'three';

export type AnnotationType = 'point' | 'line' | 'polygon';

export interface AnnotationStyle {
  color: string;
  opacity: number;
  lineWidth?: number;
  fillColor?: string;
}

export interface PointData {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number, number?];
  style: AnnotationStyle;
}

export interface LineData {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number, number?][];
  style: AnnotationStyle;
}

export interface PolygonData {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number, number?][];
  style: AnnotationStyle;
}

export type AnnotationData = PointData | LineData | PolygonData;

export interface ParsedAnnotations {
  fileName: string;
  points: PointData[];
  lines: LineData[];
  polygons: PolygonData[];
}

const DEFAULT_POINT_STYLE: AnnotationStyle = {
  color: '#FFD700',
  opacity: 1.0
};

const DEFAULT_LINE_STYLE: AnnotationStyle = {
  color: '#FF4500',
  opacity: 1.0,
  lineWidth: 0.05
};

const DEFAULT_POLYGON_STYLE: AnnotationStyle = {
  color: '#FF4500',
  opacity: 1.0,
  lineWidth: 0.05,
  fillColor: '#3B82F6'
};

export const COLOR_PALETTE = [
  '#FF4500',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#FFFFFF'
];

export class AnnotationParser {
  private idCounter: number = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${this.idCounter++}`;
  }

  public async parseFile(file: File): Promise<ParsedAnnotations> {
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'kmz') {
      const kmlContent = await this.extractKMZ(file);
      return this.parseKML(kmlContent, fileName);
    } else if (ext === 'kml') {
      const kmlContent = await file.text();
      return this.parseKML(kmlContent, fileName);
    } else {
      throw new Error('不支持的文件格式，请上传KML或KMZ文件');
    }
  }

  private async extractKMZ(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zipData = this.parseZIP(arrayBuffer);
      const kmlEntry = zipData.find((entry: { name: string }) => 
        entry.name.toLowerCase().endsWith('.kml')
      );
      if (!kmlEntry) {
        throw new Error('KMZ文件中未找到KML文档');
      }
      return new TextDecoder('utf-8').decode(kmlEntry.data);
    } catch (e) {
      throw new Error('KMZ文件解析失败: ' + (e as Error).message);
    }
  }

  private parseZIP(arrayBuffer: ArrayBuffer): Array<{ name: string; data: Uint8Array }> {
    const view = new DataView(arrayBuffer);
    const files: Array<{ name: string; data: Uint8Array }> = [];
    let offset = 0;

    while (offset < view.byteLength) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x04034b50) break;

      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const compressionMethod = view.getUint16(offset + 8, true);
      const name = new TextDecoder('utf-8').decode(
        new Uint8Array(arrayBuffer, offset + 30, nameLength)
      );

      let dataOffset = offset + 30 + nameLength + extraLength;
      let data: Uint8Array;

      if (compressionMethod === 0) {
        data = new Uint8Array(arrayBuffer, dataOffset, compressedSize);
      } else if (compressionMethod === 8) {
        try {
          const compressedData = new Uint8Array(arrayBuffer, dataOffset, compressedSize);
          const ds = new DecompressionStream('deflate-raw');
          const writer = (ds as any).writable.getWriter();
          const reader = (ds as any).readable.getReader();
          writer.write(compressedData);
          writer.close();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          data = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
          let pos = 0;
          for (const c of chunks) {
            data.set(c, pos);
            pos += c.length;
          }
        } catch {
          data = new Uint8Array(arrayBuffer, dataOffset, compressedSize);
        }
      } else {
        data = new Uint8Array(arrayBuffer, dataOffset, compressedSize);
      }

      files.push({ name, data });
      offset = dataOffset + compressedSize;
    }

    return files;
  }

  private parseKML(kmlContent: string, fileName: string): ParsedAnnotations {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('KML文件格式错误');
    }

    const result: ParsedAnnotations = {
      fileName,
      points: [],
      lines: [],
      polygons: []
    };

    const styles = this.parseStyles(xmlDoc);
    const pointPlacemarks = xmlDoc.querySelectorAll('Placemark:has(Point), Placemark');
    
    const placemarks = xmlDoc.querySelectorAll('Placemark');
    placemarks.forEach((placemark) => {
      const name = this.getTextContent(placemark, 'name') || '未命名';
      const description = this.getTextContent(placemark, 'description') || '';
      const styleUrl = this.getTextContent(placemark, 'styleUrl');
      const inlineStyle = this.parseInlineStyle(placemark);
      const style = inlineStyle || styles[styleUrl] || null;

      const point = placemark.querySelector('Point');
      const lineString = placemark.querySelector('LineString');
      const polygon = placemark.querySelector('Polygon');

      if (point) {
        const coordText = this.getTextContent(point, 'coordinates') || '';
        const coords = this.parseCoordinates(coordText);
        if (coords.length > 0) {
          const pointStyle = style?.point || DEFAULT_POINT_STYLE;
          result.points.push({
            id: this.generateId('point'),
            name,
            description,
            coordinates: coords[0],
            style: { ...DEFAULT_POINT_STYLE, ...pointStyle }
          });
        }
      }

      if (lineString) {
        const coordText = this.getTextContent(lineString, 'coordinates') || '';
        const coords = this.parseCoordinates(coordText);
        if (coords.length > 1) {
          const lineStyle = style?.line || DEFAULT_LINE_STYLE;
          result.lines.push({
            id: this.generateId('line'),
            name,
            description,
            coordinates: coords,
            style: { ...DEFAULT_LINE_STYLE, ...lineStyle }
          });
        }
      }

      if (polygon) {
        const outerRing = polygon.querySelector('outerBoundaryIs LinearRing');
        if (outerRing) {
          const coordText = this.getTextContent(outerRing, 'coordinates') || '';
          const coords = this.parseCoordinates(coordText);
          if (coords.length > 2) {
            const polyStyle = {
              ...DEFAULT_POLYGON_STYLE,
              ...(style?.polygon || {}),
              ...(style?.line || {}),
              ...(style?.fill || {})
            };
            result.polygons.push({
              id: this.generateId('polygon'),
              name,
              description,
              coordinates: coords,
              style: { ...DEFAULT_POLYGON_STYLE, ...polyStyle }
            });
          }
        }
      }
    });

    return result;
  }

  private parseStyles(xmlDoc: XMLDocument): Record<string, any> {
    const styles: Record<string, any> = {};
    const styleMaps: Record<string, string> = {};

    xmlDoc.querySelectorAll('StyleMap').forEach((styleMap) => {
      const id = styleMap.getAttribute('id') || '';
      const pair = styleMap.querySelector('Pair[key="normal"] styleUrl');
      if (pair) {
        styleMaps['#' + id] = (pair.textContent || '').trim();
      }
    });

    xmlDoc.querySelectorAll('Style').forEach((styleEl) => {
      const id = '#' + (styleEl.getAttribute('id') || '');
      const style: any = {};

      const iconStyle = styleEl.querySelector('IconStyle');
      if (iconStyle) {
        const color = this.parseKMLColor(this.getTextContent(iconStyle, 'color'));
        style.point = {
          color: color || DEFAULT_POINT_STYLE.color,
          opacity: color ? this.getKMLColorOpacity(this.getTextContent(iconStyle, 'color')) : DEFAULT_POINT_STYLE.opacity
        };
      }

      const lineStyle = styleEl.querySelector('LineStyle');
      if (lineStyle) {
        const color = this.parseKMLColor(this.getTextContent(lineStyle, 'color'));
        const width = parseFloat(this.getTextContent(lineStyle, 'width') || '');
        style.line = {
          color: color || DEFAULT_LINE_STYLE.color,
          opacity: color ? this.getKMLColorOpacity(this.getTextContent(lineStyle, 'color')) : DEFAULT_LINE_STYLE.opacity,
          lineWidth: isNaN(width) ? DEFAULT_LINE_STYLE.lineWidth : Math.max(0.02, Math.min(0.2, width * 0.01))
        };
      }

      const polyStyle = styleEl.querySelector('PolyStyle');
      if (polyStyle) {
        const color = this.parseKMLColor(this.getTextContent(polyStyle, 'color'));
        style.polygon = {
          fillColor: color || DEFAULT_POLYGON_STYLE.fillColor,
          opacity: color ? this.getKMLColorOpacity(this.getTextContent(polyStyle, 'color')) : 0.3
        };
      }

      styles[id] = style;
    });

    Object.keys(styleMaps).forEach((mapId) => {
      const targetId = styleMaps[mapId];
      if (styles[targetId]) {
        styles[mapId] = styles[targetId];
      }
    });

    return styles;
  }

  private parseInlineStyle(placemark: Element): any {
    const styleEl = placemark.querySelector('Style');
    if (!styleEl) return null;

    const tempDoc = document.implementation.createDocument('', '', null);
    const wrapper = tempDoc.createElement('root');
    wrapper.appendChild(styleEl.cloneNode(true));
    tempDoc.appendChild(wrapper);

    const styles = this.parseStyles(tempDoc);
    return Object.values(styles)[0] || null;
  }

  private parseKMLColor(colorStr: string): string | null {
    if (!colorStr) return null;
    const cleaned = colorStr.trim().replace('#', '');
    if (cleaned.length !== 8) return null;
    const aabbggrr = cleaned.match(/.{2}/g);
    if (!aabbggrr) return null;
    const [, bb, gg, rr] = aabbggrr;
    return `#${rr}${gg}${bb}`.toUpperCase();
  }

  private getKMLColorOpacity(colorStr: string): number {
    if (!colorStr) return 1.0;
    const cleaned = colorStr.trim().replace('#', '');
    if (cleaned.length !== 8) return 1.0;
    const aa = parseInt(cleaned.substring(0, 2), 16);
    return aa / 255;
  }

  private getTextContent(parent: Element, tagName: string): string {
    const el = parent.getElementsByTagName(tagName)[0];
    return (el?.textContent || '').trim();
  }

  private parseCoordinates(coordText: string): [number, number, number?][] {
    const result: [number, number, number?][] = [];
    const tokens = coordText.replace(/\s+/g, ' ').trim().split(' ');
    for (const token of tokens) {
      const parts = token.split(',').map(s => parseFloat(s));
      if (parts.length >= 2 && !parts.some(isNaN)) {
        if (parts.length >= 3) {
          result.push([parts[0], parts[1], parts[2]]);
        } else {
          result.push([parts[0], parts[1]]);
        }
      }
    }
    return result;
  }
}

export interface AnnotationRenderOptions {
  getTerrainHeight: (x: number, z: number) => number;
  terrainSize: number;
}

export class AnnotationRenderer {
  private options: AnnotationRenderOptions;
  private meshMap: Map<string, THREE.Object3D> = new Map();
  private dataMap: Map<string, AnnotationData> = new Map();

  constructor(options: AnnotationRenderOptions) {
    this.options = options;
  }

  public createAnnotationGroup(parsed: ParsedAnnotations): THREE.Group {
    const group = new THREE.Group();
    group.name = parsed.fileName;
    group.userData.fileName = parsed.fileName;

    const bounds = this.calculateBounds(parsed);
    const center = this.getBoundsCenter(bounds);
    const scale = this.calculateScale(bounds);

    parsed.points.forEach((data) => {
      const mesh = this.createPointMesh(data, center, scale);
      if (mesh) {
        this.meshMap.set(data.id, mesh);
        this.dataMap.set(data.id, data);
        group.add(mesh);
      }
    });

    parsed.lines.forEach((data) => {
      const mesh = this.createLineMesh(data, center, scale);
      if (mesh) {
        this.meshMap.set(data.id, mesh);
        this.dataMap.set(data.id, data);
        group.add(mesh);
      }
    });

    parsed.polygons.forEach((data) => {
      const mesh = this.createPolygonMesh(data, center, scale);
      if (mesh) {
        this.meshMap.set(data.id, mesh);
        this.dataMap.set(data.id, data);
        group.add(mesh);
      }
    });

    return group;
  }

  private calculateBounds(parsed: ParsedAnnotations): { min: [number, number]; max: [number, number] } {
    const allCoords: [number, number][] = [];
    parsed.points.forEach(p => allCoords.push([p.coordinates[0], p.coordinates[1]]));
    parsed.lines.forEach(l => l.coordinates.forEach(c => allCoords.push([c[0], c[1]])));
    parsed.polygons.forEach(p => p.coordinates.forEach(c => allCoords.push([c[0], c[1]])));

    if (allCoords.length === 0) {
      return { min: [0, 0], max: [1, 1] };
    }

    const min: [number, number] = [Infinity, Infinity];
    const max: [number, number] = [-Infinity, -Infinity];
    allCoords.forEach(([lon, lat]) => {
      if (lon < min[0]) min[0] = lon;
      if (lat < min[1]) min[1] = lat;
      if (lon > max[0]) max[0] = lon;
      if (lat > max[1]) max[1] = lat;
    });

    if (min[0] === max[0]) {
      min[0] -= 0.01;
      max[0] += 0.01;
    }
    if (min[1] === max[1]) {
      min[1] -= 0.01;
      max[1] += 0.01;
    }

    return { min, max };
  }

  private getBoundsCenter(bounds: { min: [number, number]; max: [number, number] }): [number, number] {
    return [
      (bounds.min[0] + bounds.max[0]) / 2,
      (bounds.min[1] + bounds.max[1]) / 2
    ];
  }

  private calculateScale(bounds: { min: [number, number]; max: [number, number] }): number {
    const size = this.options.terrainSize * 0.8;
    const lonSpan = bounds.max[0] - bounds.min[0];
    const latSpan = bounds.max[1] - bounds.min[1];
    const maxSpan = Math.max(lonSpan, latSpan);
    return size / maxSpan;
  }

  private lonLatToPosition(lon: number, lat: number, center: [number, number], scale: number): [number, number] {
    const x = (lon - center[0]) * scale;
    const z = -(lat - center[1]) * scale;
    return [x, z];
  }

  private createPointMesh(data: PointData, center: [number, number], scale: number): THREE.Object3D | null {
    const [lon, lat] = data.coordinates;
    const [x, z] = this.lonLatToPosition(lon, lat, center, scale);
    const y = this.options.getTerrainHeight(x, z) + 0.3;

    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(data.style.color),
      transparent: true,
      opacity: data.style.opacity,
      shininess: 50,
      emissive: new THREE.Color(data.style.color).multiplyScalar(0.3)
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.userData = { annotationId: data.id, annotationType: 'point' };

    const ringGeom = new THREE.RingGeometry(0.25, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.style.color),
      transparent: true,
      opacity: data.style.opacity * 0.6,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    mesh.add(ring);

    return mesh;
  }

  private createLineMesh(data: LineData, center: [number, number], scale: number): THREE.Object3D | null {
    const points: THREE.Vector3[] = [];
    const halfTerrain = this.options.terrainSize / 2;

    data.coordinates.forEach(([lon, lat]) => {
      const [x, z] = this.lonLatToPosition(lon, lat, center, scale);
      const clampedX = Math.max(-halfTerrain + 0.1, Math.min(halfTerrain - 0.1, x));
      const clampedZ = Math.max(-halfTerrain + 0.1, Math.min(halfTerrain - 0.1, z));
      const y = this.options.getTerrainHeight(clampedX, clampedZ) + 0.1;
      points.push(new THREE.Vector3(clampedX, y, clampedZ));
    });

    if (points.length < 2) return null;

    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color(data.style.color);
    const width = data.style.lineWidth || DEFAULT_LINE_STYLE.lineWidth!;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      if (len < 0.0001) continue;
      dir.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const perp = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(width / 2);

      const v1 = p1.clone().add(perp);
      const v2 = p1.clone().sub(perp);
      const v3 = p2.clone().add(perp);
      const v4 = p2.clone().sub(perp);

      positions.push(
        v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
        v2.x, v2.y, v2.z, v4.x, v4.y, v4.z, v3.x, v3.y, v3.z
      );
      for (let j = 0; j < 6; j++) {
        colors.push(color.r, color.g, color.b);
      }
    }

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: data.style.opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { annotationId: data.id, annotationType: 'line' };
    return mesh;
  }

  private createPolygonMesh(data: PolygonData, center: [number, number], scale: number): THREE.Group | null {
    const group = new THREE.Group();
    const halfTerrain = this.options.terrainSize / 2;

    const shapePoints: THREE.Vector3[] = [];
    data.coordinates.forEach(([lon, lat]) => {
      const [x, z] = this.lonLatToPosition(lon, lat, center, scale);
      const clampedX = Math.max(-halfTerrain + 0.1, Math.min(halfTerrain - 0.1, x));
      const clampedZ = Math.max(-halfTerrain + 0.1, Math.min(halfTerrain - 0.1, z));
      shapePoints.push(new THREE.Vector3(clampedX, 0, clampedZ));
    });

    if (shapePoints.length < 3) return null;

    const shape = new THREE.Shape();
    shape.moveTo(shapePoints[0].x, shapePoints[0].z);
    for (let i = 1; i < shapePoints.length; i++) {
      shape.lineTo(shapePoints[i].x, shapePoints[i].z);
    }
    shape.closePath();

    const fillGeom = new THREE.ShapeGeometry(shape);
    const fillPositions = fillGeom.attributes.position;
    const fillColors: number[] = [];
    const fillColor = new THREE.Color(data.style.fillColor || DEFAULT_POLYGON_STYLE.fillColor!);

    for (let i = 0; i < fillPositions.count; i++) {
      const x = fillPositions.getX(i);
      const z = fillPositions.getY(i);
      const y = this.options.getTerrainHeight(x, z) + 0.05;
      fillPositions.setXYZ(i, x, y, z);
      fillColors.push(fillColor.r, fillColor.g, fillColor.b);
    }
    fillGeom.setAttribute('color', new THREE.Float32BufferAttribute(fillColors, 3));
    fillGeom.computeVertexNormals();

    const fillMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: data.style.opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fillMesh = new THREE.Mesh(fillGeom, fillMat);
    fillMesh.userData = { annotationId: data.id, annotationType: 'polygon' };
    group.add(fillMesh);

    const outlinePts: THREE.Vector3[] = [];
    data.coordinates.forEach(([lon, lat]) => {
      const [x, z] = this.lonLatToPosition(lon, lat, center, scale);
      const clampedX = Math.max(-halfTerrain + 0.1, Math.min(halfTerrain - 0.1, x));
      const clampedZ = Math.max(-halfTerrain + 0.1, Math.min(halfTerrain - 0.1, z));
      const y = this.options.getTerrainHeight(clampedX, clampedZ) + 0.08;
      outlinePts.push(new THREE.Vector3(clampedX, y, clampedZ));
    });
    if (outlinePts.length > 1) {
      outlinePts.push(outlinePts[0].clone());
    }

    const linePositions: number[] = [];
    const lineColors: number[] = [];
    const lineColor = new THREE.Color(data.style.color);
    const lw = data.style.lineWidth || DEFAULT_POLYGON_STYLE.lineWidth!;

    for (let i = 0; i < outlinePts.length - 1; i++) {
      const p1 = outlinePts[i];
      const p2 = outlinePts[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      if (len < 0.0001) continue;
      dir.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const perp = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(lw / 2);

      const v1 = p1.clone().add(perp);
      const v2 = p1.clone().sub(perp);
      const v3 = p2.clone().add(perp);
      const v4 = p2.clone().sub(perp);

      linePositions.push(
        v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
        v2.x, v2.y, v2.z, v4.x, v4.y, v4.z, v3.x, v3.y, v3.z
      );
      for (let j = 0; j < 6; j++) {
        lineColors.push(lineColor.r, lineColor.g, lineColor.b);
      }
    }

    if (linePositions.length > 0) {
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lineGeom.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
      const lineMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: Math.min(1, data.style.opacity + 0.3),
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const lineMesh = new THREE.Mesh(lineGeom, lineMat);
      group.add(lineMesh);
    }

    group.userData = { annotationId: data.id, annotationType: 'polygon' };
    return group;
  }

  public getMeshById(id: string): THREE.Object3D | undefined {
    return this.meshMap.get(id);
  }

  public getDataById(id: string): AnnotationData | undefined {
    return this.dataMap.get(id);
  }

  public updateStyle(id: string, updates: Partial<AnnotationStyle>): boolean {
    const mesh = this.meshMap.get(id);
    const data = this.dataMap.get(id);
    if (!mesh || !data) return false;

    data.style = { ...data.style, ...updates };

    const updateMeshStyle = (obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const meshObj = obj as THREE.Mesh;
        const mat = meshObj.material as THREE.Material | THREE.Material[];
        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          const phMat = m as THREE.MeshPhongMaterial;
          const bMat = m as THREE.MeshBasicMaterial;
          if (updates.opacity !== undefined) {
            m.opacity = updates.opacity;
            m.transparent = updates.opacity < 1;
          }
          if (updates.color !== undefined) {
            const c = new THREE.Color(updates.color);
            if (phMat.color) phMat.color.copy(c);
            if (bMat.color) bMat.color.copy(c);
            if (phMat.emissive) phMat.emissive.copy(c.clone().multiplyScalar(0.3));
          }
          if (updates.fillColor !== undefined && phMat.color) {
            phMat.color.copy(new THREE.Color(updates.fillColor));
          }
        });
      }
    };

    mesh.traverse(updateMeshStyle);
    return true;
  }

  public clear(): void {
    this.meshMap.forEach((mesh) => {
      mesh.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) {
            mat.forEach((mm) => mm.dispose());
          } else {
            mat?.dispose();
          }
        }
      });
    });
    this.meshMap.clear();
    this.dataMap.clear();
  }
}
