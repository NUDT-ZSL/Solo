import * as THREE from 'three';

export interface StarData {
  id: number;
  ra: number;
  dec: number;
  magnitude: number;
  name: string;
  distance: number;
  color: string;
}

export interface StarObject {
  mesh: THREE.Mesh;
  data: StarData;
  sprite: THREE.Sprite;
}

export class StarField {
  private stars: StarObject[] = [];
  private group: THREE.Group;
  private starCount: number = 200;
  private celestialSphereRadius: number = 100;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.group = new THREE.Group();
    this.camera = camera;
    this.generateStars();
  }

  private sphericalToCartesian(ra: number, dec: number, radius: number): THREE.Vector3 {
    const raRad = (ra * Math.PI) / 12;
    const decRad = (dec * Math.PI) / 180;
    
    const x = radius * Math.cos(decRad) * Math.cos(raRad);
    const y = radius * Math.sin(decRad);
    const z = radius * Math.cos(decRad) * Math.sin(raRad);
    
    return new THREE.Vector3(x, y, z);
  }

  private magnitudeToSize(magnitude: number): number {
    const minMag = 1.2;
    const maxMag = 6.5;
    const minSize = 1;
    const maxSize = 5;
    
    const normalized = 1 - (magnitude - minMag) / (maxMag - minMag);
    const clamped = Math.max(0, Math.min(1, normalized));
    
    return minSize + clamped * (maxSize - minSize);
  }

  private magnitudeToOpacity(magnitude: number): number {
    const minMag = 1.2;
    const maxMag = 6.5;
    const minOpacity = 0.3;
    const maxOpacity = 1.0;
    
    const normalized = 1 - (magnitude - minMag) / (maxMag - minMag);
    const clamped = Math.max(0, Math.min(1, normalized));
    
    return minOpacity + clamped * (maxOpacity - minOpacity);
  }

  private magnitudeToColor(magnitude: number): THREE.Color {
    const minMag = 1.2;
    const maxMag = 6.5;
    
    const normalized = 1 - (magnitude - minMag) / (maxMag - minMag);
    const clamped = Math.max(0, Math.min(1, normalized));
    
    const white = new THREE.Color(0xffffff);
    const lightBlue = new THREE.Color(0xaacdff);
    
    return white.clone().lerp(lightBlue, 1 - clamped);
  }

  private generateStarName(index: number): string {
    const greekLetters = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ'];
    const constellations = ['Ori', 'UMa', 'CMa', 'Lyr', 'Cyg', 'Aql', 'Leo', 'Sco', 'Vir', 'Gem', 'Tau', 'Ari'];
    
    if (index < 20) {
      const constellation = constellations[index % constellations.length];
      const letter = greekLetters[Math.floor(index / constellations.length) % greekLetters.length];
      return `${letter} ${constellation}`;
    }
    
    return `HD ${80000 + index * 137}`;
  }

  private generateStars(): void {
    const brightStars: StarData[] = [
      { id: 0, ra: 5.679, dec: 7.407, magnitude: 0.42, name: 'α Ori (Betelgeuse)', distance: 643, color: '#ffccaa' },
      { id: 1, ra: 5.920, dec: -1.202, magnitude: 0.18, name: 'β Ori (Rigel)', distance: 860, color: '#aacdff' },
      { id: 2, ra: 6.752, dec: -16.713, magnitude: -1.46, name: 'α CMa (Sirius)', distance: 8.6, color: '#ffffff' },
      { id: 3, ra: 11.053, dec: 61.751, magnitude: 1.76, name: 'α UMa (Dubhe)', distance: 124, color: '#f0e8d8' },
      { id: 4, ra: 11.031, dec: 56.382, magnitude: 2.37, name: 'β UMa (Merak)', distance: 79, color: '#ffffff' },
      { id: 5, ra: 11.896, dec: 53.695, magnitude: 2.44, name: 'γ UMa (Phecda)', distance: 84, color: '#e8f0ff' },
      { id: 6, ra: 12.258, dec: 55.959, magnitude: 1.85, name: 'δ UMa (Megrez)', distance: 81, color: '#ffffff' },
      { id: 7, ra: 12.901, dec: 54.925, magnitude: 1.77, name: 'ε UMa (Alioth)', distance: 81, color: '#f0f0ff' },
      { id: 8, ra: 13.792, dec: 49.313, magnitude: 2.23, name: 'ζ UMa (Mizar)', distance: 78, color: '#ffffff' },
      { id: 9, ra: 13.988, dec: 48.020, magnitude: 1.86, name: 'η UMa (Alkaid)', distance: 101, color: '#e8f0ff' },
      { id: 10, ra: 18.616, dec: 38.784, magnitude: 0.77, name: 'α Lyr (Vega)', distance: 25, color: '#aacdff' },
      { id: 11, ra: 20.691, dec: 45.280, magnitude: 1.25, name: 'α Cyg (Deneb)', distance: 2620, color: '#f0f0ff' },
      { id: 12, ra: 19.846, dec: 8.868, magnitude: 0.76, name: 'α Aql (Altair)', distance: 16.7, color: '#ffffff' },
      { id: 13, ra: 10.140, dec: 11.967, magnitude: 1.35, name: 'α Leo (Regulus)', distance: 79, color: '#aacdff' },
      { id: 14, ra: 16.490, dec: -26.432, magnitude: 1.06, name: 'α Sco (Antares)', distance: 550, color: '#ffccaa' },
      { id: 15, ra: 13.420, dec: -11.161, magnitude: 0.98, name: 'α Vir (Spica)', distance: 250, color: '#aacdff' },
      { id: 16, ra: 7.577, dec: 31.888, magnitude: 1.16, name: 'α Gem (Castor)', distance: 51, color: '#ffffff' },
      { id: 17, ra: 7.453, dec: 28.026, magnitude: 1.64, name: 'β Gem (Pollux)', distance: 34, color: '#ffccaa' },
      { id: 18, ra: 5.640, dec: 23.462, magnitude: 1.65, name: 'α Tau (Aldebaran)', distance: 65, color: '#ffccaa' },
      { id: 19, ra: 2.015, dec: 23.434, magnitude: 2.01, name: 'α Ari (Hamal)', distance: 66, color: '#ffccaa' },
    ];

    brightStars.forEach((data) => {
      this.createStar(data);
    });

    for (let i = brightStars.length; i < this.starCount; i++) {
      const ra = Math.random() * 24;
      const dec = (Math.random() - 0.5) * 120;
      const magnitude = 1.2 + Math.random() * 5.3;
      const distance = 10 + Math.random() * 990;
      const name = this.generateStarName(i);
      
      const data: StarData = {
        id: i,
        ra,
        dec,
        magnitude,
        name,
        distance: Math.round(distance),
        color: '#ffffff'
      };
      
      this.createStar(data);
    }
  }

  private createStar(data: StarData): void {
    const position = this.sphericalToCartesian(data.ra, data.dec, this.celestialSphereRadius);
    const size = this.magnitudeToSize(data.magnitude);
    const opacity = this.magnitudeToOpacity(data.magnitude);
    const color = this.magnitudeToColor(data.magnitude);

    const geometry = new THREE.SphereGeometry(size * 0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { starId: data.id, type: 'star' };

    const spriteCanvas = this.createGlowTexture(color, size, opacity);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(spriteCanvas),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(size * 0.8, size * 0.8, 1);

    this.group.add(mesh);
    this.group.add(sprite);

    this.stars.push({ mesh, data, sprite });
  }

  private createGlowTexture(color: THREE.Color, size: number, opacity: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const sizePx = Math.max(32, Math.round(size * 8));
    canvas.width = sizePx;
    canvas.height = sizePx;
    
    const ctx = canvas.getContext('2d')!;
    const centerX = sizePx / 2;
    const centerY = sizePx / 2;
    const radius = sizePx / 2;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    const colorHex = `#${color.getHexString()}`;
    
    gradient.addColorStop(0, colorHex);
    gradient.addColorStop(0.2, colorHex + Math.floor(opacity * 200).toString(16).padStart(2, '0'));
    gradient.addColorStop(0.5, colorHex + Math.floor(opacity * 100).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, colorHex + '00');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, sizePx, sizePx);
    
    return canvas;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getStars(): StarObject[] {
    return this.stars;
  }

  public getStarById(id: number): StarObject | undefined {
    return this.stars.find(s => s.data.id === id);
  }

  public getStarByPosition(position: THREE.Vector3): StarObject | undefined {
    return this.stars.find(s => s.mesh.position.distanceTo(position) < 1);
  }

  public getStarDataByRaDec(ra: number, dec: number): StarObject | undefined {
    return this.stars.find(s => 
      Math.abs(s.data.ra - ra) < 0.1 && Math.abs(s.data.dec - dec) < 0.1
    );
  }

  public updateRotation(angle: number): void {
    this.group.rotation.y = angle;
  }

  public updateVisibility(frustum: THREE.Frustum): void {
    this.stars.forEach(star => {
      const isVisible = frustum.containsPoint(star.mesh.position);
      star.mesh.visible = isVisible;
      star.sprite.visible = isVisible;
    });
  }

  public setHighlight(starId: number | null): void {
    this.stars.forEach(star => {
      const isHighlighted = star.data.id === starId;
      const material = star.mesh.material as THREE.MeshBasicMaterial;
      
      if (isHighlighted) {
        star.mesh.scale.setScalar(1.5);
        star.sprite.scale.setScalar(1.5);
        material.opacity = Math.min(1, this.magnitudeToOpacity(star.data.magnitude) * 1.3);
      } else {
        star.mesh.scale.setScalar(1);
        star.sprite.scale.setScalar(1);
        material.opacity = this.magnitudeToOpacity(star.data.magnitude);
      }
    });
  }

  public dispose(): void {
    this.stars.forEach(star => {
      star.mesh.geometry.dispose();
      (star.mesh.material as THREE.Material).dispose();
      (star.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (star.sprite.material as THREE.Material).dispose();
    });
    this.stars = [];
  }
}
