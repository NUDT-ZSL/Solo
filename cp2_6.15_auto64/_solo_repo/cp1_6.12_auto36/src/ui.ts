import { SimulationState, CelestialBody } from './entities';

export interface UIPanel {
  sliderG: HTMLInputElement;
  valG: HTMLElement;
  speedBtns: NodeListOf<HTMLButtonElement>;
  btnTrail: HTMLButtonElement;
  sliderTrailLen: HTMLInputElement;
  valTrailLen: HTMLElement;
  sliderAMass: HTMLInputElement;
  valAMass: HTMLElement;
  sliderASpeed: HTMLInputElement;
  valASpeed: HTMLElement;
  sliderARadius: HTMLInputElement;
  valARadius: HTMLElement;
  bodyInfo: HTMLElement;
}

export function getUIPanel(): UIPanel {
  return {
    sliderG: document.getElementById('sliderG') as HTMLInputElement,
    valG: document.getElementById('valG') as HTMLElement,
    speedBtns: document.querySelectorAll('[data-speed]') as NodeListOf<HTMLButtonElement>,
    btnTrail: document.getElementById('btnTrail') as HTMLButtonElement,
    sliderTrailLen: document.getElementById('sliderTrailLen') as HTMLInputElement,
    valTrailLen: document.getElementById('valTrailLen') as HTMLElement,
    sliderAMass: document.getElementById('sliderAMass') as HTMLInputElement,
    valAMass: document.getElementById('valAMass') as HTMLElement,
    sliderASpeed: document.getElementById('sliderASpeed') as HTMLInputElement,
    valASpeed: document.getElementById('valASpeed') as HTMLElement,
    sliderARadius: document.getElementById('sliderARadius') as HTMLInputElement,
    valARadius: document.getElementById('valARadius') as HTMLElement,
    bodyInfo: document.getElementById('bodyInfo') as HTMLElement,
  };
}

export function bindUI(ui: UIPanel, state: SimulationState): void {
  const flashValue = (el: HTMLElement) => {
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 200);
  };

  ui.sliderG.addEventListener('input', () => {
    const val = parseFloat(ui.sliderG.value);
    state.G = val;
    ui.valG.textContent = val.toFixed(1);
    flashValue(ui.valG);
  });

  ui.speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed || '1', 10);
      state.timeScale = speed;
      ui.speedBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  ui.btnTrail.addEventListener('click', () => {
    state.trailEnabled = !state.trailEnabled;
    ui.btnTrail.textContent = state.trailEnabled ? '轨迹: 开' : '轨迹: 关';
    ui.btnTrail.classList.toggle('active', state.trailEnabled);
    if (!state.trailEnabled) {
      for (const body of state.bodies) {
        body.clearTrail();
      }
    }
  });

  ui.sliderTrailLen.addEventListener('input', () => {
    const val = parseInt(ui.sliderTrailLen.value, 10);
    state.trailLength = val;
    ui.valTrailLen.textContent = val.toString();
    flashValue(ui.valTrailLen);
    for (const body of state.bodies) {
      body.maxTrailLen = val;
      if (body.trail.length > val) {
        body.trail = body.trail.slice(body.trail.length - val);
      }
    }
  });

  ui.sliderAMass.addEventListener('input', () => {
    ui.valAMass.textContent = parseFloat(ui.sliderAMass.value).toFixed(1);
    flashValue(ui.valAMass);
  });

  ui.sliderASpeed.addEventListener('input', () => {
    ui.valASpeed.textContent = ui.sliderASpeed.value;
    flashValue(ui.valASpeed);
  });

  ui.sliderARadius.addEventListener('input', () => {
    ui.valARadius.textContent = ui.sliderARadius.value;
    flashValue(ui.valARadius);
  });
}

export function updateBodyInfo(ui: UIPanel, state: SimulationState): void {
  const body = state.selectedBody;
  if (!body) {
    ui.bodyInfo.innerHTML = '点击行星查看信息';
    return;
  }

  const star = state.bodies.find((b) => b.isStar);
  const orbRadius = star ? body.orbitalRadius(star).toFixed(1) : '—';
  const speed = body.speed().toFixed(1);
  const period = body.orbitPeriod > 0 ? body.orbitPeriod.toFixed(2) + 's' : '计算中...';

  ui.bodyInfo.innerHTML = `
    <div>名称: <span>${body.name}</span></div>
    <div>质量: <span>${body.mass.toFixed(2)}</span></div>
    <div>速度: <span>${speed}</span> 单位/秒</div>
    <div>轨道半径: <span>${orbRadius}</span></div>
    <div>公转周期: <span>${period}</span></div>
    ${body.isStableOrbit ? '<div style="color:#5f5">✓ 稳定轨道</div>' : ''}
  `;
}

export function getAsteroidParams(ui: UIPanel): {
  mass: number;
  speed: number;
  radius: number;
} {
  return {
    mass: parseFloat(ui.sliderAMass.value),
    speed: parseFloat(ui.sliderASpeed.value),
    radius: parseInt(ui.sliderARadius.value, 10),
  };
}

export function selectBody(
  state: SimulationState,
  body: CelestialBody,
  now: number
): void {
  state.selectedBody = body;
  if (!body.isStar) {
    state.cameraFrom = { ...state.cameraPos };
    state.cameraTarget = body;
    state.cameraTransitionStart = now;
  }
}

export function findBodyAtPosition(
  state: SimulationState,
  worldX: number,
  worldY: number
): CelestialBody | null {
  for (const body of state.bodies) {
    const dx = body.pos.x - worldX;
    const dy = body.pos.y - worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < Math.max(body.radius + 8, 15)) {
      return body;
    }
  }
  return null;
}
