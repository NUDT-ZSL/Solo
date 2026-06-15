export type OutputType = 'log' | 'error' | 'info' | 'warn' | 'result' | 'async-complete';

export interface OutputLine {
  type: OutputType;
  content: string;
  timestamp: number;
  order: number;
}

export interface ExecutionResult {
  success: boolean;
  outputs: OutputLine[];
  duration: number;
  asyncPending: boolean;
}

type AsyncTracker = {
  pending: Set<Promise<unknown>>;
  timers: Set<number>;
  orderCounter: number;
  done: boolean;
  allSettled: boolean;
};

export class CodeExecutionEngine {
  private outputs: OutputLine[] = [];
  private tracker: AsyncTracker | null = null;
  private maxAsyncWaitMs = 10000;

  private createOutput(type: OutputType, content: string): OutputLine {
    const order = this.tracker ? ++this.tracker.orderCounter : this.outputs.length;
    return {
      type,
      content,
      timestamp: Date.now(),
      order,
    };
  }

  private formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Error) {
      return `${value.name}: ${value.message}${value.stack ? '\n' + value.stack : ''}`;
    }
    if (value instanceof Promise) return '[Promise]';
    if (typeof value === 'function') return value.toString();
    try {
      const seen = new WeakSet<object>();
      const json = JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
          }
          if (typeof val === 'bigint') return val.toString() + 'n';
          if (typeof val === 'symbol') return val.toString();
          if (typeof val === 'undefined') return 'undefined';
          return val;
        },
        2
      );
      return json;
    } catch {
      return String(value);
    }
  }

  private createConsoleCapture() {
    const self = this;
    const makeCapture = (type: OutputType) => {
      return function (...args: unknown[]) {
        const content = args.map(a => self.formatValue(a)).join(' ');
        self.outputs.push(self.createOutput(type, content));
      };
    };
    return {
      log: makeCapture('log'),
      error: makeCapture('error'),
      info: makeCapture('info'),
      warn: makeCapture('warn'),
    };
  }

  private wrapAsyncApi(tracker: AsyncTracker) {
    const self = this;

    const originalSetTimeout = globalThis.setTimeout;
    const wrappedSetTimeout = (
      callback: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ): ReturnType<typeof originalSetTimeout> => {
      let timerId: ReturnType<typeof originalSetTimeout>;
      const wrappedCallback: TimerHandler = typeof callback === 'string'
        ? callback
        : ((...innerArgs: unknown[]) => {
            try {
              return (callback as (...args: unknown[]) => void)(...innerArgs);
            } finally {
              tracker.timers.delete(timerId as unknown as number);
            }
          });
      timerId = originalSetTimeout(wrappedCallback, delay, ...args);
      const timerPromise = new Promise<void>(resolve => {
        originalSetTimeout(() => {
          tracker.timers.delete(timerId as unknown as number);
          resolve();
        }, Math.max((delay || 0) + 100, 100));
      });
      tracker.timers.add(timerId as unknown as number);
      tracker.pending.add(timerPromise);
      return timerId;
    };

    const originalClearTimeout = globalThis.clearTimeout;
    const wrappedClearTimeout = function (id?: number | undefined) {
      if (id !== undefined) {
        tracker.timers.delete(id);
      }
      return originalClearTimeout(id);
    };

    const originalSetInterval = globalThis.setInterval;
    const wrappedSetInterval = (
      callback: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ): ReturnType<typeof originalSetInterval> => {
      self.outputs.push(self.createOutput('info', '[setInterval 已启动，将持续执行回调]'));
      return originalSetInterval(callback, delay, ...args);
    };

    const originalFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
    let wrappedFetch: typeof fetch | undefined;
    if (originalFetch) {
      wrappedFetch = function (input: RequestInfo | URL, init?: RequestInit) {
        self.outputs.push(self.createOutput('info', `[fetch] 请求: ${typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url}`));
        const fetchPromise = originalFetch(input, init);
        const trackedPromise = fetchPromise.then(
          (res) => {
            self.outputs.push(self.createOutput('log', `[fetch] 响应: ${res.status} ${res.statusText}`));
            return res;
          },
          (err) => {
            self.outputs.push(self.createOutput('error', `[fetch] 错误: ${self.formatValue(err)}`));
            throw err;
          }
        );
        tracker.pending.add(trackedPromise);
        return fetchPromise;
      };
    }

    return {
      setTimeout: wrappedSetTimeout,
      clearTimeout: wrappedClearTimeout,
      setInterval: wrappedSetInterval,
      fetch: wrappedFetch,
    };
  }

  private restoreAsyncApi(
    originals: {
      setTimeout: typeof globalThis.setTimeout;
      clearTimeout: typeof globalThis.clearTimeout;
      setInterval: typeof globalThis.setInterval;
      fetch?: typeof fetch;
    }
  ) {
    globalThis.setTimeout = originals.setTimeout;
    globalThis.clearTimeout = originals.clearTimeout;
    globalThis.setInterval = originals.setInterval;
    if (originals.fetch !== undefined) {
      (globalThis as unknown as { fetch: typeof fetch }).fetch = originals.fetch;
    }
  }

  async execute(code: string, waitAsync: boolean = true): Promise<ExecutionResult> {
    const startTime = performance.now();
    this.outputs = [];
    this.tracker = {
      pending: new Set(),
      timers: new Set(),
      orderCounter: -1,
      done: false,
      allSettled: false,
    };

    const originals = {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      setInterval: globalThis.setInterval,
      fetch: (globalThis as unknown as { fetch?: typeof fetch }).fetch,
    };

    const originalConsole = {
      log: console.log,
      error: console.error,
      info: console.info,
      warn: console.warn,
    };

    let success = true;
    let returnValue: unknown = undefined;
    let asyncPending = false;

    try {
      const capturedConsole = this.createConsoleCapture();
      console.log = capturedConsole.log;
      console.error = capturedConsole.error;
      console.info = capturedConsole.info;
      console.warn = capturedConsole.warn;

      const wrapped = this.wrapAsyncApi(this.tracker);
      globalThis.setTimeout = wrapped.setTimeout;
      globalThis.clearTimeout = wrapped.clearTimeout;
      globalThis.setInterval = wrapped.setInterval;
      if (wrapped.fetch) {
        (globalThis as unknown as { fetch: typeof fetch }).fetch = wrapped.fetch;
      }

      const sandboxCode = `
        "use strict";
        return (async function() {
          ${code}
        }).call(null);
      `;
      const fn = new Function(
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'fetch',
        sandboxCode
      );
      const syncResult = fn(
        wrapped.setTimeout,
        wrapped.clearTimeout,
        wrapped.setInterval,
        wrapped.fetch
      );

      if (syncResult instanceof Promise) {
        const awaited = await Promise.race([
          syncResult,
          new Promise<never>((_, reject) =>
            originals.setTimeout(() => reject(new Error('执行超时 (5秒)')), 5000)
          )
        ]);
        returnValue = awaited;
      } else {
        returnValue = syncResult;
      }

      this.restoreAsyncApi(originals);

      asyncPending = this.tracker.pending.size > 0;

      if (waitAsync && asyncPending) {
        const waitStart = performance.now();
        try {
          while (this.tracker.pending.size > 0 && performance.now() - waitStart < this.maxAsyncWaitMs) {
            const pendingArray = Array.from(this.tracker.pending);
            this.tracker.pending.clear();
            await Promise.allSettled(pendingArray);
            await new Promise(r => originals.setTimeout(r, 50));
          }
          asyncPending = this.tracker.pending.size > 0;
          if (asyncPending) {
            this.outputs.push(
              this.createOutput('warn', `[部分异步操作仍在后台执行，已等待 ${this.maxAsyncWaitMs}ms]`)
            );
          } else {
            this.outputs.push(
              this.createOutput('log', `[所有异步操作完成]`)
            );
          }
        } catch {
          asyncPending = true;
        }
      }
    } catch (error) {
      success = false;
      this.outputs.push(
        this.createOutput('error', error instanceof Error ? error.message : String(error))
      );
    } finally {
      this.restoreAsyncApi(originals);
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
    }

    if (returnValue !== undefined) {
      this.outputs.push(
        this.createOutput('result', `返回值: ${this.formatValue(returnValue)}`)
      );
    }

    this.tracker.done = true;
    this.tracker.allSettled = !asyncPending;
    this.outputs.sort((a, b) => a.order - b.order);

    const duration = performance.now() - startTime;
    const trackerRef = this.tracker;
    this.tracker = null;

    if (trackerRef.allSettled && !asyncPending && trackerRef.pending.size === 0) {
      this.outputs.push(
        this.createOutput('async-complete', `执行完成 (${duration.toFixed(0)}ms，含异步)`)
      );
    }

    return {
      success,
      outputs: this.outputs,
      duration,
      asyncPending,
    };
  }

  executeSync(code: string): ExecutionResult {
    const startTime = performance.now();
    this.outputs = [];

    const originalConsole = {
      log: console.log,
      error: console.error,
      info: console.info,
      warn: console.warn,
    };

    const capturedConsole = this.createConsoleCapture();
    console.log = capturedConsole.log;
    console.error = capturedConsole.error;
    console.info = capturedConsole.info;
    console.warn = capturedConsole.warn;

    let success = true;
    let returnValue: unknown = undefined;

    try {
      const sandboxedCode = `
        "use strict";
        return (function() {
          ${code}
        }).call(null);
      `;
      const fn = new Function(sandboxedCode);
      returnValue = fn();
    } catch (error) {
      success = false;
      this.outputs.push(
        this.createOutput('error', error instanceof Error ? error.message : String(error))
      );
    } finally {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
    }

    if (returnValue !== undefined) {
      this.outputs.push(
        this.createOutput('result', `返回值: ${this.formatValue(returnValue)}`)
      );
    }

    const duration = performance.now() - startTime;

    return {
      success,
      outputs: this.outputs,
      duration,
      asyncPending: false,
    };
  }
}

export const executionEngine = new CodeExecutionEngine();
