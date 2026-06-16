import { eventBus } from './eventBus';
import { initVisualizer, setState, VisualizerState } from './visualizer';
import { initUI, getCanvas } from './ui';

const initialState: VisualizerState = {
  selectedBlockId: null,
  hoveredBlockId: null,
  zoomLevel: 1,
  offsetX: 0,
  offsetY: 0,
  gridGap: 80,
  favorites: new Set<number>(),
  mode: 'map',
  currentTime: 23 * 60,
  highlightedEventIndex: -1,
  isAnimating: false,
  narrativeProgress: 0
};

function init(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App root element not found');
    return;
  }

  setState(initialState);
  
  initUI(app);
  
  const canvas = getCanvas();
  initVisualizer(canvas, initialState);
  
  if (window.innerWidth < 768) {
    setState({ gridGap: 50 });
  }
  
  window.addEventListener('resize', handleResize);
  
  console.log('流光速写·城市记忆 - 已启动');
  console.log('EventBus:', eventBus);
}

function handleResize(): void {
  if (window.innerWidth < 768) {
    setState({ gridGap: 50 });
  } else {
    setState({ gridGap: 80 });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
