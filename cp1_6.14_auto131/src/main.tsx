/* =========================================================
 * main.tsx —— 应用入口
 * 职责：初始化 React 根组件，创建 SceneManager 实例，
 *       启动 DataEngine，串联整个应用。
 *
 * 调用关系：
 *   main.tsx ── creates ──> SceneManager (挂载到 #scene-container)
 *             ── creates ──> DataEngine   (通过 eventBus 通信)
 *             ── renders ──> UIPanel      (React 组件树)
 * ========================================================= */

import { createRoot } from 'react-dom/client';
import { UIPanel } from './ui-panel';
import { SceneManager } from './scene-manager';
import { DataEngine } from './data-engine';
import { eventBus } from './event-bus';
import './index.css';

const container = document.getElementById('scene-container');
if (!container) {
  throw new Error('scene-container not found');
}

const sceneManager = new SceneManager(container, eventBus);
sceneManager.start();

const dataEngine = new DataEngine(eventBus);
dataEngine.start(2000);

const root = createRoot(document.getElementById('root')!);
root.render(<UIPanel sceneManager={sceneManager} bus={eventBus} />);

window.addEventListener('beforeunload', () => {
  dataEngine.stop();
  sceneManager.dispose();
});
