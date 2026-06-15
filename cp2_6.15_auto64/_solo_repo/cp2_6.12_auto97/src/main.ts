import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { InteractionManager } from './interactionManager';
import { MOLECULE_LIBRARY, loadMolecule } from './moleculeData';

let sceneManager: SceneManager;
let interactionManager: InteractionManager;
let currentMoleculeId: string = 'water';
let lastTime: number = 0;
let animationFrameId: number | null = null;
let panelCollapsed: boolean = false;

function init(): void {
  const canvas = document.getElementById('molecule-canvas') as HTMLCanvasElement;
  const container = document.getElementById('canvas-container')!;

  sceneManager = new SceneManager(canvas);
  interactionManager = new InteractionManager(sceneManager, container, canvas);

  setupMoleculeList();
  setupCollapsePanel();
  setupSearch();

  loadInitialMolecule();

  window.addEventListener('resize', onWindowResize);

  lastTime = performance.now();
  animate();
}

function setupMoleculeList(): void {
  const listContainer = document.querySelector('.molecule-list') as HTMLElement;
  if (!listContainer) return;

  listContainer.innerHTML = '';

  MOLECULE_LIBRARY.forEach((mol) => {
    const item = document.createElement('div');
    item.className = 'molecule-item';
    item.dataset.id = mol.id;
    item.innerHTML = `
      <div class="molecule-name">${mol.name}</div>
      <div class="molecule-formula" style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${mol.formula}</div>
    `;
    item.addEventListener('click', () => selectMolecule(mol.id));
    listContainer.appendChild(item);
  });

  updateActiveMoleculeItem();
}

function updateActiveMoleculeItem(): void {
  const items = document.querySelectorAll('.molecule-item');
  items.forEach((item) => {
    const el = item as HTMLElement;
    el.classList.toggle('active', el.dataset.id === currentMoleculeId);
  });
}

function setupSearch(): void {
  const searchBox = document.querySelector('.search-box') as HTMLInputElement;
  if (!searchBox) return;

  searchBox.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    const items = document.querySelectorAll('.molecule-item');
    items.forEach((item) => {
      const el = item as HTMLElement;
      const name = el.querySelector('.molecule-name')?.textContent?.toLowerCase() || '';
      const formula = el.querySelector('.molecule-formula')?.textContent?.toLowerCase() || '';
      const match = name.includes(query) || formula.includes(query);
      el.style.display = match ? '' : 'none';
    });
  });
}

function setupCollapsePanel(): void {
  const collapseBtn = document.querySelector('.collapse-btn') as HTMLElement;
  const panel = document.querySelector('.molecule-list-panel') as HTMLElement;
  if (!collapseBtn || !panel) return;

  collapseBtn.addEventListener('click', () => {
    panelCollapsed = !panelCollapsed;
    panel.classList.toggle('collapsed', panelCollapsed);
    collapseBtn.textContent = panelCollapsed ? '→' : '←';
  });
}

function loadInitialMolecule(): void {
  loadMolecule(currentMoleculeId)
    .then((data) => {
      sceneManager.loadMolecule(data);
    })
    .catch((err) => {
      console.error('Failed to load molecule:', err);
    });
}

function selectMolecule(id: string): void {
  if (id === currentMoleculeId) return;

  currentMoleculeId = id;
  updateActiveMoleculeItem();

  loadMolecule(id)
    .then((data) => {
      sceneManager.startMoleculeTransition(data);
    })
    .catch((err) => {
      console.error('Failed to load molecule:', err);
    });
}

function onWindowResize(): void {
  sceneManager.resize(window.innerWidth, window.innerHeight);
  interactionManager.resize();
}

function animate(): void {
  animationFrameId = requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  interactionManager.update(deltaTime);
  sceneManager.update(deltaTime);
}

function dispose(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', onWindowResize);
  interactionManager.dispose();
  sceneManager.dispose();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { sceneManager, interactionManager, dispose };
