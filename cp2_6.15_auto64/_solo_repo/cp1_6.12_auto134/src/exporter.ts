import type { PointCloudRenderer } from './pointCloudRenderer';

export function exportToPLY(
  renderer: PointCloudRenderer,
  filename?: string
): { success: boolean; message?: string } {
  const data = renderer.getPointData();
  if (!data || data.count === 0) {
    showErrorToast('没有可导出的点云数据，请先上传并解析深度图');
    return { success: false, message: 'no data' };
  }

  try {
    const ply = buildPLYAscii(data.positions, data.colors, data.count);
    downloadBlob(ply, filename || `pointcloud_${formatDate()}.ply`);
    showSuccessToast(`成功导出 ${data.count.toLocaleString()} 个顶点 → PLY`);
    return { success: true };
  } catch (e) {
    console.error('[exporter] 导出失败:', e);
    const msg = e instanceof Error ? e.message : '未知错误';
    showErrorToast(`导出失败：${msg}`);
    return { success: false, message: msg };
  }
}

function buildPLYAscii(
  positions: Float32Array,
  colors: Float32Array,
  count: number
): string {
  const header: string[] = [
    'ply',
    'format ascii 1.0',
    `element vertex ${count}`,
    'property float x',
    'property float y',
    'property float z',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    'end_header',
  ];

  const lines: string[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];

    const rf = Math.max(0, Math.min(1, colors[i3]));
    const gf = Math.max(0, Math.min(1, colors[i3 + 1]));
    const bf = Math.max(0, Math.min(1, colors[i3 + 2]));
    const r = (rf * 255 + 0.5) | 0;
    const g = (gf * 255 + 0.5) | 0;
    const b = (bf * 255 + 0.5) | 0;

    lines[i] = `${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)} ${r} ${g} ${b}`;
  }

  return header.join('\n') + '\n' + lines.join('\n') + '\n';
}

function downloadBlob(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}

function formatDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

let toastEl: HTMLDivElement | null = null;
let toastTimer: number | null = null;

function showToast(message: string, type: 'ok' | 'err') {
  if (toastEl) {
    toastEl.remove();
    toastEl = null;
  }
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }

  const el = document.createElement('div');
  el.textContent = message;
  const color =
    type === 'ok'
      ? 'linear-gradient(135deg, #2ea043 0%, #3fb950 100%)'
      : 'linear-gradient(135deg, #da3633 0%, #f85149 100%)';
  el.style.cssText = `
    position: fixed; top: 28px; left: 50%;
    transform: translateX(-50%) translateY(-120%);
    padding: 12px 22px; background: ${color}; color: #fff;
    border-radius: 12px; font-size: 13px; font-weight: 600;
    z-index: 9999; box-shadow: 0 6px 24px rgba(0,0,0,0.4);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none; max-width: 92vw; text-align: center;
    letter-spacing: 0.2px;
  `;
  document.body.appendChild(el);
  toastEl = el;

  requestAnimationFrame(() => {
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  toastTimer = window.setTimeout(() => {
    el.style.transform = 'translateX(-50%) translateY(-120%)';
    toastTimer = window.setTimeout(() => {
      if (toastEl === el) {
        el.remove();
        toastEl = null;
      }
    }, 450);
  }, 3200);
}

function showSuccessToast(msg: string) {
  showToast(`✓ ${msg}`, 'ok');
}

function showErrorToast(msg: string) {
  showToast(`⚠ ${msg}`, 'err');
}
