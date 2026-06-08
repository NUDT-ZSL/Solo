import { AuroraEngine } from './AuroraEngine';
import { mountControlPanel, ParamValues } from './ControlPanel';

const sceneContainer = document.getElementById('scene-container')!;
const panelContainer = document.getElementById('control-panel-root')!;

const engine = new AuroraEngine(sceneContainer);

mountControlPanel(panelContainer, (values: ParamValues) => {
  engine.updateParams({
    auroraSpeed: values.auroraSpeed ?? 1.0,
    crystalBrightness: values.crystalBrightness ?? 1.0,
    particleDensity: values.particleDensity ?? 1.0,
  });
});

engine.start();

window.addEventListener('beforeunload', () => {
  engine.dispose();
});
