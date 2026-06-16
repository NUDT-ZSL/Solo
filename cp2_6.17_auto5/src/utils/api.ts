export const API_BASE_PATH = '/api';

interface FetchWithRetryOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  headers?: Record<string, string>;
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & FetchWithRetryOptions = {}
): Promise<T> {
  const {
    signal,
    timeoutMs = 30000,
    maxRetries = 3,
    initialDelayMs = 1000,
    headers,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (signal?.aborted) {
        throw new DOMException('Request was aborted', 'AbortError');
      }

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

      let combinedSignal: AbortSignal;
      if (signal) {
        combinedSignal = AbortSignal.any([signal, timeoutController.signal]);
      } else {
        combinedSignal = timeoutController.signal;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      if (signal?.aborted) {
        throw new DOMException('Request was aborted', 'AbortError');
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt + 1);
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delayMs);

        if (signal) {
          const abortHandler = () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Request was aborted', 'AbortError'));
          };
          signal.addEventListener('abort', abortHandler, { once: true });
        }
      });
    }
  }

  throw lastError || new Error('Request failed after max retries');
}

interface UploadWithProgressOptions {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  maxRetries?: number;
  initialDelayMs?: number;
}

export async function uploadWithProgress<T>(
  url: string,
  body: unknown,
  options: UploadWithProgressOptions = {}
): Promise<T> {
  const { signal, onProgress, maxRetries = 3, initialDelayMs = 1000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (signal?.aborted) {
        throw new DOMException('Request was aborted', 'AbortError');
      }

      const result = await new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (signal) {
          const abortHandler = () => {
            xhr.abort();
          };
          signal.addEventListener('abort', abortHandler, { once: true });
        }

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as T;
              resolve(data);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new DOMException('Request was aborted', 'AbortError'));
        });

        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(body));
      });

      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      if (signal?.aborted) {
        throw new DOMException('Request was aborted', 'AbortError');
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt + 1);
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delayMs);

        if (signal) {
          const abortHandler = () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Request was aborted', 'AbortError'));
          };
          signal.addEventListener('abort', abortHandler, { once: true });
        }
      });
    }
  }

  throw lastError || new Error('Upload failed after max retries');
}
