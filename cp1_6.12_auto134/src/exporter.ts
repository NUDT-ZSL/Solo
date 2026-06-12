import type { PointCloudRenderer } from './pointCloudRenderer';

export function exportToPLY(renderer: PointCloudRenderer, filename?: string): void {
  const data = renderer.getPointData();
  if (!data || data.count === 0) {
    showErrorToast('没有可导出的点云数据，请先上传深度图');
    return;
  }

  try {
    const plyContent = generatePLYContent(data.positions, data.colors, data.count);
    triggerDownload(plyContent, filename || `pointcloud_${Date.now()}.ply`);
    showSuccessToast(`成功导出 ${data.count.toLocaleString()} 个顶点`);
  } catch (e) {
    console.error('PLY导出失败:', e);
    showErrorToast('导出失败，请重试');
  }
}

function generatePLYContent(
  positions: Float32Array,
  colors: Float32Array,
  count: number
): string {
  const header = [
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
    '',
  ].join('\n');

  const vertices: string[] = [];
  vertices.reserve = function(n: number) { this.length = n; return this; }.call(vertices, count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    const x = positions[i3].toFixed(6);
    const y = positions[i3 + 1].toFixed(6);
    const z = positions[i3 + 2].toFixed(6);
    
    const r = Math.round(Math.max(0, Math.min(255, colors[i3] * 255)));
    const g = Math.round(Math.max(0, Math.min(255, colors[i3 + 1] * 255)));
    const b = Math.round(Math.max(0, Math.min(255, colors[i3 + 2] * 255)));
    
    vertices[i] = `${x} ${y} ${z} ${r} ${g} ${b}`;
  }

  return header + vertices.join('\n') + '\n';
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  
  try {
    link.click();
  } finally {
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

function showToast(message: string, type: 'success' | 'error'): void {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  
  const bgColor = type === 'success' ? '#3fb950' : '#f85149';
  
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    padding: 12px 24px;
    background: ${bgColor};
    color: white;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
  `;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-100px)';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function showSuccessToast(message: string): void {
  showToast(message, 'success');
}

function showErrorToast(message: string): void {
  showToast(message, 'error');
}
