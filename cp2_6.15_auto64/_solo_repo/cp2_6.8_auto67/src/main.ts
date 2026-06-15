import { MapEditor, ToolMode, LINE_COLORS, MetroLine, Station } from './MapEditor';
import { TimeSimulator } from './TimeSimulator';

const canvas = document.getElementById('metroCanvas') as HTMLCanvasElement;
const linesList = document.getElementById('linesList') as HTMLDivElement;
const addLineBtn = document.getElementById('addLineBtn') as HTMLButtonElement;
const contextMenu = document.getElementById('contextMenu') as HTMLDivElement;
const colorPickerOverlay = document.getElementById('colorPickerOverlay') as HTMLDivElement;
const currentTimeEl = document.getElementById('currentTime') as HTMLSpanElement;
const timeline = document.getElementById('timeline') as HTMLDivElement;
const timelineHandle = document.getElementById('timelineHandle') as HTMLDivElement;
const timelineTicks = document.getElementById('timelineTicks') as HTMLDivElement;
const timelineLabels = document.getElementById('timelineLabels') as HTMLDivElement;
const btnRewind = document.getElementById('btnRewind') as HTMLButtonElement;
const btnPlay = document.getElementById('btnPlay') as HTMLButtonElement;
const btnForward = document.getElementById('btnForward') as HTMLButtonElement;
const toolSelect = document.getElementById('toolSelect') as HTMLButtonElement;
const toolAddStation = document.getElementById('toolAddStation') as HTMLButtonElement;
const toolConnect = document.getElementById('toolConnect') as HTMLButtonElement;

const timeSimulator = new TimeSimulator(480);
const mapEditor = new MapEditor(canvas, timeSimulator);

let pendingColorPickerLineId: string | null = null;
let editingStationId: string | null = null;

function initTimelineTicks(): void {
  let ticksHtml = '';
  let labelsHtml = '';
  for (let h = 0; h <= 24; h++) {
    ticksHtml += `<div class="timeline-tick"></div>`;
    labelsHtml += `<span>${h}:00</span>`;
  }
  timelineTicks.innerHTML = ticksHtml;
  timelineLabels.innerHTML = labelsHtml;
}

function updateTimelineUI(): void {
  const progress = timeSimulator.getTimeProgress() * 100;
  timelineHandle.style.left = `${progress}%`;
  currentTimeEl.textContent = timeSimulator.getTimeString();
  mapEditor.markDirty();
}

function updatePlayButton(): void {
  if (timeSimulator.getIsPlaying()) {
    btnPlay.textContent = '⏸ 暂停';
    btnPlay.classList.add('playing');
  } else {
    btnPlay.textContent = '▶ 播放';
    btnPlay.classList.remove('playing');
  }
}

function setActiveToolButton(mode: ToolMode): void {
  [toolSelect, toolAddStation, toolConnect].forEach(btn => btn.classList.remove('active'));
  if (mode === 'select') toolSelect.classList.add('active');
  if (mode === 'addStation') toolAddStation.classList.add('active');
  if (mode === 'connect') toolConnect.classList.add('active');
}

function renderLinesList(): void {
  const lines = mapEditor.getLines();
  if (lines.length === 0) {
    linesList.innerHTML = `<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 12px;">
      暂无线路，点击下方按钮创建第一条线路
    </div>`;
    return;
  }

  linesList.innerHTML = lines.map(line => renderLineItem(line)).join('');
  bindLineItemEvents();
}

function renderLineItem(line: MetroLine): string {
  const totalVolume = line.passengerVolume;
  const loadPercent = Math.min(totalVolume, 100);
  const segmentCount = line.segmentIds.length;

  return `
    <div class="line-item" data-line-id="${line.id}">
      <div class="line-item-header">
        <div class="line-color" data-color-line="${line.id}" style="background-color: ${line.color};"></div>
        <span class="line-name" data-name-line="${line.id}">${escapeHtml(line.name)}</span>
        <button class="line-delete-btn" data-delete-line="${line.id}" title="删除线路">×</button>
      </div>
      <div class="slider-container">
        <span class="slider-label">客流</span>
        <input type="range" class="slider" data-volume-line="${line.id}" min="0" max="100" step="1" value="${line.passengerVolume}">
        <span class="slider-value" data-volume-value="${line.id}">${line.passengerVolume}</span>
      </div>
      <div class="line-stats">
        <span>预估客流: ${(totalVolume * 1000).toLocaleString()}人/时</span>
        <span>负载: ${loadPercent}%</span>
      </div>
      <div class="line-stats">
        <span>站点连接: ${segmentCount}段</span>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function bindLineItemEvents(): void {
  document.querySelectorAll('[data-color-line]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const lineId = (el as HTMLElement).dataset.colorLine!;
      openColorPicker(lineId);
    });
  });

  document.querySelectorAll('[data-delete-line]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const lineId = (el as HTMLElement).dataset.deleteLine!;
      if (confirm('确定要删除这条线路吗？所有相关连接将被移除。')) {
        mapEditor.deleteLine(lineId);
      }
    });
  });

  document.querySelectorAll('[data-volume-line]').forEach(el => {
    const slider = el as HTMLInputElement;
    const lineId = slider.dataset.volumeLine!;
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value, 10);
      mapEditor.updateLine(lineId, { passengerVolume: value });
      const valueEl = document.querySelector(`[data-volume-value="${lineId}"]`);
      if (valueEl) valueEl.textContent = value.toString();
    });
  });

  document.querySelectorAll('[data-name-line]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const lineId = (el as HTMLElement).dataset.nameLine!;
      const line = mapEditor.getLine(lineId);
      if (!line) return;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'line-name-input';
      input.value = line.name;
      input.maxLength = 20;

      (el as HTMLElement).replaceWith(input);
      input.focus();
      input.select();

      const finish = () => {
        const newName = input.value.trim() || line.name;
        mapEditor.updateLine(lineId, { name: newName });
      };

      input.addEventListener('blur', finish);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') input.blur();
        if (ev.key === 'Escape') {
          input.value = line.name;
          input.blur();
        }
      });
    });
  });
}

function openColorPicker(lineId: string): void {
  pendingColorPickerLineId = lineId;
  const line = mapEditor.getLine(lineId);
  if (!line) return;

  const colorsHtml = LINE_COLORS.map(c =>
    `<div class="color-option ${c === line.color ? 'selected' : ''}" 
          data-color="${c}" 
          style="background-color: ${c};"></div>`
  ).join('');

  colorPickerOverlay.innerHTML = `
    <div class="color-picker">
      <div class="color-picker-title">选择线路颜色</div>
      <div class="color-options">${colorsHtml}</div>
    </div>
  `;
  colorPickerOverlay.style.display = 'flex';

  colorPickerOverlay.querySelectorAll('.color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const color = (opt as HTMLElement).dataset.color!;
      if (pendingColorPickerLineId) {
        mapEditor.updateLine(pendingColorPickerLineId, { color });
      }
      closeColorPicker();
    });
  });

  colorPickerOverlay.addEventListener('click', (e) => {
    if (e.target === colorPickerOverlay) closeColorPicker();
  });
}

function closeColorPicker(): void {
  colorPickerOverlay.style.display = 'none';
  colorPickerOverlay.innerHTML = '';
  pendingColorPickerLineId = null;
}

function showContextMenu(type: 'station' | 'segment', id: string, x: number, y: number): void {
  let itemsHtml = '';
  if (type === 'station') {
    const station = mapEditor.getStation(id);
    itemsHtml = `
      <div class="context-menu-item" data-action="editName">✏️ 编辑站名</div>
      <div class="context-menu-item danger" data-action="deleteStation">🗑️ 删除站点</div>
    `;
    if (station) {
      contextMenu.dataset.stationId = id;
    }
  } else {
    itemsHtml = `
      <div class="context-menu-item danger" data-action="deleteSegment">🗑️ 删除线段</div>
    `;
    contextMenu.dataset.segmentId = id;
  }

  contextMenu.innerHTML = itemsHtml;
  contextMenu.style.display = 'block';

  const menuRect = contextMenu.getBoundingClientRect();
  const maxX = window.innerWidth - menuRect.width - 10;
  const maxY = window.innerHeight - menuRect.height - 10;
  contextMenu.style.left = `${Math.min(x, maxX)}px`;
  contextMenu.style.top = `${Math.min(y, maxY)}px`;

  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = (item as HTMLElement).dataset.action;
      handleContextAction(action!, type, id);
      hideContextMenu();
    });
  });
}

function handleContextAction(action: string, type: 'station' | 'segment', id: string): void {
  if (action === 'editName' && type === 'station') {
    editStationName(id);
  } else if (action === 'deleteStation' && type === 'station') {
    if (confirm('确定要删除这个站点吗？所有相关连接将被移除。')) {
      mapEditor.deleteStation(id);
    }
  } else if (action === 'deleteSegment' && type === 'segment') {
    mapEditor.deleteSegment(id);
  }
}

function hideContextMenu(): void {
  contextMenu.style.display = 'none';
  contextMenu.dataset.stationId = '';
  contextMenu.dataset.segmentId = '';
}

function editStationName(stationId: string): void {
  const station = mapEditor.getStation(stationId);
  if (!station) return;

  const newName = prompt('输入站点名称：', station.name);
  if (newName !== null && newName.trim()) {
    mapEditor.updateStation(stationId, { name: newName.trim() });
  }
}

function setupTimelineDrag(): void {
  let isDragging = false;

  const updateFromClientX = (clientX: number) => {
    const rect = timeline.getBoundingClientRect();
    let progress = (clientX - rect.left) / rect.width;
    progress = Math.max(0, Math.min(1, progress));
    timeSimulator.setTimeProgress(progress);
  };

  timelineHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    timelineHandle.classList.add('dragging');
    if (timeSimulator.getIsPlaying()) {
      timeSimulator.pause();
      updatePlayButton();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      timelineHandle.classList.remove('dragging');
    }
  });

  timeline.addEventListener('click', (e) => {
    if (e.target === timelineHandle) return;
    updateFromClientX(e.clientX);
  });
}

function initDemoData(): void {
  const line1 = mapEditor.addLine('1号线', '#E53935');
  const line2 = mapEditor.addLine('2号线', '#1E88E5');

  const s1 = mapEditor.addStation(150, 150, '苹果园');
  const s2 = mapEditor.addStation(280, 150, '古城');
  const s3 = mapEditor.addStation(410, 150, '八角游乐园');
  const s4 = mapEditor.addStation(540, 200, '八宝山');
  const s5 = mapEditor.addStation(650, 280, '玉泉路');

  const s6 = mapEditor.addStation(200, 350, '西直门');
  const s7 = mapEditor.addStation(330, 400, '车公庄');
  const s8 = mapEditor.addStation(460, 430, '复兴门');
  const s9 = mapEditor.addStation(590, 400, '西单');

  mapEditor.connectStations(s1.id, s2.id, line1.id);
  mapEditor.connectStations(s2.id, s3.id, line1.id);
  mapEditor.connectStations(s3.id, s4.id, line1.id);
  mapEditor.connectStations(s4.id, s5.id, line1.id);

  mapEditor.connectStations(s6.id, s7.id, line2.id);
  mapEditor.connectStations(s7.id, s8.id, line2.id);
  mapEditor.connectStations(s8.id, s9.id, line2.id);

  mapEditor.connectStations(s3.id, s7.id, line2.id);

  mapEditor.updateLine(line1.id, { passengerVolume: 75 });
  mapEditor.updateLine(line2.id, { passengerVolume: 60 });
}

function bindGlobalEvents(): void {
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target as Node)) {
      hideContextMenu();
    }
    if (colorPickerOverlay.style.display === 'flex' &&
        !colorPickerOverlay.querySelector('.color-picker')?.contains(e.target as Node)) {
      closeColorPicker();
    }
  });

  toolSelect.addEventListener('click', () => {
    mapEditor.setTool('select');
    setActiveToolButton('select');
  });
  toolAddStation.addEventListener('click', () => {
    mapEditor.setTool('addStation');
    setActiveToolButton('addStation');
  });
  toolConnect.addEventListener('click', () => {
    if (mapEditor.getLines().length === 0) {
      alert('请先创建至少一条线路');
      return;
    }
    mapEditor.setTool('connect');
    setActiveToolButton('connect');
  });

  addLineBtn.addEventListener('click', () => {
    mapEditor.addLine();
  });

  btnRewind.addEventListener('click', () => {
    timeSimulator.rewind(30);
  });
  btnForward.addEventListener('click', () => {
    timeSimulator.forward(30);
  });
  btnPlay.addEventListener('click', () => {
    timeSimulator.togglePlay();
    updatePlayButton();
  });

  timeSimulator.setOnTimeChange(updateTimelineUI);

  mapEditor.setOnDataChange(() => {
    renderLinesList();
    mapEditor.markDirty();
  });

  mapEditor.setOnStationEdit(editStationName);

  mapEditor.setOnContextMenu(showContextMenu);
}

function init(): void {
  initTimelineTicks();
  initDemoData();
  bindGlobalEvents();
  setupTimelineDrag();
  renderLinesList();
  updateTimelineUI();
  updatePlayButton();
  setActiveToolButton('select');
}

init();
