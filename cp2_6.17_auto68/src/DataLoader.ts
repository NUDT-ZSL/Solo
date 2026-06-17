import { PlanetData } from './types';

let cachedData: PlanetData[] | null = null;

function showErrorToUser(message: string): void {
  if (typeof document === 'undefined') return;

  let errorBox = document.getElementById('solar-system-error');
  if (!errorBox) {
    errorBox = document.createElement('div');
    errorBox.id = 'solar-system-error';
    errorBox.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(60, 20, 20, 0.95);
      color: #ff9999;
      padding: 24px 32px;
      border-radius: 12px;
      font-family: sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.8);
      z-index: 9999;
      max-width: 400px;
      text-align: center;
    `;
    document.body.appendChild(errorBox);
  }
  errorBox.innerHTML = message;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function loadPlanetData(): Promise<PlanetData[]> {
  if (cachedData) return cachedData;

  const maxRetries = 3;
  const retryDelays = [1000, 2000, 3000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout('/api/orbits', 5000);

      if (!response.ok) {
        throw new Error(`服务器返回错误: ${response.status} ${response.statusText}`);
      }

      cachedData = await response.json();
      return cachedData!;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        let message = '无法加载行星数据，请稍后重试。';
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            message = '数据加载超时，请检查后端服务是否启动并刷新页面。';
          } else {
            message = `加载失败: ${err.message}`;
          }
        }
        showErrorToUser(message);
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    }
  }

  throw new Error('加载行星数据失败');
}

export function getCachedData(): PlanetData[] | null {
  return cachedData;
}
