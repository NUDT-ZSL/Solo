import type { UploadResponse, CompareResponse, UploadType } from '../types';

const API_BASE = '/api';

export async function uploadAudio(
  file: File | Blob,
  type: UploadType,
  fileName?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file, fileName || (file as File).name || 'recording.webm');
  formData.append('type', type);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `${API_BASE}/upload`);
    xhr.send(formData);
  });
}

export async function compareAudio(
  standardFileId: string,
  recordingFileId: string
): Promise<CompareResponse> {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ standardFileId, recordingFileId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Compare failed' }));
    throw new Error(err.error || `Compare failed: ${res.status}`);
  }

  return res.json();
}

export function getAudioUrl(fileId: string): string {
  return `${API_BASE}/audio/${fileId}`;
}
