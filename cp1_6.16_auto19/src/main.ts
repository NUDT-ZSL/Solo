import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computeSunPosition, sunPositionToDirection } from './sunCalculator';
import { SceneManager, SelectionRectangle } from './sceneManager';

const app = document.getElementById('app')!;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let sceneManager: SceneManager;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let currentDate: Date = new Date();
let currentTime: number = 12;
const TIME_START = 6;
const TIME_END = 20;

const color1 = new THREE.Color(0x1a1a2e);
const color2 = new THREE.Color(0x16213e);
let frameCount = 0;
let lastTime = performance.now();

function init() {
  scene = new THREE.Scene();
  scene.background = color1.clone();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(30, 25, 30);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  app.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 3, 0);

  const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d26, 0.3);
  scene.add(hemisphereLight);

  sceneManager = new SceneManager(scene, camera, renderer);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createUI();
  setupEventListeners();
  updateSunLight();

  animate();
}

function createUI() {
  const panel = document.createElement('div');
  panel.id = 'control-panel';
  panel.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 300px;
    height: 100vh;
    background: rgba(26, 26, 46, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    padding: 24px 20px;
    z-index: 100;
    transition: transform 0.3s ease;
    overflow-y: auto;
  `;

  const title = document.createElement('h1');
  title.textContent = '日照光影模拟';
  title.style.cssText = `
    color: #FFFFFF;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  `;

  const subtitle = document.createElement('p');
  subtitle.textContent = '建筑采光分析工具';
  subtitle.style.cssText = `
    color: #888899;
    font-size: 13px;
    margin-bottom: 28px;
  `;

  const dateLabel = document.createElement('div');
  dateLabel.className = 'slider-label';
  dateLabel.innerHTML = `<span>日期</span><span id="date-value">${formatDate(currentDate)}</span>`;
  dateLabel.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #E0E0E0;
    font-size: 14px;
    margin-bottom: 12px;
  `;
  (dateLabel.querySelector('span:last-child') as HTMLElement).style.cssText = `
    color: #FFD700;
    font-weight: 500;
  `;

  const dateSlider = document.createElement('input');
  dateSlider.type = 'range';
  dateSlider.min = '1';
  dateSlider.max = '365';
  dateSlider.step = '1';
  dateSlider.value = String(getDayOfYear(currentDate));
  dateSlider.className = 'custom-slider';
  dateSlider.style.cssText = `
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: #4A4A4A;
    border-radius: 3px;
    outline: none;
    margin-bottom: 8px;
  `;

  const dateTicks = document.createElement('div');
  dateTicks.className = 'slider-ticks';
  dateTicks.style.cssText = `
    display: flex;
    justify-content: space-between;
    padding: 0 4px;
    margin-bottom: 24px;
  `;
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  monthNames.forEach((name) => {
    const tick = document.createElement('div');
    tick.className = 'tick-mark';
    tick.innerHTML = `<div style="width: 1px; height: 6px; background: #666; margin: 0 auto 2px;"></div><span style="font-size: 10px; color: #888;">${name}</span>`;
    dateTicks.appendChild(tick);
  });

  const divider = document.createElement('div');
  divider.style.cssText = `
    height: 1px;
    background: #333344;
    margin: 20px 0;
  `;

  const timeLabel = document.createElement('div');
  timeLabel.className = 'slider-label';
  timeLabel.innerHTML = `<span>时间</span><span id="time-value">${formatTime(currentTime)}</span>`;
  timeLabel.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #E0E0E0;
    font-size: 14px;
    margin-bottom: 12px;
  `;
  (timeLabel.querySelector('span:last-child') as HTMLElement).style.cssText = `
    color: #FFD700;
    font-weight: 500;
  `;

  const timeSlider = document.createElement('input');
  timeSlider.type = 'range';
  timeSlider.min = String(TIME_START * 4);
  timeSlider.max = String(TIME_END * 4);
  timeSlider.step = '1';
  timeSlider.value = String(currentTime * 4);
  timeSlider.className = 'custom-slider';
  timeSlider.style.cssText = `
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: #4A4A4A;
    border-radius: 3px;
    outline: none;
    margin-bottom: 28px;
  `;

  const infoBox = document.createElement('div');
  infoBox.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 16px;
    margin-top: 20px;
  `;
  infoBox.innerHTML = `
    <div style="color: #888899; font-size: 12px; margin-bottom: 8px;">操作提示</div>
    <div style="color: #E0E0E0; font-size: 12px; line-height: 1.8;">
      • 拖拽旋转视角<br>
      • 滚轮缩放场景<br>
      • 点击建筑面查看面积<br>
      • 拖拽地面框选阴影区域
    </div>
  `;

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '清除选区';
  clearBtn.style.cssText = `
    width: 100%;
    padding: 12px;
    background: rgba(255, 107, 53, 0.8);
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 20px;
    transition: all 0.2s ease;
  `;
  clearBtn.addEventListener('mouseenter', () => {
    clearBtn.style.background = 'rgba(255, 107, 53, 1)';
    clearBtn.style.transform = 'scale(1.02)';
  });
  clearBtn.addEventListener('mouseleave', () => {
    clearBtn.style.background = 'rgba(255, 107, 53, 0.8)';
    clearBtn.style.transform = 'scale(1)';
  });
  clearBtn.addEventListener('mousedown', () => {
    clearBtn.style.transform = 'scale(0.95)';
  });
  clearBtn.addEventListener('mouseup', () => {
    clearBtn.style.transform = 'scale(1.02)';
  });
  clearBtn.addEventListener('click', () => {
    sceneManager.clearSelections();
  });

  panel.appendChild(title);
  panel.appendChild(subtitle);
  panel.appendChild(dateLabel);
  panel.appendChild(dateSlider);
  panel.appendChild(dateTicks);
  panel.appendChild(divider);
  panel.appendChild(timeLabel);
  panel.appendChild(timeSlider);
  panel.appendChild(infoBox);
  panel.appendChild(clearBtn);

  document.body.appendChild(panel);

  const presetButtons = document.createElement('div');
  presetButtons.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    gap: 12px;
    z-index: 100;
  `;

  const presets = [
    { name: '春分', month: 3, day: 21, color: '#7EC8E3' },
    { name: '夏至', month: 6, day: 22, color: '#FFD700' },
    { name: '冬至', month: 12, day: 22, color: '#B0C4DE' }
  ];

  presets.forEach((preset) => {
    const btn = document.createElement('button');
    btn.textContent = preset.name;
    btn.style.cssText = `
      padding: 10px 20px;
      background: ${preset.color};
      color: ${preset.name === '夏至' ? '#333333' : '#FFFFFF'};
      border: none;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.filter = 'brightness(1.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.filter = 'brightness(1)';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', () => {
      const targetDate = new Date(currentDate.getFullYear(), preset.month - 1, preset.day);
      const targetDay = getDayOfYear(targetDate);
      animateSlider(dateSlider, parseInt(dateSlider.value), targetDay, () => {
        currentDate = targetDate;
        document.getElementById('date-value')!.textContent = formatDate(currentDate);
        updateSunLight();
        updateAllSelections();
      });
    });
    presetButtons.appendChild(btn);
  });

  document.body.appendChild(presetButtons);

  const hamburger = document.createElement('button');
  hamburger.id = 'hamburger-btn';
  hamburger.innerHTML = `
    <div style="width: 22px; height: 2px; background: #E0E0E0; margin: 4px 0; transition: all 0.3s;"></div>
    <div style="width: 22px; height: 2px; background: #E0E0E0; margin: 4px 0; transition: all 0.3s;"></div>
    <div style="width: 22px; height: 2px; background: #E0E0E0; margin: 4px 0; transition: all 0.3s;"></div>
  `;
  hamburger.style.cssText = `
    display: none;
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 200;
    background: rgba(26, 26, 46, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    backdrop-filter: blur(8px);
  `;
  hamburger.addEventListener('click', () => {
    const isOpen = panel.style.transform !== 'translateX(-100%)';
    panel.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0)';
  });
  document.body.appendChild(hamburger);

  const style = document.createElement('style');
  style.textContent = `
    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #FFD700;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      transition: transform 0.15s ease;
    }
    .custom-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }
    .custom-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #FFD700;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }
    @media (max-width: 768px) {
      #control-panel {
        transform: translateX(-100%);
        width: 280px;
      }
      #hamburger-btn {
        display: block;
      }
    }
  `;
  document.head.appendChild(style);

  dateSlider.addEventListener('input', (e) => {
    const dayOfYear = parseInt((e.target as HTMLInputElement).value);
    currentDate = getDateFromDayOfYear(dayOfYear);
    document.getElementById('date-value')!.textContent = formatDate(currentDate);
    updateSunLight();
    updateAllSelections();
  });

  timeSlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    currentTime = value / 4;
    document.getElementById('time-value')!.textContent = formatTime(currentTime);
    updateSunLight();
  });

  checkMobile();
}

function animateSlider(slider: HTMLInputElement, from: number, to: number, callback: () => void) {
  const duration = 400;
  const startTime = performance.now();
  const diff = to - from;

  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    slider.value = String(Math.round(from + diff * eased));

    const dayOfYear = parseInt(slider.value);
    currentDate = getDateFromDayOfYear(dayOfYear);
    document.getElementById('date-value')!.textContent = formatDate(currentDate);
    updateSunLight();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      callback();
    }
  }
  requestAnimationFrame(update);
}

function setupEventListeners() {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const buildingMeshes = sceneManager.getBuildingMeshes();
    const intersects = raycaster.intersectObjects(buildingMeshes, false);

    if (intersects.length > 0) {
      controls.enabled = false;
      sceneManager.highlightFace(intersects[0]);
    } else {
      const groundIntersects = raycaster.intersectObject(sceneManager.getGround());
      if (groundIntersects.length > 0) {
        controls.enabled = false;
        sceneManager.startSelection(e, renderer.domElement.getBoundingClientRect());
      }
    }
  });

  renderer.domElement.addEventListener('mousemove', (e) => {
    const dx = Math.abs(e.clientX - dragStartX);
    const dy = Math.abs(e.clientY - dragStartY);
    if (dx > 3 || dy > 3) {
      isDragging = true;
    }

    if (!controls.enabled) {
      sceneManager.updateSelection(e, renderer.domElement.getBoundingClientRect());
    }
  });

  renderer.domElement.addEventListener('mouseup', (e) => {
    if (!controls.enabled) {
      sceneManager.endSelection(
        e,
        renderer.domElement.getBoundingClientRect(),
        computeShadowCoverageForSelection,
        TIME_START,
        TIME_END
      );
    }
    controls.enabled = true;
  });

  renderer.domElement.addEventListener('mouseleave', () => {
    if (!controls.enabled) {
      sceneManager.endSelection(
        new MouseEvent('mouseup'),
        renderer.domElement.getBoundingClientRect(),
        computeShadowCoverageForSelection,
        TIME_START,
        TIME_END
      );
    }
    controls.enabled = true;
  });

  renderer.domElement.addEventListener('click', (e) => {
    if (isDragging) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const buildingMeshes = sceneManager.getBuildingMeshes();
    const intersects = raycaster.intersectObjects(buildingMeshes, false);

    if (intersects.length > 0) {
      sceneManager.highlightFace(intersects[0]);
    } else {
      sceneManager.clearHighlight();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    checkMobile();
  });

  controls.addEventListener('change', () => {
    updateBackgroundGradient();
    sceneManager.updateSelectionPositions();
    const highlightPos = sceneManager.getHighlightPosition();
    if (highlightPos) {
      sceneManager.updateAreaLabelPosition(highlightPos);
    }
  });
}

function computeShadowCoverageForSelection(timeHours: number): number {
  const sunPos = computeSunPosition(currentDate, timeHours);
  if (sunPos.altitude <= 0) return 0;

  const direction = sunPositionToDirection(sunPos.azimuth, sunPos.altitude);
  const sunDirection = new THREE.Vector3(direction.x, direction.y, direction.z);

  const selections = (sceneManager as any).selectionRectangles as SelectionRectangle[];
  if (selections.length === 0) return 0;

  return sceneManager.getSelectionCoverage(selections[selections.length - 1], sunDirection);
}

function updateAllSelections() {
  sceneManager.updateAllSelections(computeShadowCoverageForSelection, TIME_START, TIME_END);
}

function updateSunLight() {
  const sunPos = computeSunPosition(currentDate, currentTime);
  sceneManager.updateShadow(sunPos.azimuth, sunPos.altitude);
}

function updateBackgroundGradient() {
  const polarAngle = controls.getPolarAngle();
  const t = Math.max(0, Math.min(1, (polarAngle / (Math.PI / 2))));
  scene.background = color1.clone().lerp(color2, t);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDateFromDayOfYear(dayOfYear: number): Date {
  const date = new Date(currentDate.getFullYear(), 0);
  date.setDate(dayOfYear);
  return date;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTime(timeHours: number): string {
  const hours = Math.floor(timeHours);
  const minutes = Math.round((timeHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function checkMobile() {
  const panel = document.getElementById('control-panel')!;
  const hamburger = document.getElementById('hamburger-btn')!;
  if (window.innerWidth <= 768) {
    panel.style.transform = 'translateX(-100%)';
    hamburger.style.display = 'block';
  } else {
    panel.style.transform = 'translateX(0)';
    hamburger.style.display = 'none';
  }
}

function animate() {
  requestAnimationFrame(animate);

  frameCount++;
  const currentTimeMs = performance.now();
  if (currentTimeMs - lastTime >= 1000) {
    lastTime = currentTimeMs;
    frameCount = 0;
  }

  controls.update();
  sceneManager.updateSelectionPositions();

  renderer.render(scene, camera);
}

init();
