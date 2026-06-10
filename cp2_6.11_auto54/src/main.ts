import * as THREE from 'three';
import { ParticleCloth, ClothMode } from './particleCloth';
import { parseText, EmotionWord } from './textParser';

interface CameraState {
  targetTheta: number;
  targetPhi: number;
  targetRadius: number;
  currentTheta: number;
  currentPhi: number;
  currentRadius: number;
  damping: number;
  lastTheta: number;
  lastPhi: number;
}

interface RecordingFrameData {
  positions: number[];
  colors: number[];
  opacities: number[];
}

interface RecordingJSON {
  version: number;
  particleCount: number;
  fps: number;
  duration: number;
  frames: RecordingFrameData[];
}

const PARTICLE_COUNT = 7500;
const BASE_DISTANCE = 3.2;
const FOV = 55;
const LOOK_AT = new THREE.Vector3(0, 0.875, 0);
const DAMPING = 0.9;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cloth: ParticleCloth;
let camState: CameraState;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let rotationDeltaMag = 0;
let accumulatedRotation = 0;

let isRecording = false;
let recordingStartTime = 0;
let recordingFrames: RecordingFrameData[] = [];
let recordingFps = 30;
let recordingDuration = 30;
let lastRecordFrameTime = 0;

let isPlayingBack = false;
let playbackFrames: RecordingFrameData[] = [];
let playbackStartTime = 0;
let playbackFps = 30;

let perfLogTimer = 0;

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

function initScene(): void {
  scene = new THREE.Scene();

  const canvas = document.getElementById('canvas-container')!;
  camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  canvas.appendChild(renderer.domElement);

  camState = {
    targetTheta: 0,
    targetPhi: Math.PI / 3,
    targetRadius: BASE_DISTANCE,
    currentTheta: 0,
    currentPhi: Math.PI / 3,
    currentRadius: BASE_DISTANCE,
    damping: DAMPING,
    lastTheta: 0,
    lastPhi: Math.PI / 3,
  };

  const gender = ($('#genderSelect') as HTMLSelectElement).value as 'male' | 'female';
  cloth = new ParticleCloth(PARTICLE_COUNT, gender);
  scene.add(cloth.group);
  cloth.updateScale(window.innerHeight, FOV);

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointerdown', onMouseDown);
  window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('pointerup', onMouseUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);

  updateCamera(0);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (cloth) cloth.updateScale(window.innerHeight, FOV);
}

function onMouseDown(e: PointerEvent): void {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function onMouseMove(e: PointerEvent): void {
  if (!isDragging) return;
  const dx = (e.clientX - lastMouseX) * 0.005;
  const dy = (e.clientY - lastMouseY) * 0.005;
  camState.targetTheta -= dx;
  camState.targetPhi += dy;
  camState.targetPhi = Math.max(-0.524, Math.min(1.047, camState.targetPhi));
  rotationDeltaMag = Math.sqrt(dx * dx + dy * dy);
  accumulatedRotation += rotationDeltaMag;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseUp(e: PointerEvent): void {
  isDragging = false;
  try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  camState.targetRadius += e.deltaY * 0.003;
  camState.targetRadius = Math.max(BASE_DISTANCE * 0.5, Math.min(BASE_DISTANCE * 3.0, camState.targetRadius));
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === '1') {
    cloth.setMode(ClothMode.Cloak);
    showToast('星尘斗篷');
  } else if (e.key === '2') {
    cloth.setMode(ClothMode.Robe);
    showToast('流光长袍');
  } else if (e.key === '3') {
    cloth.setMode(ClothMode.Armor);
    showToast('辉光铠甲');
  }
}

function showToast(text: string): void {
  const toast = $('#modeToast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1200);
}

function updateCamera(dt: number): void {
  camState.lastTheta = camState.currentTheta;
  camState.lastPhi = camState.currentPhi;

  const f = 1.0 - camState.damping;
  camState.currentTheta += (camState.targetTheta - camState.currentTheta) * f;
  camState.currentPhi += (camState.targetPhi - camState.currentPhi) * f;
  camState.currentRadius += (camState.targetRadius - camState.currentRadius) * f;

  const r = camState.currentRadius;
  const theta = camState.currentTheta;
  const phi = camState.currentPhi;
  camera.position.x = r * Math.sin(phi) * Math.sin(theta) + LOOK_AT.x;
  camera.position.y = r * Math.cos(phi) + LOOK_AT.y;
  camera.position.z = r * Math.sin(phi) * Math.cos(theta) + LOOK_AT.z;
  camera.lookAt(LOOK_AT);
}

function handleWeave(): void {
  const text = ($('#textInput') as HTMLTextAreaElement).value.trim();
  if (text.length < 10) {
    alert('请输入至少10个中文字符');
    return;
  }
  if (text.length > 100) {
    alert('文字长度不可超过100字符');
    return;
  }
  const emotions: EmotionWord[] = parseText(text);
  cloth.applyEmotion(emotions);
  showToast('✨ 星尘织衣完成 ✨');
}

function handleRecord(): void {
  if (isRecording) return;
  if (isPlayingBack) { stopPlayback(); }
  isRecording = true;
  recordingFrames = [];
  recordingStartTime = performance.now();
  lastRecordFrameTime = 0;

  const btn = $('#recordBtn');
  btn.classList.add('recording');
  setTimeout(() => btn.classList.remove('recording'), 1000);
  $('#recordingOverlay').style.display = 'flex';
  $('#countdown').textContent = String(recordingDuration);
}

function updateRecording(now: number): void {
  if (!isRecording) return;
  const elapsed = (now - recordingStartTime) / 1000;
  const remaining = Math.max(0, recordingDuration - elapsed);
  $('#countdown').textContent = Math.ceil(remaining).toString();

  const frameInterval = 1000 / recordingFps;
  if (now - lastRecordFrameTime >= frameInterval) {
    lastRecordFrameTime = now;
    const snap = cloth.getSnapshot();
    recordingFrames.push({
      positions: Array.from(snap.positions),
      colors: Array.from(snap.colors),
      opacities: Array.from(snap.opacities),
    });
  }

  if (elapsed >= recordingDuration) {
    finishRecording();
  }
}

function finishRecording(): void {
  isRecording = false;
  $('#recordingOverlay').style.display = 'none';

  const data: RecordingJSON = {
    version: 1,
    particleCount: PARTICLE_COUNT,
    fps: recordingFps,
    duration: recordingDuration,
    frames: recordingFrames,
  };

  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const sizeMB = (blob.size / 1024 / 1024).toFixed(2);

  const a = document.createElement('a');
  a.href = url;
  a.download = `stardust_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  showToast(`录制完成 (${sizeMB} MB)`);
}

function handlePlayback(): void {
  if (isRecording) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text) as RecordingJSON;
      if (!data.frames || data.frames.length === 0) throw new Error('无效录制文件');
      startPlayback(data);
    } catch (err) {
      alert('回放文件加载失败：' + (err as Error).message);
    }
  };
  input.click();
}

function startPlayback(data: RecordingJSON): void {
  isPlayingBack = true;
  playbackFrames = data.frames;
  playbackFps = data.fps || 30;
  playbackStartTime = performance.now();
  showToast('▶ 回放开始');
}

function stopPlayback(): void {
  isPlayingBack = false;
  playbackFrames = [];
}

function updatePlayback(now: number): void {
  if (!isPlayingBack || playbackFrames.length === 0) return;
  const elapsed = (now - playbackStartTime) / 1000;
  const frameIndex = Math.min(playbackFrames.length - 1, Math.floor(elapsed * playbackFps));
  if (frameIndex >= playbackFrames.length - 1) {
    stopPlayback();
    showToast('回放结束');
    return;
  }
  const frame = playbackFrames[frameIndex];
  cloth.setPositions(new Float32Array(frame.positions));
  cloth.setColors(new Float32Array(frame.colors));
  cloth.setOpacities(new Float32Array(frame.opacities));
}

function handleGenderChange(): void {
  const gender = ($('#genderSelect') as HTMLSelectElement).value as 'male' | 'female';
  if (cloth) {
    scene.remove(cloth.group);
    cloth.dispose();
  }
  cloth = new ParticleCloth(PARTICLE_COUNT, gender);
  scene.add(cloth.group);
  cloth.updateScale(window.innerHeight, FOV);
}

function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - (animate as any)._last || now) / 1000);
  (animate as any)._last = now;

  updateCamera(dt);

  if (!isPlayingBack) {
    const perf = cloth.update(dt, rotationDeltaMag);
    perfLogTimer += dt;
    if (perfLogTimer >= 3) {
      perfLogTimer = 0;
      const samples = cloth.perfSamples;
      if (samples.length > 30) {
        const avg = samples.reduce((s, x) => s + x.frameTime, 0) / samples.length;
        const max = samples.reduce((m, x) => Math.max(m, x.frameTime), 0);
        // eslint-disable-next-line no-console
        console.log(`[Perf] ${samples.length} frames — avg: ${avg.toFixed(2)}ms, max: ${max.toFixed(2)}ms, mem-estimate: ${estimateMemMB().toFixed(1)}MB`);
      }
    }
  }

  if (!isDragging) {
    rotationDeltaMag *= 0.9;
  }

  if (isRecording) updateRecording(now);
  if (isPlayingBack) updatePlayback(now);

  renderer.render(scene, camera);
}

function estimateMemMB(): number {
  const n = PARTICLE_COUNT;
  const dataSizeKB = (n * (3 + 3 + 3 + 6 + 3 + 1 + 1 + 1) * 4) / 1024; // position, base, colors, tangents, normals, opacity, size, seed
  const trailAndPrev = (n * 3 * 7 * 4) / 1024; // prevPositions + trail buffers
  return 20 + (dataSizeKB + trailAndPrev) / 1024;
}

function hideLoading(): void {
  const overlay = $('#loadingOverlay');
  setTimeout(() => overlay.classList.add('hidden'), 200);
  setTimeout(() => overlay.remove(), 1200);
}

window.addEventListener('DOMContentLoaded', () => {
  initScene();

  $('#weaveBtn').addEventListener('click', handleWeave);
  $('#recordBtn').addEventListener('click', handleRecord);
  $('#playbackBtn').addEventListener('click', handlePlayback);
  $('#genderSelect').addEventListener('change', handleGenderChange);

  hideLoading();
  animate();
});
