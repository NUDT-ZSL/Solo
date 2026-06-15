import { Simulation } from './simulation';
import { UI } from './ui';

function main(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('找不到Canvas元素');
    return;
  }

  const simulation = new Simulation(canvas);
  const ui = new UI(canvas, simulation);

  let running = true;

  function loop(time: number): void {
    if (!running) return;

    simulation.update(time);
    ui.update();
    simulation.render();
    ui.render();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
