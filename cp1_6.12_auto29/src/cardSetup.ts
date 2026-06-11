import * as THREE from 'three';
import { CardData } from './cardData';

export interface CardObject {
  group: THREE.Group;
  cardPivot: THREE.Group;
  frontMesh: THREE.Mesh;
  backMesh: THREE.Mesh;
  edgeMesh: THREE.LineSegments;
  glowMesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalScale: THREE.Vector3;
  originalRotation: THREE.Euler;
  isHovered: boolean;
  isFlipped: boolean;
  targetFlip: number;
  currentFlip: number;
  hoverProgress: number;
  theme: {
    front: string;
    back: string;
    glow: string;
    accent: string;
  };
  data: CardData;
}

const CARD_WIDTH = 3;
const CARD_HEIGHT = 4;
const CARD_THICKNESS = 0.1;
const ORBIT_RADIUS_X = 8;
const ORBIT_RADIUS_Z = 5;
const CARD_COUNT = 8;

function createFrontTexture(data: CardData): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, data.theme.front);
  gradient.addColorStop(1, shadeColor(data.theme.front, -20));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = data.theme.accent;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.title, canvas.width / 2, canvas.height / 2 - 80);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';

  const descLines = wrapText(ctx, data.description, canvas.width - 100);
  let y = canvas.height / 2 + 20;
  for (const line of descLines) {
    ctx.fillText(line, canvas.width / 2, y);
    y += 36;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createBackTexture(data: CardData): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, shadeColor(data.theme.back, 20));
  gradient.addColorStop(1, data.theme.back);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 20;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↺', canvas.width / 2, canvas.height / 2 - 40);

  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('点击翻转回来', canvas.width / 2, canvas.height / 2 + 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

export function setupCards(cardDataList: CardData[]): CardObject[] {
  const cards: CardObject[] = [];

  for (let i = 0; i < cardDataList.length; i++) {
    const data = cardDataList[i];
    const angle = (i / CARD_COUNT) * Math.PI * 2;
    const x = Math.cos(angle) * ORBIT_RADIUS_X;
    const z = Math.sin(angle) * ORBIT_RADIUS_Z;

    const group = new THREE.Group();
    const cardPivot = new THREE.Group();

    const frontTexture = createFrontTexture(data);
    const backTexture = createBackTexture(data);

    const frontGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
    const backGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
    const sideGeometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);

    const frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      metalness: 0.3,
      roughness: 0.5,
      emissive: new THREE.Color(data.theme.glow),
      emissiveIntensity: 0,
      side: THREE.DoubleSide
    });

    const backMaterial = new THREE.MeshStandardMaterial({
      map: backTexture,
      metalness: 0.3,
      roughness: 0.5,
      emissive: new THREE.Color(data.theme.glow),
      emissiveIntensity: 0,
      side: THREE.DoubleSide
    });

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: data.theme.front,
      metalness: 0.3,
      roughness: 0.5
    });

    const sideMesh = new THREE.Mesh(sideGeometry, sideMaterial);

    const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
    frontMesh.position.z = CARD_THICKNESS / 2 + 0.001;

    const backMesh = new THREE.Mesh(backGeometry, backMaterial);
    backMesh.position.z = -CARD_THICKNESS / 2 - 0.001;
    backMesh.rotation.y = Math.PI;

    const edgeGeometry = new THREE.EdgesGeometry(sideGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: data.theme.glow,
      transparent: true,
      opacity: 0
    });

    const glowGeometry = new THREE.BoxGeometry(
      CARD_WIDTH + 0.15,
      CARD_HEIGHT + 0.15,
      CARD_THICKNESS + 0.1
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: data.theme.glow,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    const edgeMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial);

    cardPivot.add(sideMesh);
    cardPivot.add(frontMesh);
    cardPivot.add(backMesh);
    cardPivot.add(glowMesh);
    cardPivot.add(edgeMesh);

    group.add(cardPivot);

    group.position.set(x, 0, z);
    group.lookAt(0, 0, 0);
    group.rotation.y += Math.PI;

    const cardObj: CardObject = {
      group,
      cardPivot,
      frontMesh,
      backMesh,
      edgeMesh,
      glowMesh,
      originalPosition: group.position.clone(),
      originalScale: group.scale.clone(),
      originalRotation: group.rotation.clone(),
      isHovered: false,
      isFlipped: false,
      targetFlip: 0,
      currentFlip: 0,
      hoverProgress: 0,
      theme: data.theme,
      data
    };

    cards.push(cardObj);
  }

  return cards;
}

export { CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS, ORBIT_RADIUS_X, ORBIT_RADIUS_Z, CARD_COUNT };
