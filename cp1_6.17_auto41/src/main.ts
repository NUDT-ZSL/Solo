import { initScene, switchMolecule, updateMousePosition, getSceneContext } from './scene';
import { useClipper, createFloatingText } from './tools';
import { initPanel, setMolecule, notifyBondBroken } from './panel';
import { MOLECULE_TYPES, createMolecule } from './models';

function bootstrap() {
  const sceneContainer = document.getElementById('scene-container')!;
  const appEl = document.getElementById('app')!;

  const ctx = initScene(sceneContainer);

  initPanel(appEl);
  const initial = createMolecule('caffeine');
  setMolecule(initial);

  ctx.onMoleculeChanged = (mol) => {
    setMolecule(mol);
  };

  ctx.onBondBroken = () => {
    notifyBondBroken();
  };

  const clipper = useClipper();
  clipper.onBondBreak((_bondId, worldPos) => {
    const screen = worldPos.clone().project(ctx.camera);
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    const clientX = (screen.x * 0.5 + 0.5) * rect.width + rect.left;
    const clientY = (-screen.y * 0.5 + 0.5) * rect.height + rect.top;
    createFloatingText(document.body, clientX, clientY, '+1');
  });

  sceneContainer.addEventListener('mousemove', (e) => {
    updateMousePosition(e);
  });

  const molBtns = document.querySelectorAll<HTMLButtonElement>('.molecule-btn');
  molBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const molKey = btn.dataset.mol;
      if (!molKey || ctx.animating) return;

      molBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (clipper.isActive()) {
        clipper.disable();
        document.getElementById('clipper-btn')?.classList.remove('active');
      }

      await switchMolecule(molKey);
    });
  });

  const clipperBtn = document.getElementById('clipper-btn')!;
  clipperBtn.addEventListener('click', () => {
    if (clipper.isActive()) {
      clipper.disable();
      clipperBtn.classList.remove('active');
    } else {
      clipper.enable();
      clipperBtn.classList.add('active');
    }
  });

  MOLECULE_TYPES;
}

document.addEventListener('DOMContentLoaded', bootstrap);
