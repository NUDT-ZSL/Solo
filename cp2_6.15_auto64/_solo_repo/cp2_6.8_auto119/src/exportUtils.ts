import type { Renderer } from './renderer';

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export async function exportTimeline(renderer: Renderer): Promise<ExportResult> {
  try {
    const offCanvas = renderer.exportImage(2);
    const blob = await new Promise<Blob>((resolve, reject) => {
      offCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/png'
      );
    });

    const filename = `timeline-${Date.now()}.png`;
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('filename', filename);

    let res: ExportResult;
    try {
      const resp = await fetch('/api/export', { method: 'POST', body: form });
      if (resp.ok) {
        const json = await resp.json();
        res = {
          success: true,
          downloadUrl: json.downloadUrl,
          filename: json.filename || filename,
        };
      } else {
        throw new Error(`Server ${resp.status}`);
      }
    } catch (e) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      res = { success: true, downloadUrl: url, filename };
    }
    return res;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function showToast(message: string, duration = 3000): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout((showToast as any)._t);
  (showToast as any)._t = window.setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
