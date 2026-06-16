const { exec } = require('child_process');

const TIMEOUT_MS = 5000;

function escapeShellArg(str) {
  return '"' + str.replace(/"/g, '\\"') + '"';
}

function runCode(req, res) {
  const { code, language } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      stdout: '',
      stderr: '代码不能为空',
      exitCode: 1,
      executionTime: 0,
      error: '代码不能为空'
    });
  }

  if (!language || !['python', 'javascript'].includes(language)) {
    return res.status(400).json({
      stdout: '',
      stderr: '不支持的编程语言',
      exitCode: 1,
      executionTime: 0,
      error: '不支持的编程语言，仅支持 python 和 javascript'
    });
  }

  let command;
  if (language === 'javascript') {
    command = `node -e ${escapeShellArg(code)}`;
  } else {
    command = `python -c ${escapeShellArg(code)}`;
  }

  const startTime = Date.now();
  let timedOut = false;

  const childProcess = exec(command, {
    timeout: TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
    encoding: 'utf8'
  }, (error, stdout, stderr) => {
    const executionTime = Date.now() - startTime;

    if (timedOut) {
      return res.json({
        stdout: stdout || '',
        stderr: (stderr || '') + '\n执行超时（超过5秒）',
        exitCode: -1,
        executionTime,
        error: '执行超时（超过5秒）'
      });
    }

    let exitCode = 0;
    if (error) {
      if (error.killed) {
        return res.json({
          stdout: stdout || '',
          stderr: (stderr || '') + '\n执行超时（超过5秒）',
          exitCode: -1,
          executionTime,
          error: '执行超时（超过5秒）'
        });
      }
      exitCode = error.code || 1;
    }

    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode,
      executionTime
    });
  });

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    try {
      childProcess.kill('SIGKILL');
    } catch (e) {
      // ignore
    }
  }, TIMEOUT_MS);

  childProcess.on('exit', () => {
    clearTimeout(timeoutTimer);
  });

  childProcess.on('error', () => {
    clearTimeout(timeoutTimer);
  });
}

module.exports = { runCode };
