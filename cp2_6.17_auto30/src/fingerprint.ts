const FINGERPRINT_KEY = 'anonymous_vote_fingerprint';

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 80, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('BrowserFingerprint', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('BrowserFingerprint', 4, 4);
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.5)';
    ctx.beginPath();
    ctx.arc(50, 30, 15, 0, Math.PI * 2);
    ctx.stroke();
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

export async function generateFingerprint(): Promise<string> {
  const existing = localStorage.getItem(FINGERPRINT_KEY);
  if (existing) return existing;

  const canvasFP = generateCanvasFingerprint();
  const raw = [
    canvasFP,
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
    navigator.platform,
  ].join('|');

  const hash = await sha256(raw);
  localStorage.setItem(FINGERPRINT_KEY, hash);
  return hash;
}

export function getShortFingerprint(hash: string): string {
  return hash.slice(0, 8);
}
