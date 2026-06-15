import { Config, DEFAULT_CONFIG, INFLUENCE_RADIUS } from './utils';
import { Grid } from './grid';
import { Interaction } from './interaction';
import { ControlPanel } from './control';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let config: Config = { ...DEFAULT_CONFIG, theme: { ...DEFAULT_CONFIG.theme } };
let grid: Grid;
let interaction: Interaction;
let controlPanel: ControlPanel;
let animId = 0;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  grid.rebuild(window.innerWidth, window.innerHeight, config);
  interaction.setGrid(grid);
}

function loop(): void {
  grid.update();
  ctx.save();
  grid.render(ctx);
  ctx.restore();
  animId = requestAnimationFrame(loop);
}

function init(): void {
  grid = new Grid(window.innerWidth, window.innerHeight, config);

  interaction = new Interaction(canvas, grid, config);
  interaction.setOnClick((x: number, y: number) => {
    grid.cutAt(x, y, INFLUENCE_RADIUS * 0.4);
  });

  controlPanel = new ControlPanel(
    config,
    (newConfig: Config) => {
      config = { ...newConfig, theme: { ...newConfig.theme } };
      interaction.setConfig(config);
      grid.rebuild(window.innerWidth, window.innerHeight, config);
      interaction.setGrid(grid);
    },
    () => {
      config = { ...DEFAULT_CONFIG, theme: { ...DEFAULT_CONFIG.theme } };
      interaction.setConfig(config);
      grid.rebuild(window.innerWidth, window.innerHeight, config);
      interaction.setGrid(grid);
    },
  );

  resize();
  loop();
}

window.addEventListener('resize', () => {
  resize();
});

init();
