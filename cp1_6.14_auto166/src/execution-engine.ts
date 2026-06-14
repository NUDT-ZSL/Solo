export interface OutputLine {
  type: 'log' | 'error' | 'info' | 'warn';
  content: string;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  outputs: OutputLine[];
  duration: number;
}

export class CodeExecutionEngine {
  private outputs: OutputLine[] = [];

  execute(code: string): ExecutionResult {
    const startTime = performance.now();
    this.outputs = [];

    const originalConsole = {
      log: console.log,
      error: console.error,
      info: console.info,
      warn: console.warn,
    };

    const createCapture = (type: OutputLine['type']) => {
      return (...args: unknown[]) => {
        const content = args
          .map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch {
                return String(arg);
              }
            }
            return String(arg);
          })
          .join(' ');

        this.outputs.push({
          type,
          content,
          timestamp: Date.now(),
        });

        originalConsole[type](...args);
      };
    };

    console.log = createCapture('log');
    console.error = createCapture('error');
    console.info = createCapture('info');
    console.warn = createCapture('warn');

    let success = true;

    try {
      const sandboxedCode = `
        "use strict";
        ${code}
      `;
      const fn = new Function(sandboxedCode);
      fn.call(null);
    } catch (error) {
      success = false;
      this.outputs.push({
        type: 'error',
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      });
    } finally {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
    }

    const duration = performance.now() - startTime;

    return {
      success,
      outputs: this.outputs,
      duration,
    };
  }
}

export const executionEngine = new CodeExecutionEngine();
