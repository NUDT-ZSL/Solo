import type { TreeParams, TreeStats } from './tree';
import { PRESETS } from './tree';

export interface UICallbacks {
  onParamsChange: (params: TreeParams) => void;
  onPresetSelect: (params: TreeParams) => void;
  onSave: () => void;
}

let callbacks: UICallbacks | null = null;
let currentParams: TreeParams | null = null;

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

function syncSliderInput(
  sliderId: string,
  inputId: string,
  paramKey: keyof TreeParams,
  min: number,
  max: number,
  step: number
): void {
  const slider = document.getElementById(sliderId) as HTMLInputElement;
  const input = document.getElementById(inputId) as HTMLInputElement;

  if (!slider || !input) return;

  const updateFromSlider = (): void => {
    const val = parseFloat(slider.value);
    input.value = Number.isInteger(step) ? String(Math.round(val)) : val.toFixed(2);
    emitChange(paramKey, val);
  };

  const updateFromInput = (): void => {
    let val = parseFloat(input.value);
    if (isNaN(val)) {
      val = parseFloat(slider.value);
    }
    val = clamp(val, min, max);
    input.value = Number.isInteger(step) ? String(Math.round(val)) : val.toFixed(2);
    slider.value = String(val);
    emitChange(paramKey, val);
  };

  slider.addEventListener('input', updateFromSlider);
  input.addEventListener('change', updateFromInput);
  input.addEventListener('blur', updateFromInput);
}

function emitChange(key: keyof TreeParams, value: number): void {
  if (!callbacks || !currentParams) return;
  const newParams: TreeParams = { ...currentParams, [key]: value };
  currentParams = newParams;
  callbacks.onParamsChange(newParams);
}

export function initUI(params: TreeParams, cb: UICallbacks): void {
  currentParams = { ...params };
  callbacks = cb;

  syncSliderInput('slider-depth', 'input-depth', 'depth', 1, 8, 1);
  syncSliderInput('slider-angle', 'input-angle', 'angle', 10, 80, 1);
  syncSliderInput('slider-ratio', 'input-ratio', 'lengthRatio', 0.3, 1, 0.01);
  syncSliderInput('slider-trunk', 'input-trunk', 'trunkLength', 30, 100, 1);

  document.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      const preset = PRESETS.find((p) => p.name === presetName);
      if (preset && callbacks) {
        setParamsUI(preset.params);
        currentParams = { ...preset.params };
        callbacks.onPresetSelect(preset.params);
      }
    });
  });

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn && callbacks) {
    saveBtn.addEventListener('click', () => {
      if (callbacks) callbacks.onSave();
    });
  }

  const toggleBtn = document.getElementById('toggle-btn');
  const panel = document.getElementById('panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('open');
    });
  }

  handleResponsiveLayout();
  window.addEventListener('resize', handleResponsiveLayout);
}

export function setParamsUI(params: TreeParams): void {
  const sliderDepth = document.getElementById('slider-depth') as HTMLInputElement;
  const inputDepth = document.getElementById('input-depth') as HTMLInputElement;
  const sliderAngle = document.getElementById('slider-angle') as HTMLInputElement;
  const inputAngle = document.getElementById('input-angle') as HTMLInputElement;
  const sliderRatio = document.getElementById('slider-ratio') as HTMLInputElement;
  const inputRatio = document.getElementById('input-ratio') as HTMLInputElement;
  const sliderTrunk = document.getElementById('slider-trunk') as HTMLInputElement;
  const inputTrunk = document.getElementById('input-trunk') as HTMLInputElement;

  if (sliderDepth) sliderDepth.value = String(params.depth);
  if (inputDepth) inputDepth.value = String(params.depth);
  if (sliderAngle) sliderAngle.value = String(params.angle);
  if (inputAngle) inputAngle.value = String(params.angle);
  if (sliderRatio) sliderRatio.value = String(params.lengthRatio);
  if (inputRatio) inputRatio.value = params.lengthRatio.toFixed(2);
  if (sliderTrunk) sliderTrunk.value = String(params.trunkLength);
  if (inputTrunk) inputTrunk.value = String(params.trunkLength);
}

export function updateStats(stats: TreeStats): void {
  const branchesEl = document.getElementById('stat-branches');
  const nodesEl = document.getElementById('stat-nodes');
  const heightEl = document.getElementById('stat-height');
  const avgAngleEl = document.getElementById('stat-avgangle');
  const depthEl = document.getElementById('stat-depth');

  if (branchesEl) branchesEl.textContent = String(stats.totalBranches);
  if (nodesEl) nodesEl.textContent = String(stats.totalNodes);
  if (heightEl) heightEl.textContent = String(stats.maxHeight);
  if (avgAngleEl) avgAngleEl.textContent = `${stats.avgAngle}°`;
  if (depthEl) depthEl.textContent = String(stats.currentDepth);
}

export function showSaveSuccess(): void {
  const saveBtn = document.getElementById('save-btn');
  const saveCheck = document.getElementById('save-check');

  if (saveBtn && saveCheck) {
    saveBtn.classList.add('saving');
    saveCheck.classList.add('show');

    setTimeout(() => {
      saveBtn.classList.remove('saving');
      saveCheck.classList.remove('show');
    }, 1000);
  }
}

export function handleResponsiveLayout(): void {
  const panel = document.getElementById('panel');
  const toggleBtn = document.getElementById('toggle-btn');

  if (!panel || !toggleBtn) return;

  if (window.innerWidth <= 768) {
    panel.classList.remove('open');
  } else {
    panel.classList.remove('open');
  }
}
