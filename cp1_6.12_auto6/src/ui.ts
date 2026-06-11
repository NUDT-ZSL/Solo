import * as THREE from 'three';
import type { MoleculeData, AtomData } from './data';
import type { BondAngleInfo } from './molecule';
import { calculateCoordinationNumber, calculateBondAngles } from './molecule';

export interface AtomInfo {
  atomData: AtomData;
  atomIndex: number;
  coordinationNumber: number;
  bondAngles: BondAngleInfo[];
  moleculeData: MoleculeData;
}

export interface InfoCard {
  element: HTMLElement;
  update: (info: AtomInfo) => void;
  hide: () => void;
}

export function createControlPanel(
  molecules: MoleculeData[],
  onSelect: (moleculeId: string) => void
): {
  panel: HTMLElement;
  setActiveButton: (moleculeId: string) => void;
  updateFPS: (fps: number) => void;
} {
  const panel = document.createElement('div');
  panel.className = 'control-panel';

  const title = document.createElement('h1');
  title.className = 'panel-title';
  title.textContent = '分子可视化';
  panel.appendChild(title);

  const moleculeSection = document.createElement('div');
  moleculeSection.className = 'panel-section';

  const moleculeLabel = document.createElement('div');
  moleculeLabel.className = 'section-label';
  moleculeLabel.textContent = '选择分子';
  moleculeSection.appendChild(moleculeLabel);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'molecule-buttons';

  const buttons: Map<string, HTMLButtonElement> = new Map();

  molecules.forEach((molecule) => {
    const button = document.createElement('button');
    button.className = 'molecule-btn';
    button.dataset.moleculeId = molecule.id;

    const btnContent = document.createElement('div');
    btnContent.className = 'btn-content';

    const formula = document.createElement('span');
    formula.className = 'formula';
    formula.textContent = molecule.formula;
    btnContent.appendChild(formula);

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = molecule.name;
    btnContent.appendChild(name);

    button.appendChild(btnContent);

    const arrow = document.createElement('span');
    arrow.innerHTML = '→';
    arrow.style.opacity = '0.5';
    arrow.style.fontSize = '18px';
    button.appendChild(arrow);

    button.addEventListener('click', () => {
      onSelect(molecule.id);
    });

    buttonsContainer.appendChild(button);
    buttons.set(molecule.id, button);
  });

  moleculeSection.appendChild(buttonsContainer);
  panel.appendChild(moleculeSection);

  const instructions = document.createElement('div');
  instructions.className = 'instructions';
  instructions.innerHTML = `
    <div><span>拖拽</span> 旋转视角</div>
    <div><span>滚轮</span> 缩放</div>
    <div><span>点击原子</span> 查看详情</div>
  `;
  panel.appendChild(instructions);

  const fpsCounter = document.createElement('div');
  fpsCounter.className = 'fps-counter';

  const fpsValue = document.createElement('div');
  fpsValue.className = 'fps-value';
  fpsValue.textContent = '--';

  const fpsLabel = document.createElement('div');
  fpsLabel.className = 'fps-label';
  fpsLabel.textContent = 'FPS';

  fpsCounter.appendChild(fpsValue);
  fpsCounter.appendChild(fpsLabel);
  panel.appendChild(fpsCounter);

  document.body.appendChild(panel);

  return {
    panel,
    setActiveButton: (moleculeId: string) => {
      buttons.forEach((btn, id) => {
        btn.classList.toggle('active', id === moleculeId);
      });
    },
    updateFPS: (fps: number) => {
      fpsValue.textContent = Math.round(fps).toString();
      if (fps >= 55) {
        fpsValue.style.color = '#00d4ff';
      } else if (fps >= 30) {
        fpsValue.style.color = '#ffd700';
      } else {
        fpsValue.style.color = '#ff4444';
      }
    }
  };
}

export function createInfoCard(): InfoCard {
  const card = document.createElement('div');
  card.className = 'info-card';

  const header = document.createElement('div');
  header.className = 'info-header';

  const atomSymbol = document.createElement('div');
  atomSymbol.className = 'atom-symbol';

  const atomInfo = document.createElement('div');
  atomInfo.className = 'atom-info';

  const atomName = document.createElement('div');
  atomName.className = 'atom-name';

  const atomDetail = document.createElement('div');
  atomDetail.className = 'atom-detail';

  atomInfo.appendChild(atomName);
  atomInfo.appendChild(atomDetail);
  header.appendChild(atomSymbol);
  header.appendChild(atomInfo);
  card.appendChild(header);

  const coordSection = document.createElement('div');
  coordSection.className = 'info-section';

  const coordLabel = document.createElement('div');
  coordLabel.className = 'info-section-label';
  coordLabel.textContent = '配位数';

  const coordNumber = document.createElement('div');
  coordNumber.className = 'coord-number';

  coordSection.appendChild(coordLabel);
  coordSection.appendChild(coordNumber);
  card.appendChild(coordSection);

  const anglesSection = document.createElement('div');
  anglesSection.className = 'info-section';

  const anglesLabel = document.createElement('div');
  anglesLabel.className = 'info-section-label';
  anglesLabel.textContent = '键角';

  const anglesContainer = document.createElement('div');
  anglesContainer.className = 'bond-angles';

  anglesSection.appendChild(anglesLabel);
  anglesSection.appendChild(anglesContainer);
  card.appendChild(anglesSection);

  const closeHint = document.createElement('div');
  closeHint.className = 'close-hint';
  closeHint.textContent = '点击空白处关闭';
  card.appendChild(closeHint);

  document.body.appendChild(card);

  return {
    element: card,
    update: (info: AtomInfo) => {
      atomSymbol.textContent = info.atomData.name;
      atomSymbol.style.color = info.atomData.color;
      atomSymbol.style.background = `radial-gradient(circle at 30% 30%, ${info.atomData.color}40, ${info.atomData.color}80)`;
      atomName.textContent = info.atomData.fullName;
      atomDetail.textContent = `所属分子: ${info.moleculeData.formula}`;
      coordNumber.textContent = info.coordinationNumber.toString();

      anglesContainer.innerHTML = '';

      if (info.bondAngles.length === 0) {
        const noAngle = document.createElement('div');
        noAngle.className = 'bond-angle-item';
        noAngle.innerHTML = `
          <span class="bond-angle-label">末端原子</span>
          <span class="bond-angle-value">-</span>
        `;
        anglesContainer.appendChild(noAngle);
      } else {
        info.bondAngles.forEach((angleInfo) => {
          const item = document.createElement('div');
          item.className = 'bond-angle-item';
          item.innerHTML = `
            <span class="bond-angle-label">∠${angleInfo.atom1Name}-${info.atomData.name}-${angleInfo.atom2Name}</span>
            <span class="bond-angle-value">${angleInfo.angle}°</span>
          `;
          anglesContainer.appendChild(item);
        });
      }

      card.classList.add('visible');
    },
    hide: () => {
      card.classList.remove('visible');
    }
  };
}

export interface RaycasterHandler {
  update: (
    camera: THREE.Camera,
    atoms: THREE.Mesh[],
    onAtomClick: (atom: THREE.Mesh, atomIndex: number) => void
  ) => void;
  dispose: () => void;
}

export function setupRaycaster(
  canvas: HTMLCanvasElement
): RaycasterHandler {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let currentAtoms: THREE.Mesh[] = [];
  let currentCamera: THREE.Camera | null = null;
  let currentOnClick: ((atom: THREE.Mesh, atomIndex: number) => void) | null = null;

  function handleClick(event: MouseEvent) {
    if (!currentCamera || !currentOnClick) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, currentCamera);
    const intersects = raycaster.intersectObjects(currentAtoms, false);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object as THREE.Mesh;
      const atomIndex = currentAtoms.indexOf(hitObject);
      if (atomIndex !== -1) {
        currentOnClick(hitObject, atomIndex);
      }
    }
  }

  canvas.addEventListener('click', handleClick);

  return {
    update: (
      camera: THREE.Camera,
      atoms: THREE.Mesh[],
      onAtomClick: (atom: THREE.Mesh, atomIndex: number) => void
    ) => {
      currentCamera = camera;
      currentAtoms = atoms;
      currentOnClick = onAtomClick;
    },
    dispose: () => {
      canvas.removeEventListener('click', handleClick);
    }
  };
}

export function getAtomInfo(
  atomData: AtomData,
  atomIndex: number,
  moleculeData: MoleculeData
): AtomInfo {
  const coordinationNumber = calculateCoordinationNumber(
    moleculeData.atoms,
    moleculeData.bonds,
    atomIndex
  );
  const bondAngles = calculateBondAngles(
    moleculeData.atoms,
    moleculeData.bonds,
    atomIndex
  );

  return {
    atomData,
    atomIndex,
    coordinationNumber,
    bondAngles,
    moleculeData
  };
}
