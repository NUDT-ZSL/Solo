import * as THREE from 'three';

interface TextChar {
  sprite: THREE.Sprite;
  char: string;
  delay: number;
  elapsed: number;
  appearDuration: number;
  bounceProgress: number;
  opacity: number;
  visible: boolean;
}

interface TextDisplayGroup {
  chars: TextChar[];
  position: THREE.Vector3;
  totalDuration: number;
  elapsed: number;
  fadeOutStart: number;
  fadeOutDuration: number;
  isActive: boolean;
}

export class TextDisplay {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private currentDisplay: TextDisplayGroup | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  private createCharTexture(char: string, glowIntensity: number = 1): THREE.Texture {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    ctx.font = 'bold 240px "Microsoft YaHei", "PingFang SC", "STHeiti", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = size / 2;
    const y = size / 2;

    ctx.shadowColor = 'rgba(100, 180, 255, 1)';
    ctx.shadowBlur = 40 * glowIntensity;
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillText(char, x, y);

    ctx.shadowBlur = 20 * glowIntensity;
    ctx.shadowColor = 'rgba(150, 210, 255, 0.9)';
    ctx.fillText(char, x, y);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText(char, x, y);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.anisotropy = 8;
    texture.premultiplyAlpha = true;
    return texture;
  }

  private createCharSprite(char: string, index: number, totalChars: number, centerPos: THREE.Vector3): TextChar {
    const texture = this.createCharTexture(char);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const sprite = new THREE.Sprite(material);
    const charSize = 1.1;
    sprite.scale.set(charSize, charSize, 1);

    const spacing = charSize * 0.85;
    const totalWidth = (totalChars - 1) * spacing;
    const offsetX = (index - (totalChars - 1) / 2) * spacing;

    sprite.position.copy(centerPos);
    sprite.position.x += offsetX;
    sprite.position.y += 0.5;
    sprite.renderOrder = 100;

    this.scene.add(sprite);

    return {
      sprite,
      char,
      delay: index * 0.1,
      elapsed: 0,
      appearDuration: 0.2,
      bounceProgress: 0,
      opacity: 0,
      visible: false
    };
  }

  public showText(text: string, position: THREE.Vector3): void {
    if (this.currentDisplay) {
      this.fadeOutCurrent();
    }

    const chars: TextChar[] = [];
    const charArray = Array.from(text);

    for (let i = 0; i < charArray.length; i++) {
      const charSprite = this.createCharSprite(charArray[i], i, charArray.length, position.clone());
      chars.push(charSprite);
    }

    const appearTime = charArray.length * 0.1 + 0.2;
    const holdTime = 2.5;
    const fadeOutDuration = 0.5;
    const totalDuration = appearTime + holdTime + fadeOutDuration;

    this.currentDisplay = {
      chars,
      position: position.clone(),
      totalDuration,
      elapsed: 0,
      fadeOutStart: appearTime + holdTime,
      fadeOutDuration,
      isActive: true
    };
  }

  private fadeOutCurrent(): void {
    if (!this.currentDisplay) return;

    const display = this.currentDisplay;
    const fadeOutDuration = 0.4;

    for (const char of display.chars) {
      const mat = char.sprite.material as THREE.SpriteMaterial;
      mat.transparent = true;
    }

    display.elapsed = Math.max(display.elapsed, display.fadeOutStart);
    display.totalDuration = display.elapsed + fadeOutDuration;
    display.fadeOutDuration = fadeOutDuration;
    display.fadeOutStart = display.elapsed;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private disposeDisplay(display: TextDisplayGroup): void {
    for (const char of display.chars) {
      this.scene.remove(char.sprite);
      const mat = char.sprite.material as THREE.SpriteMaterial;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
  }

  public update(delta: number): void {
    if (!this.currentDisplay || !this.currentDisplay.isActive) return;

    const display = this.currentDisplay;
    display.elapsed += delta;

    let allDone = true;

    for (const char of display.chars) {
      const relativeTime = display.elapsed - char.delay;
      const mat = char.sprite.material as THREE.SpriteMaterial;

      if (display.elapsed >= display.fadeOutStart) {
        const fadeTime = display.elapsed - display.fadeOutStart;
        const fadeProgress = Math.min(fadeTime / display.fadeOutDuration, 1);
        char.opacity = Math.max(0, (1 - fadeProgress) * (char.visible ? 1 : char.opacity));
        mat.opacity = char.opacity;

        char.sprite.position.y += delta * 0.5;
      } else if (relativeTime >= 0) {
        char.visible = true;
        allDone = false;

        const appearProgress = Math.min(relativeTime / char.appearDuration, 1);
        char.bounceProgress = appearProgress;

        const bounceScale = this.easeOutBack(appearProgress);
        const baseScale = 0.8 + 0.2 * bounceScale;
        char.sprite.scale.setScalar(1.1 * baseScale);

        const fadeIn = Math.min(appearProgress * 1.5, 1);
        char.opacity = fadeIn;
        mat.opacity = char.opacity;
      } else {
        allDone = false;
      }
    }

    if (display.elapsed >= display.totalDuration) {
      this.disposeDisplay(display);
      this.currentDisplay = null;
    }
  }

  public onResize(): void {
  }
}
