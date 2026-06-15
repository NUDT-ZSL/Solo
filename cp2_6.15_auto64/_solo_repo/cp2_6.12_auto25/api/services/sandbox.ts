import { execFile } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Language } from '../../src/shared/types.js';

const TIMEOUT_MS = 2000;

function getTempDir(): string {
  return path.join(os.tmpdir(), 'codejudge');
}

async function ensureTempDir(): Promise<string> {
  const dir = getTempDir();
  try {
    await mkdir(dir, { recursive: true });
  } catch {}
  return dir;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  executionTime: number;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  input?: string,
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const child = execFile(command, args, {
      cwd,
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, PATH: process.env.PATH },
    }, (error, stdout, stderr) => {
      const executionTime = Date.now() - startTime;
      const timedOut = !!error && (error as any).killed === true;

      resolve({
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
        exitCode: error ? (typeof (error as NodeJS.ErrnoException).code === 'number' ? ((error as NodeJS.ErrnoException).code as unknown as number) : 1) : 0,
        timedOut,
        executionTime,
      });
    });

    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

async function executeJavaScript(code: string, input: string): Promise<ExecutionResult> {
  const dir = await ensureTempDir();
  const filePath = path.join(dir, `solution_${Date.now()}.js`);

  const wrappedCode = `
const input = ${JSON.stringify(input)};
try {
  ${code}
} catch(e) {
  process.stderr.write(e.message);
  process.exit(1);
}
`;

  try {
    await writeFile(filePath, wrappedCode, 'utf-8');
    const result = await runCommand('node', [filePath], dir);
    return result;
  } finally {
    try { await unlink(filePath); } catch {}
  }
}

async function executePython(code: string, input: string): Promise<ExecutionResult> {
  const dir = await ensureTempDir();
  const filePath = path.join(dir, `solution_${Date.now()}.py`);

  const wrappedCode = `
import sys
input_data = ${JSON.stringify(input)}
try:
${code.split('\n').map((line: string) => '    ' + line).join('\n')}
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;

  try {
    await writeFile(filePath, wrappedCode, 'utf-8');
    const result = await runCommand('python', [filePath], dir);
    return result;
  } finally {
    try { await unlink(filePath); } catch {}
  }
}

async function executeCpp(code: string, input: string): Promise<ExecutionResult> {
  const dir = await ensureTempDir();
  const sourcePath = path.join(dir, `solution_${Date.now()}.cpp`);
  const exePath = path.join(dir, `solution_${Date.now()}.exe`);

  const wrappedCode = `
#include <iostream>
#include <string>
using namespace std;
${code}
int main() {
    return 0;
}
`;

  try {
    await writeFile(sourcePath, wrappedCode, 'utf-8');

    const compileResult = await runCommand('g++', [sourcePath, '-o', exePath, '-std=c++17'], dir);
    if (compileResult.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileResult.stderr,
        exitCode: compileResult.exitCode,
        timedOut: false,
        executionTime: compileResult.executionTime,
      };
    }

    const result = await runCommand(exePath, [], dir, input);
    return result;
  } finally {
    try { await unlink(sourcePath); } catch {}
    try { await unlink(exePath); } catch {}
  }
}

export async function executeCode(
  language: Language,
  code: string,
  input: string,
): Promise<ExecutionResult> {
  switch (language) {
    case 'javascript':
      return executeJavaScript(code, input);
    case 'python':
      return executePython(code, input);
    case 'cpp':
      return executeCpp(code, input);
    default:
      return {
        stdout: '',
        stderr: `Unsupported language: ${language}`,
        exitCode: 1,
        timedOut: false,
        executionTime: 0,
      };
  }
}
