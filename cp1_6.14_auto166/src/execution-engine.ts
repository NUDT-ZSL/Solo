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
    const wrappedSetTimeout = function (
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ): ReturnType<typeof originalSetTimeout> {
      const wrappedCallback = function (...innerArgs: unknown[]) {
        try {
          return callback(...innerArgs);
        } finally {
          self.outputs.push(self.createOutput('log', `[setTimeout ${delay}ms 回调执行完毕]`));
        }
      };
      const timerId = originalSetTimeout(wrappedCallback, delay, ...args);
      const timerPromise = new Promise<void>(resolve => {
        const checkTimer = () => {
          try {
            if (tracker.timers.has(timerId as unknown as number)) {
              setTimeout(checkTimer, 10);
            } else {
              resolve();
            }
          } catch {
            resolve();
          }
        };
        setTimeout(checkTimer, Math.max((delay || 0) + 50, 50));
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
    const wrappedSetInterval = function (
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ): ReturnType<typeof originalSetInterval> {
      self.outputs.push(self.createOutput('info', '[setInterval 已启动，将持续执行回调]'));
      return originalSetInterval(callback, delay, ...args);
    };

    const originalThen = Promise.prototype.then;
    const originalCatch = Promise.prototype.catch;
    const originalFinally = Promise.prototype.finally;

    Promise.prototype.then = function <T, TResult1 = T, TResult2 = never>(
      this: Promise<T>,
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
      if (self.tracker && !self.tracker.done) {
        const trackedPromise = new Promise<T>((resolve) => {
          originalThen.call(
            this,
            (v: T) => {
              self.outputs.push(self.createOutput('log', `[Promise resolve] ${self.formatValue(v)}`));
              resolve(v);
            },
            (e: unknown) => {
              self.outputs.push(self.createOutput('error', `[Promise reject] ${self.formatValue(e)}`));
              resolve(undefined as unknown as T);
            }
          );
        });
        tracker.pending.add(trackedPromise);
      }
      return originalThen.call(this, onfulfilled, onrejected);
    };

    Promise.prototype.catch = function <T, TResult = never>(
      this: Promise<T>,
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null
    ): Promise<T | TResult> {
      return originalCatch.call(this, onrejected);
    };

    Promise.prototype.finally = function <T>(
      this: Promise<T>,
      onfinally?: (() => void) | undefined | null
    ): Promise<T> {
      return originalFinally.call(this, onfinally);
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
    const P = Promise.prototype as unknown as {
      then: typeof Promise.prototype.then;
      catch: typeof Promise.prototype.catch;
      finally: typeof Promise.prototype.finally;
    };
    delete P.then;
    delete P.catch;
    delete P.finally;
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
            setTimeout(() => reject(new Error('执行超时 (5秒)')), 5000)
          )
        ]);
        returnValue = awaited;
      } else {
        returnValue = syncResult;
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

    let asyncPending = this.tracker.pending.size > 0;

    if (waitAsync && asyncPending) {
      const waitStart = performance.now();
      try {
        while (this.tracker.pending.size > 0 && performance.now() - waitStart < this.maxAsyncWaitMs) {
          const pendingArray = Array.from(this.tracker.pending);
          this.tracker.pending.clear();
          await Promise.allSettled(pendingArray);
          await new Promise(r => setTimeout(r, 50));
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
      const sandboxCode = `
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
