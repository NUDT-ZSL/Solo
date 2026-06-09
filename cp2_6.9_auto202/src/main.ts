import './style.css';
import { Paper } from './paper';
import { Preview3D } from './preview3D';
import { UI } from './ui';

function initApp(): void {
  const paperCanvas = document.getElementById('paperCanvas') as HTMLCanvasElement;
  if (!paperCanvas) {
    console.error('paperCanvas not found');
    return;
  }

  const paper = new Paper(paperCanvas);
  const preview = new Preview3D('previewCanvas');
  const ui = new UI(paper);

  const initialState = paper.getState();
  preview.setTemplate(initialState.template, initialState.color);

  paper.on('foldUpdate', (data: unknown) => {
    const foldData = data as { corners: { x: number; y: number }[]; stepIndex: number; progress?: number };
    preview.updateFoldState(foldData);
  });

  paper.on('foldComplete', (data: unknown) => {
    const foldData = data as { stepIndex: number; cornerIndex: number };
    preview.completeStep(foldData.stepIndex);
    ui.updateSteps();
  });

  paper.on('stepUpdate', () => {
    ui.updateSteps();
  });

  paper.on('templateChange', (data: unknown) => {
    const templateData = data as { templateIndex: number; template: { id: string; name: string; achievementText: string } };
    const state = paper.getState();
    preview.setTemplate(state.template, state.color);
    ui.updateSteps();
  });

  paper.on('allComplete', (data: unknown) => {
    const completeData = data as { template: { achievementText: string } };
    preview.setAllComplete();
    ui.showAchievement(completeData.template.achievementText);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
