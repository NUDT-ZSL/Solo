import Chart from 'chart.js/auto';
import type { PathData } from './path';

export interface UICallbacks {
  onPointsReady: (text: string) => void;
}

let chartInstance: Chart | null = null;

export function buildSidebar(callbacks: UICallbacks): void {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'sidebar-title';
  title.textContent = 'GPS 轨迹 3D';
  sidebar.appendChild(title);

  const uploadZone = document.createElement('div');
  uploadZone.className = 'upload-zone';
  uploadZone.innerHTML = `
    <span class="upload-arrow">⬆</span>
    <div class="upload-zone-label">拖拽CSV文件到此处<br/>或点击上传</div>
  `;
  sidebar.appendChild(uploadZone);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  fileInput.className = 'hidden-input';
  sidebar.appendChild(fileInput);

  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) readCSVFile(file, callbacks);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) readCSVFile(file, callbacks);
  });

  const manualLabel = document.createElement('div');
  manualLabel.className = 'section-label';
  manualLabel.textContent = '手动输入坐标 (lat,lng,ele)';
  sidebar.appendChild(manualLabel);

  const manualInput = document.createElement('textarea');
  manualInput.className = 'manual-input';
  manualInput.id = 'manual-input';
  manualInput.placeholder = '39.9042,116.4074,50\n39.9052,116.4084,65\n39.9062,116.4094,80\n39.9072,116.4104,55\n39.9082,116.4114,70';
  sidebar.appendChild(manualInput);

  const genBtn = document.createElement('button');
  genBtn.className = 'btn btn-primary';
  genBtn.textContent = '生成3D路径';
  genBtn.addEventListener('click', () => {
    const text = manualInput.value.trim();
    if (text) callbacks.onPointsReady(text);
  });
  sidebar.appendChild(genBtn);

  const statsLabel = document.createElement('div');
  statsLabel.className = 'section-label';
  statsLabel.textContent = '路径统计';
  sidebar.appendChild(statsLabel);

  const statsContainer = document.createElement('div');
  statsContainer.className = 'stats-container';
  statsContainer.id = 'stats-container';
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">总距离</span>
      <span class="stat-value" id="stat-distance">— km</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">累计爬升</span>
      <span class="stat-value" id="stat-ascent">— m</span>
    </div>
  `;
  sidebar.appendChild(statsContainer);

  const chartLabel = document.createElement('div');
  chartLabel.className = 'section-label';
  chartLabel.textContent = '海拔剖面';
  sidebar.appendChild(chartLabel);

  const chartContainer = document.createElement('div');
  chartContainer.className = 'chart-container';
  const chartCanvas = document.createElement('canvas');
  chartCanvas.id = 'elevation-chart';
  chartContainer.appendChild(chartCanvas);
  sidebar.appendChild(chartContainer);

  initChart(chartCanvas);
}

function readCSVFile(file: File, callbacks: UICallbacks): void {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    callbacks.onPointsReady(text);
  };
  reader.readAsText(file);
}

function initChart(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: '#4fc3f7',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          display: true,
          grid: { color: 'rgba(150,150,150,0.15)' },
          ticks: { color: '#8899aa', font: { size: 9 }, maxTicksLimit: 5 },
          title: { display: false },
        },
        y: {
          display: true,
          grid: { color: 'rgba(150,150,150,0.15)' },
          ticks: { color: '#8899aa', font: { size: 9 }, maxTicksLimit: 4 },
          title: { display: false },
        },
      },
    },
  });
}

export function updateStats(pathData: PathData): void {
  const distEl = document.getElementById('stat-distance');
  const ascentEl = document.getElementById('stat-ascent');
  if (distEl) distEl.textContent = (pathData.totalDistance / 1000).toFixed(2) + ' km';
  if (ascentEl) ascentEl.textContent = Math.round(pathData.totalAscent) + ' m';
}

export function updateChart(pathData: PathData): void {
  if (!chartInstance || pathData.elevations.length === 0) return;

  const total = pathData.elevations.length;
  const labels: string[] = [];
  const data: number[] = [];
  const step = Math.max(1, Math.floor(total / 50));
  for (let i = 0; i < total; i += step) {
    labels.push(((i / (total - 1)) * 100).toFixed(0) + '%');
    data.push(pathData.elevations[i]);
  }

  const minEle = pathData.minEle;
  const maxEle = pathData.maxEle;
  const eleRange = maxEle - minEle || 1;

  const canvas = chartInstance.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
  gradient.addColorStop(0.33, 'rgba(0, 255, 0, 0.8)');
  gradient.addColorStop(0.66, 'rgba(255, 255, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0.8)');

  const fillGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  fillGradient.addColorStop(0, 'rgba(33, 150, 243, 0.3)');
  fillGradient.addColorStop(1, 'rgba(33, 150, 243, 0.05)');

  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.data.datasets[0].borderColor = gradient;
  chartInstance.data.datasets[0].backgroundColor = fillGradient;
  chartInstance.update();
}
