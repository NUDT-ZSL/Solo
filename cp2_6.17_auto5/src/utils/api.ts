/**
 * 基础API路径
 */
export const API_BASE_PATH = '/api';

/**
 * fetchWithRetry配置选项
 */
interface FetchWithRetryOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  headers?: Record<string, string>;
}

/**
 * 带重试的fetch封装
 * 支持AbortSignal取消请求、超时控制、指数退避重试
 * @param url 请求URL
 * @param options fetch配置选项
 * @returns 解析后的JSON数据
 * @throws 当请求被取消、超时或达到最大重试次数时抛出错误
 */
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

      const combinedSignal = signal
        ? AbortSignal.any([signal, timeoutController.signal])
        : timeoutController.signal;

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

      const delayMs = initialDelayMs * Math.pow(2, attempt);
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
