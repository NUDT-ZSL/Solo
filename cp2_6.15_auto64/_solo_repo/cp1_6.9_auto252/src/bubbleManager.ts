import * as THREE from 'three';

interface BubbleData {
  velocity: THREE.Vector3;
  baseScale: number;
  targetScale: number;
  currentScale: number;
  poem: string;
  hue: number;
  isPopping: boolean;
  popProgress: number;
}

const POEMS = [
  '明月几时有',
  '举杯邀明月',
  '海上生明月',
  '月是故乡明',
  '春江潮水连海平',
  '海上明月共潮生',
  '落霞与孤鹜齐飞',
  '秋水共长天一色',
  '大漠孤烟直',
  '长河落日圆',
  '会当凌绝顶',
  '一览众山小',
  '欲穷千里目',
  '更上一层楼',
  '海内存知己',
  '天涯若比邻',
  '山重水复疑无路',
  '柳暗花明又一村',
  '人生若只如初见',
  '何事秋风悲画扇',
  '愿得一人心',
  '白首不相离',
  '执子之手',
  '与子偕老',
  '青青子衿',
  '悠悠我心',
  '桃之夭夭',
  '灼灼其华',
  '关关雎鸠',
  '在河之洲',
  '窈窕淑女',
  '君子好逑',
  '蒹葭苍苍',
  '白露为霜',
  '所谓伊人',
  '在水一方',
  '风萧萧兮易水寒',
  '壮士一去兮不复还',
  '路漫漫其修远兮',
  '吾将上下而求索',
  '长风破浪会有时',
  '直挂云帆济沧海',
  '天生我材必有用',
  '千金散尽还复来',
  '安能摧眉折腰事权贵',
  '使我不得开心颜'
];

const BUBBLE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const BUBBLE_FRAGMENT_SHADER = `
  uniform vec3 uBaseColor;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0) hue += 1.0;
    else if (hue > 1.0) hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0) res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0) res = f2;
    else if ((3.0 * hue) < 2.0) res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else res = f1;
    return res;
  }

  vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    if (hsl.y == 0.0) {
      rgb = vec3(hsl.z);
    } else {
      float f2;
      if (hsl.z < 0.5) f2 = hsl.z * (1.0 + hsl.y);
      else f2 = hsl.z + hsl.y - hsl.y * hsl.z;
      float f1 = 2.0 * hsl.z - f2;
      rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
      rgb.g = hue2rgb(f1, f2, hsl.x);
      rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }
    return rgb;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

    float dist = length(vViewPosition);
    float alpha = mix(0.08, 0.35, fresnel);

    float rainbowFreq = 0.02;
    float rainbowPhase = uTime * 0.3;
    float rainbow = sin(vWorldPosition.x * rainbowFreq + rainbowPhase) *
                    sin(vWorldPosition.y * rainbowFreq * 1.3 + rainbowPhase * 0.7) *
                    sin(vWorldPosition.z * rainbowFreq * 1.1 + rainbowPhase * 1.1);
    float rainbowHue = fract(rainbow * 0.5 + 0.5);
    vec3 rainbowColor = hsl2rgb(vec3(rainbowHue, 0.7, 0.85));

    vec3 rimColor = mix(uBaseColor, rainbowColor, 0.4);
    vec3 innerColor = vec3(1.0, 1.0, 1.0);
    float centerFactor = 1.0 - fresnel;
    vec3 baseColor = mix(rimColor, innerColor, centerFactor * 0.7);

    vec3 lightDir1 = normalize(vec3(-0.5, 0.7, 0.4));
    float diffuse1 = max(dot(normal, lightDir1), 0.0);

    vec3 halfDir1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfDir1), 0.0), 64.0);

    vec3 lightDir2 = normalize(vec3(0.6, -0.5, 0.3));
    float diffuse2 = max(dot(normal, lightDir2), 0.0) * 0.5;

    vec3 halfDir2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, halfDir2), 0.0), 48.0) * 0.6;

    float noise = sin(vWorldPosition.x * 3.0 + uTime * 0.5) *
                  sin(vWorldPosition.y * 3.5 + uTime * 0.4) *
                  sin(vWorldPosition.z * 2.8 + uTime * 0.6);
    float shimmer = 0.5 + 0.5 * noise;

    vec3 finalColor = baseColor * (0.3 + diffuse1 * 0.4 + diffuse2 * 0.2);
    finalColor += vec3(1.0, 1.0, 1.0) * (spec1 * 0.8 + spec2 * 0.5);
    finalColor += rimColor * fresnel * shimmer * 0.5;
    finalColor *= uBrightness;

    float finalAlpha = alpha * uOpacity;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export class BubbleManager {
  private scene: THREE.Scene;
  private bubbles: THREE.Mesh[] = [];
  private bubbleDataMap: Map<THREE.Mesh, BubbleData> = new Map();
  private sphereRadius: number = 6;
  private repulsionRadius: number = 1.5;
  private minBubbles: number = 30;
  private maxBubbles: number = 50;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBubbles();
  }

  private randomInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private randomDirection(): THREE.Vector3 {
    const v = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    return v.normalize();
  }

  private randomColor(): { color: THREE.Color, hue: number } {
    const hueOptions = [
      { min: 0.62, max: 0.72 },
      { min: 0.72, max: 0.85 },
      { min: 0.88, max: 0.98 }
    ];
    const hueSet = hueOptions[Math.floor(Math.random() * hueOptions.length)];
    const hue = hueSet.min + Math.random() * (hueSet.max - hueSet.min);
    const color = new THREE.Color().setHSL(hue, 0.5, 0.75);
    return { color, hue };
  }

  private createBubble(position: THREE.Vector3, diameter: number, colorInfo: { color: THREE.Color, hue: number }): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(diameter / 2, 48, 48);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: colorInfo.color },
        uTime: { value: 0 },
        uBrightness: { value: 1.0 },
        uOpacity: { value: 1.0 }
      },
      vertexShader: BUBBLE_VERTEX_SHADER,
      fragmentShader: BUBBLE_FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const bubble = new THREE.Mesh(geometry, material);
    bubble.position.copy(position);
    return bubble;
  }

  private createBubbles(): void {
    const count = Math.floor(Math.random() * (this.maxBubbles - this.minBubbles + 1)) + this.minBubbles;
    const usedPoems = new Set<number>();

    for (let i = 0; i < count; i++) {
      let position: THREE.Vector3;
      let attempts = 0;
      do {
        position = this.randomInSphere(this.sphereRadius);
        attempts++;
      } while (this.isOverlapping(position, 1.3) && attempts < 50);

      const diameter = 0.8 + Math.random() * (1.8 - 0.8);
      const colorInfo = this.randomColor();
      const bubble = this.createBubble(position, diameter, colorInfo);

      const speed = 0.02 + Math.random() * (0.06 - 0.02);
      const velocity = this.randomDirection().multiplyScalar(speed);

      let poemIndex: number;
      do {
        poemIndex = Math.floor(Math.random() * POEMS.length);
      } while (usedPoems.has(poemIndex) && usedPoems.size < POEMS.length);
      usedPoems.add(poemIndex);

      const data: BubbleData = {
        velocity,
        baseScale: 1,
        targetScale: 1,
        currentScale: 1,
        poem: POEMS[poemIndex],
        hue: colorInfo.hue,
        isPopping: false,
        popProgress: 0
      };

      this.bubbles.push(bubble);
      this.bubbleDataMap.set(bubble, data);
      this.scene.add(bubble);
    }
  }

  private isOverlapping(pos: THREE.Vector3, minDist: number): boolean {
    for (const bubble of this.bubbles) {
      if (bubble.position.distanceTo(pos) < minDist) {
        return true;
      }
    }
    return false;
  }

  public update(delta: number, time: number): void {
    const force = new THREE.Vector3();

    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i];
      const data = this.bubbleDataMap.get(bubble);
      if (!data) continue;

      if (data.isPopping) {
        data.popProgress += delta / 0.3;
        const mat = bubble.material as THREE.ShaderMaterial;
        mat.uniforms.uOpacity.value = Math.max(0, 1 - data.popProgress);
        bubble.scale.setScalar(data.currentScale * (1 + data.popProgress * 0.5));
        if (data.popProgress >= 1) {
          this.removeBubble(bubble);
          i--;
        }
        continue;
      }

      force.set(0, 0, 0);

      for (let j = 0; j < this.bubbles.length; j++) {
        if (i === j) continue;
        const other = this.bubbles[j];
        const otherData = this.bubbleDataMap.get(other);
        if (!otherData || otherData.isPopping) continue;

        const diff = new THREE.Vector3().subVectors(bubble.position, other.position);
        const dist = diff.length();

        if (dist < this.repulsionRadius && dist > 0.01) {
          const strength = (this.repulsionRadius - dist) / this.repulsionRadius;
          diff.normalize().multiplyScalar(strength * 0.08);
          force.add(diff);
        }
      }

      const distFromCenter = bubble.position.length();
      if (distFromCenter > this.sphereRadius * 0.85) {
        const toCenter = new THREE.Vector3().copy(bubble.position).negate().normalize();
        const boundaryForce = (distFromCenter - this.sphereRadius * 0.85) / (this.sphereRadius * 0.15);
        force.add(toCenter.multiplyScalar(boundaryForce * 0.1));
      }

      data.velocity.add(force.multiplyScalar(delta * 60));

      const maxSpeed = 0.08;
      if (data.velocity.length() > maxSpeed) {
        data.velocity.setLength(maxSpeed);
      }

      data.velocity.multiplyScalar(0.995);

      bubble.position.add(data.velocity.clone().multiplyScalar(delta * 60));

      const mat = bubble.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time;

      data.currentScale += (data.targetScale - data.currentScale) * Math.min(delta * 10, 1);
      bubble.scale.setScalar(data.currentScale);
    }
  }

  public hoverBubble(bubble: THREE.Mesh): void {
    const data = this.bubbleDataMap.get(bubble);
    if (!data || data.isPopping) return;
    data.targetScale = 1.1;
    const mat = bubble.material as THREE.ShaderMaterial;
    mat.uniforms.uBrightness.value = 1.3;
  }

  public resetBubbleScale(bubble: THREE.Mesh): void {
    const data = this.bubbleDataMap.get(bubble);
    if (!data || data.isPopping) return;
    data.targetScale = 1;
    const mat = bubble.material as THREE.ShaderMaterial;
    mat.uniforms.uBrightness.value = 1.0;
  }

  public popBubble(bubble: THREE.Mesh): void {
    const data = this.bubbleDataMap.get(bubble);
    if (!data) return;
    data.isPopping = true;
    data.popProgress = 0;
  }

  private removeBubble(bubble: THREE.Mesh): void {
    this.scene.remove(bubble);
    const idx = this.bubbles.indexOf(bubble);
    if (idx >= 0) this.bubbles.splice(idx, 1);
    this.bubbleDataMap.delete(bubble);
    bubble.geometry.dispose();
    (bubble.material as THREE.Material).dispose();

    setTimeout(() => this.respawnBubble(), 800 + Math.random() * 1200);
  }

  private respawnBubble(): void {
    let position: THREE.Vector3;
    let attempts = 0;
    do {
      position = this.randomInSphere(this.sphereRadius);
      attempts++;
    } while (this.isOverlapping(position, 1.3) && attempts < 50);

    const diameter = 0.8 + Math.random() * (1.8 - 0.8);
    const colorInfo = this.randomColor();
    const bubble = this.createBubble(position, diameter, colorInfo);

    const speed = 0.02 + Math.random() * (0.06 - 0.02);
    const velocity = this.randomDirection().multiplyScalar(speed);

    const poemIndex = Math.floor(Math.random() * POEMS.length);

    const data: BubbleData = {
      velocity,
      baseScale: 1,
      targetScale: 0,
      currentScale: 0,
      poem: POEMS[poemIndex],
      hue: colorInfo.hue,
      isPopping: false,
      popProgress: 0
    };

    this.bubbles.push(bubble);
    this.bubbleDataMap.set(bubble, data);
    this.scene.add(bubble);

    setTimeout(() => {
      if (this.bubbleDataMap.has(bubble)) {
        this.bubbleDataMap.get(bubble)!.targetScale = 1;
      }
    }, 50);
  }

  public getBubbles(): THREE.Mesh[] {
    return this.bubbles;
  }

  public getBubbleData(bubble: THREE.Mesh): BubbleData | undefined {
    return this.bubbleDataMap.get(bubble);
  }
}
