import * as THREE from 'three';
import { StarField, StarObject } from './StarField';

export interface ConstellationLine {
  from: { ra: number; dec: number };
  to: { ra: number; dec: number };
}

export interface ConstellationData {
  id: string;
  name: string;
  nameZh: string;
  lines: ConstellationLine[];
  stars: { ra: number; dec: number; name: string }[];
}

const CONSTELLATION_DATA: ConstellationData[] = [
  {
    id: 'ori',
    name: 'Orion',
    nameZh: '猎户座',
    stars: [
      { ra: 5.679, dec: 7.407, name: 'Betelgeuse (α Ori)' },
      { ra: 5.920, dec: -1.202, name: 'Rigel (β Ori)' },
      { ra: 5.604, dec: -1.943, name: 'Bellatrix (γ Ori)' },
      { ra: 5.242, dec: -8.202, name: 'Alnitak (ζ Ori)' },
      { ra: 5.291, dec: -1.997, name: 'Alnilam (ε Ori)' },
      { ra: 5.337, dec: -1.202, name: 'Mintaka (δ Ori)' },
      { ra: 5.487, dec: -6.853, name: 'Saiph (κ Ori)' },
    ],
    lines: [
      { from: { ra: 5.679, dec: 7.407 }, to: { ra: 5.604, dec: -1.943 } },
      { from: { ra: 5.604, dec: -1.943 }, to: { ra: 5.920, dec: -1.202 } },
      { from: { ra: 5.679, dec: 7.407 }, to: { ra: 5.337, dec: -1.202 } },
      { from: { ra: 5.337, dec: -1.202 }, to: { ra: 5.291, dec: -1.997 } },
      { from: { ra: 5.291, dec: -1.997 }, to: { ra: 5.242, dec: -8.202 } },
      { from: { ra: 5.242, dec: -8.202 }, to: { ra: 5.487, dec: -6.853 } },
      { from: { ra: 5.487, dec: -6.853 }, to: { ra: 5.920, dec: -1.202 } },
      { from: { ra: 5.337, dec: -1.202 }, to: { ra: 5.487, dec: -6.853 } },
    ]
  },
  {
    id: 'uma',
    name: 'Ursa Major',
    nameZh: '大熊座',
    stars: [
      { ra: 11.053, dec: 61.751, name: 'Dubhe (α UMa)' },
      { ra: 11.031, dec: 56.382, name: 'Merak (β UMa)' },
      { ra: 11.896, dec: 53.695, name: 'Phecda (γ UMa)' },
      { ra: 12.258, dec: 55.959, name: 'Megrez (δ UMa)' },
      { ra: 12.901, dec: 54.925, name: 'Alioth (ε UMa)' },
      { ra: 13.792, dec: 49.313, name: 'Mizar (ζ UMa)' },
      { ra: 13.988, dec: 48.020, name: 'Alkaid (η UMa)' },
    ],
    lines: [
      { from: { ra: 11.053, dec: 61.751 }, to: { ra: 11.031, dec: 56.382 } },
      { from: { ra: 11.031, dec: 56.382 }, to: { ra: 11.896, dec: 53.695 } },
      { from: { ra: 11.896, dec: 53.695 }, to: { ra: 12.258, dec: 55.959 } },
      { from: { ra: 12.258, dec: 55.959 }, to: { ra: 11.053, dec: 61.751 } },
      { from: { ra: 12.258, dec: 55.959 }, to: { ra: 12.901, dec: 54.925 } },
      { from: { ra: 12.901, dec: 54.925 }, to: { ra: 13.792, dec: 49.313 } },
      { from: { ra: 13.792, dec: 49.313 }, to: { ra: 13.988, dec: 48.020 } },
    ]
  },
  {
    id: 'slt',
    name: 'Summer Triangle',
    nameZh: '夏季大三角',
    stars: [
      { ra: 18.616, dec: 38.784, name: 'Vega (α Lyr)' },
      { ra: 20.691, dec: 45.280, name: 'Deneb (α Cyg)' },
      { ra: 19.846, dec: 8.868, name: 'Altair (α Aql)' },
    ],
    lines: [
      { from: { ra: 18.616, dec: 38.784 }, to: { ra: 20.691, dec: 45.280 } },
      { from: { ra: 20.691, dec: 45.280 }, to: { ra: 19.846, dec: 8.868 } },
      { from: { ra: 19.846, dec: 8.868 }, to: { ra: 18.616, dec: 38.784 } },
    ]
  },
  {
    id: 'leo',
    name: 'Leo',
    nameZh: '狮子座',
    stars: [
      { ra: 10.140, dec: 11.967, name: 'Regulus (α Leo)' },
      { ra: 10.310, dec: 19.832, name: 'Algieba (γ Leo)' },
      { ra: 10.470, dec: 23.422, name: 'Adhafera (ζ Leo)' },
      { ra: 10.170, dec: 20.523, name: 'Zosma (δ Leo)' },
      { ra: 9.820, dec: 14.521, name: 'Denebola (β Leo)' },
    ],
    lines: [
      { from: { ra: 10.140, dec: 11.967 }, to: { ra: 10.310, dec: 19.832 } },
      { from: { ra: 10.310, dec: 19.832 }, to: { ra: 10.470, dec: 23.422 } },
      { from: { ra: 10.470, dec: 23.422 }, to: { ra: 10.170, dec: 20.523 } },
      { from: { ra: 10.170, dec: 20.523 }, to: { ra: 10.310, dec: 19.832 } },
      { from: { ra: 10.170, dec: 20.523 }, to: { ra: 9.820, dec: 14.521 } },
    ]
  },
  {
    id: 'sco',
    name: 'Scorpius',
    nameZh: '天蝎座',
    stars: [
      { ra: 16.490, dec: -26.432, name: 'Antares (α Sco)' },
      { ra: 16.330, dec: -25.592, name: 'Graffias (β Sco)' },
      { ra: 16.560, dec: -28.123, name: 'Dschubba (δ Sco)' },
      { ra: 16.720, dec: -30.052, name: 'Sigma Sco' },
      { ra: 16.990, dec: -34.402, name: 'Shaula (λ Sco)' },
      { ra: 17.050, dec: -37.292, name: 'Lesath (υ Sco)' },
    ],
    lines: [
      { from: { ra: 16.330, dec: -25.592 }, to: { ra: 16.490, dec: -26.432 } },
      { from: { ra: 16.490, dec: -26.432 }, to: { ra: 16.560, dec: -28.123 } },
      { from: { ra: 16.560, dec: -28.123 }, to: { ra: 16.720, dec: -30.052 } },
      { from: { ra: 16.720, dec: -30.052 }, to: { ra: 16.990, dec: -34.402 } },
      { from: { ra: 16.990, dec: -34.402 }, to: { ra: 17.050, dec: -37.292 } },
    ]
  },
  {
    id: 'gem',
    name: 'Gemini',
    nameZh: '双子座',
    stars: [
      { ra: 7.577, dec: 31.888, name: 'Castor (α Gem)' },
      { ra: 7.453, dec: 28.026, name: 'Pollux (β Gem)' },
      { ra: 7.240, dec: 20.873, name: 'Alhena (γ Gem)' },
      { ra: 7.170, dec: 16.492, name: 'Wasat (δ Gem)' },
    ],
    lines: [
      { from: { ra: 7.577, dec: 31.888 }, to: { ra: 7.453, dec: 28.026 } },
      { from: { ra: 7.453, dec: 28.026 }, to: { ra: 7.240, dec: 20.873 } },
      { from: { ra: 7.240, dec: 20.873 }, to: { ra: 7.170, dec: 16.492 } },
      { from: { ra: 7.577, dec: 31.888 }, to: { ra: 7.240, dec: 20.873 } },
    ]
  }
];

export class Constellation {
  private group: THREE.Group;
  private constellationLines: Map<string, THREE.Line[]> = new Map();
  private constellationData: ConstellationData[] = CONSTELLATION_DATA;
  private starField: StarField;
  private celestialSphereRadius: number = 100;
  private visibleConstellations: Set<string> = new Set();
  private highlightedConstellation: string | null = null;
  private constellationStarMap: Map<string, number[]> = new Map();

  constructor(starField: StarField) {
    this.starField = starField;
    this.group = new THREE.Group();
    this.buildConstellationStarMap();
    this.createAllConstellationLines();
    this.showAll();
  }

  /**
   * 将球坐标 (theta, phi) 转换为三维笛卡尔坐标 (x, y, z)
   * 
   * 坐标系定义:
   * - theta: 方位角（赤经/RA），以小时为单位
   * - phi: 极角（赤纬/Dec），以度为单位
   * - radius: 天球半径
   * 
   * 转换公式:
   *   x = radius * cos(phi) * cos(theta)
   *   y = radius * sin(phi)
   *   z = radius * cos(phi) * sin(theta)
   */
  private sphericalToCartesian(theta: number, phi: number, radius: number): THREE.Vector3 {
    const thetaRad = (theta * Math.PI) / 12;
    const phiRad = (phi * Math.PI) / 180;
    
    const x = radius * Math.cos(phiRad) * Math.cos(thetaRad);
    const y = radius * Math.sin(phiRad);
    const z = radius * Math.cos(phiRad) * Math.sin(thetaRad);
    
    return new THREE.Vector3(x, y, z);
  }

  /**
   * 根据星座数据中的恒星名称和坐标，在 StarField 的恒星列表中查找匹配的恒星索引
   * 优先按名称匹配，名称不匹配时按经纬度距离匹配
   */
  public buildConstellationStarMap(): void {
    const stars = this.starField.getStars();
    
    this.constellationData.forEach(constellation => {
      const starIndices: number[] = [];
      
      constellation.stars.forEach(constellationStar => {
        let matchedIndex = -1;
        let minDistance = Infinity;
        
        const constellationStarName = constellationStar.name.toLowerCase();
        
        for (let i = 0; i < stars.length; i++) {
          const starData = stars[i].data;
          
          const starName = starData.name.toLowerCase();
          if (starName.includes(constellationStarName) || 
              constellationStarName.includes(starName)) {
            matchedIndex = starData.id;
            break;
          }
          
          const raDiff = Math.abs(starData.ra - constellationStar.ra);
          const decDiff = Math.abs(starData.dec - constellationStar.dec);
          const distance = Math.sqrt(raDiff * raDiff + decDiff * decDiff);
          
          if (distance < minDistance && distance < 0.5) {
            minDistance = distance;
            matchedIndex = starData.id;
          }
        }
        
        if (matchedIndex >= 0) {
          starIndices.push(matchedIndex);
        }
      });
      
      this.constellationStarMap.set(constellation.id, starIndices);
    });
  }

  /**
   * 根据星座ID获取匹配的 StarField 恒星索引数组
   */
  public getConstellationStarIndices(constellationId: string): number[] {
    return this.constellationStarMap.get(constellationId) || [];
  }

  private createAllConstellationLines(): void {
    this.constellationData.forEach(constellation => {
      const lines: THREE.Line[] = [];
      
      constellation.lines.forEach(line => {
        const start = this.sphericalToCartesian(line.from.ra, line.from.dec, this.celestialSphereRadius);
        const end = this.sphericalToCartesian(line.to.ra, line.to.dec, this.celestialSphereRadius);
        
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({
          color: 0x44d6ff,
          transparent: true,
          opacity: 0.5,
          linewidth: 1
        });
        
        const lineMesh = new THREE.Line(geometry, material);
        lineMesh.userData = { constellationId: constellation.id, type: 'constellation' };
        
        lines.push(lineMesh);
        this.group.add(lineMesh);
      });
      
      this.constellationLines.set(constellation.id, lines);
      this.visibleConstellations.add(constellation.id);
    });
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getConstellationData(): ConstellationData[] {
    return this.constellationData;
  }

  public showAll(): void {
    this.constellationLines.forEach((lines) => {
      lines.forEach(line => {
        line.visible = true;
      });
    });
    this.constellationData.forEach(c => this.visibleConstellations.add(c.id));
  }

  public hideAll(): void {
    this.constellationLines.forEach((lines) => {
      lines.forEach(line => {
        line.visible = false;
      });
    });
    this.visibleConstellations.clear();
  }

  public showConstellation(id: string): void {
    const lines = this.constellationLines.get(id);
    if (lines) {
      lines.forEach(line => {
        line.visible = true;
      });
      this.visibleConstellations.add(id);
    }
  }

  public hideConstellation(id: string): void {
    const lines = this.constellationLines.get(id);
    if (lines) {
      lines.forEach(line => {
        line.visible = false;
      });
      this.visibleConstellations.delete(id);
    }
  }

  public highlightConstellation(id: string | null): void {
    this.highlightedConstellation = id;
    
    this.constellationLines.forEach((lines, constellationId) => {
      const isHighlighted = constellationId === id;
      const isVisible = this.visibleConstellations.has(constellationId);
      
      lines.forEach(line => {
        const material = line.material as THREE.LineBasicMaterial;
        
        if (id === null) {
          material.color.setHex(0x44d6ff);
          material.opacity = 0.5;
        } else if (isHighlighted) {
          material.color.setHex(0x00ffff);
          material.opacity = 0.9;
          line.visible = true;
        } else if (isVisible) {
          material.color.setHex(0x44d6ff);
          material.opacity = 0.3;
        }
      });
    });
  }

  public findConstellationByStar(starId: number): ConstellationData | null {
    const star = this.starField.getStarById(starId);
    if (!star) return null;
    
    for (const constellation of this.constellationData) {
      const hasStar = constellation.stars.some(s => 
        Math.abs(s.ra - star.data.ra) < 0.1 && Math.abs(s.dec - star.data.dec) < 0.1
      );
      if (hasStar) {
        return constellation;
      }
    }
    
    return null;
  }

  public updateRotation(angle: number): void {
    this.group.rotation.y = angle;
  }

  public updateVisibility(frustum: THREE.Frustum): void {
    this.constellationLines.forEach((lines) => {
      lines.forEach(line => {
        const positions = line.geometry.attributes.position;
        const start = new THREE.Vector3(
          positions.getX(0),
          positions.getY(0),
          positions.getZ(0)
        );
        const end = new THREE.Vector3(
          positions.getX(1),
          positions.getY(1),
          positions.getZ(1)
        );
        
        const lineLength = start.distanceTo(end);
        const lineRadius = lineLength * 0.5 + 1.0;
        const center = start.clone().add(end).multiplyScalar(0.5);
        const boundingSphere = new THREE.Sphere(center, lineRadius);
        
        line.visible = frustum.intersectsSphere(boundingSphere);
      });
    });
  }

  public dispose(): void {
    this.constellationLines.forEach((lines) => {
      lines.forEach(line => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
    });
    this.constellationLines.clear();
  }
}
