import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneManager } from './sceneManager';

const DEFAULT_POEM = '云想衣裳花想容，春风拂槛露华浓。若非群玉山头见，会向瑶台月下逢。';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let sceneManager: SceneManager;
let emotionLabel: HTMLDivElement;
let resetBtn: HTMLButtonElement;
let modal: HTMLDivElement;
let textInput: HTMLTextAreaElement;
let generateBtn: HTMLButtonElement;
let cancelBtn: HTMLButtonElement;
let charCount: HTMLSpanElement;
let canvas: HTMLCanvasElement;
let isDragging = false;
let pointerDownPos = { x: 0, y: 0 };

function init() {
  const container = document.getElementById('app');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 5, 35);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a0f, 1);
  container.appendChild(renderer.domElement);
  canvas = renderer.domElement;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.enablePan = false;
  controls.target.set(0, 0, 0);
  controls.update();

  sceneManager = new SceneManager(scene, camera, renderer);
  sceneManager.setEmotionChangeCallback((label) => {
    updateEmotionLabel(label);
  });

  createUI(container);
  bindEvents();
  sceneManager.generateSculpture(DEFAULT_POEM);
  animate();
}

function createUI(container: HTMLElement) {
  resetBtn = document.createElement('button');
  resetBtn.textContent = '↻';
  Object.assign(resetBtn.style, {
    position: 'fixed',
    top: '20px',
    left: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: '0.5px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.08)',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    opacity: '0.3',
    transition: 'all 0.3s ease-out',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: '1000',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    outline: 'none',
    userSelect: 'none'
  });
  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.opacity = '0.8';
    resetBtn.style.boxShadow = '0 0 20px rgba(255,255,255,0.3)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.opacity = '0.3';
    resetBtn.style.boxShadow = 'none';
  });
  resetBtn.addEventListener('click', openModal);
  container.appendChild(resetBtn);

  emotionLabel = document.createElement('div');
  Object.assign(emotionLabel.style, {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    color: 'white',
    opacity: '0.5',
    fontSize: '12px',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    letterSpacing: '2px',
    zIndex: '1000',
    pointerEvents: 'none',
    userSelect: 'none'
  });
  emotionLabel.textContent = '';
  container.appendChild(emotionLabel);

  modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2000',
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)'
  });

  const modalBox = document.createElement('div');
  Object.assign(modalBox.style, {
    width: '420px',
    maxWidth: '90vw',
    padding: '32px',
    borderRadius: '16px',
    background: 'rgba(20,20,30,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '0.5px solid rgba(255,255,255,0.15)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  });

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = '输入诗歌文本';
  Object.assign(modalTitle.style, {
    color: 'white',
    fontSize: '16px',
    marginBottom: '16px',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    fontWeight: 'normal',
    letterSpacing: '1px'
  });

  textInput = document.createElement('textarea');
  textInput.maxLength = 100;
  textInput.placeholder = '请输入短诗或日记文本（最多100字，支持中英文）';
  Object.assign(textInput.style, {
    width: '100%',
    height: '120px',
    padding: '12px',
    borderRadius: '8px',
    border: '0.5px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '14px',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '1.6',
    transition: 'border-color 0.3s'
  });
  textInput.addEventListener('focus', () => {
    textInput.style.borderColor = 'rgba(255,255,255,0.5)';
  });
  textInput.addEventListener('blur', () => {
    textInput.style.borderColor = 'rgba(255,255,255,0.2)';
  });

  const countWrapper = document.createElement('div');
  Object.assign(countWrapper.style, {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
    marginBottom: '20px'
  });
  charCount = document.createElement('span');
  Object.assign(charCount.style, {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif'
  });
  charCount.textContent = '0/100';
  countWrapper.appendChild(charCount);

  textInput.addEventListener('input', () => {
    charCount.textContent = `${textInput.value.length}/100`;
  });

  const btnWrapper = document.createElement('div');
  Object.assign(btnWrapper.style, {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  });

  cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  Object.assign(cancelBtn.style, {
    padding: '10px 24px',
    borderRadius: '8px',
    border: '0.5px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    transition: 'all 0.3s ease-out',
    outline: 'none'
  });
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = 'rgba(255,255,255,0.1)';
    cancelBtn.style.color = 'white';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'rgba(255,255,255,0.05)';
    cancelBtn.style.color = 'rgba(255,255,255,0.6)';
  });
  cancelBtn.addEventListener('click', closeModal);

  generateBtn = document.createElement('button');
  generateBtn.textContent = '生成';
  Object.assign(generateBtn.style, {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    transition: 'all 0.3s ease-out',
    outline: 'none'
  });
  generateBtn.addEventListener('mouseenter', () => {
    generateBtn.style.background = 'rgba(255,255,255,0.25)';
    generateBtn.style.boxShadow = '0 0 20px rgba(255,255,255,0.15)';
  });
  generateBtn.addEventListener('mouseleave', () => {
    generateBtn.style.background = 'rgba(255,255,255,0.15)';
    generateBtn.style.boxShadow = 'none';
  });
  generateBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
      sceneManager.generateSculpture(text);
    }
    closeModal();
  });

  btnWrapper.appendChild(cancelBtn);
  btnWrapper.appendChild(generateBtn);

  modalBox.appendChild(modalTitle);
  modalBox.appendChild(textInput);
  modalBox.appendChild(countWrapper);
  modalBox.appendChild(btnWrapper);
  modal.appendChild(modalBox);
  container.appendChild(modal);
}

function openModal() {
  modal.style.display = 'flex';
  textInput.value = '';
  charCount.textContent = '0/100';
  setTimeout(() => textInput.focus(), 50);
}

function closeModal() {
  modal.style.display = 'none';
}

function updateEmotionLabel(label: string) {
  emotionLabel.textContent = label;
  emotionLabel.style.opacity = '0';
  setTimeout(() => {
    emotionLabel.style.transition = 'opacity 0.5s ease-out';
    emotionLabel.style.opacity = '0.5';
  }, 100);
}

function bindEvents() {
  window.addEventListener('resize', onResize);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('click', onClick);
}

function onPointerDown(e: PointerEvent) {
  isDragging = false;
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
}

function onPointerMove(e: PointerEvent) {
  const dx = Math.abs(e.clientX - pointerDownPos.x);
  const dy = Math.abs(e.clientY - pointerDownPos.y);
  if (dx > 5 || dy > 5) {
    isDragging = true;
  }
}

function onPointerUp() {
}

function onClick(e: MouseEvent) {
  if (isDragging) return;
  const rect = canvas.getBoundingClientRect();
  sceneManager.handlePointerClick(e.clientX, e.clientY, rect);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  sceneManager.handleResize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  sceneManager.update();
}

window.addEventListener('DOMContentLoaded', init);
