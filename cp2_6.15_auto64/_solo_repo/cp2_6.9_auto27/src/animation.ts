import * as THREE from 'three';
import * as Tone from 'tone';
import { BuildingData } from './city';

interface ActiveAnimation {
  data: BuildingData;
  startTime: number;
  duration: number;
  originalColors: Map<THREE.Mesh, THREE.Color>;
}

let synth: Tone.PolySynth | null = null;
const activeAnimations = new Set<ActiveAnimation>();
const GOLD = new THREE.Color(0xffd700);
const BLUE = new THREE.Color(0x00bfff);

function ensureSynth(): void {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.4,
        release: 1.2,
      },
    }).toDestination();
    synth.volume.value = -6;
  }
}

function heightToNotes(height: number): string[] {
  const baseNotes = ['C4', 'E4', 'G4'];
  const octaveShift = Math.min(2, Math.floor((height - 2) / 3));
  return baseNotes.map((n) => {
    const note = n.replace(/\d/, (d) => String(parseInt(d) + octaveShift));
    return note;
  });
}

export async function triggerLightShow(
  data: BuildingData
): Promise<void> {
  ensureSynth();
  await Tone.start();

  const originalColors = new Map<THREE.Mesh, THREE.Color>();
  data.windows.forEach((win) => {
    const mat = win.material as THREE.MeshBasicMaterial;
    originalColors.set(win, mat.color.clone());
  });

  const anim: ActiveAnimation = {
    data,
    startTime: performance.now(),
    duration: 2000,
    originalColors,
  };
  activeAnimations.add(anim);

  if (synth) {
    const notes = heightToNotes(data.height);
    synth.triggerAttackRelease(notes, '1n');
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function updateAnimations(): void {
  const now = performance.now();
  const toRemove: ActiveAnimation[] = [];

  activeAnimations.forEach((anim) => {
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / anim.duration);

    let targetColor: THREE.Color;
    let phaseT: number;

    if (t < 0.5) {
      phaseT = easeInOutCubic(t * 2);
      const origFirst = [...anim.originalColors.values()][0] || new THREE.Color(0x1a2a4a);
      targetColor = origFirst.clone().lerp(GOLD, phaseT);
    } else {
      phaseT = easeInOutCubic((t - 0.5) * 2);
      targetColor = GOLD.clone().lerp(BLUE, phaseT);
    }

    anim.data.windows.forEach((win) => {
      const mat = win.material as THREE.MeshBasicMaterial;
      mat.color.copy(targetColor);
    });

    if (t >= 1) {
      anim.data.windows.forEach((win) => {
        const mat = win.material as THREE.MeshBasicMaterial;
        const orig = anim.originalColors.get(win);
        if (orig) mat.color.copy(orig);
      });
      toRemove.push(anim);
    }
  });

  toRemove.forEach((a) => activeAnimations.delete(a));
}

interface HoverState {
  targetOpacity: number;
  currentOpacity: number;
}

const hoverStates = new Map<THREE.LineSegments, HoverState>();

export function setBuildingHovered(
  edges: THREE.LineSegments,
  hovered: boolean
): void {
  let state = hoverStates.get(edges);
  if (!state) {
    state = { targetOpacity: 0, currentOpacity: 0 };
    hoverStates.set(edges, state);
  }
  state.targetOpacity = hovered ? 0.3 : 0;
}

export function updateHoverEffects(delta: number): void {
  hoverStates.forEach((state, edges) => {
    const mat = edges.material as THREE.LineBasicMaterial;
    const diff = state.targetOpacity - state.currentOpacity;
    const smooth = delta * (state.targetOpacity > 0 ? 5 : 3.33);
    state.currentOpacity += diff * Math.min(1, smooth);
    mat.opacity = state.currentOpacity;
  });
}
