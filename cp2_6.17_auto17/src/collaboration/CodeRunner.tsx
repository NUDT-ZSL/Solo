import React, { useState, useCallback } from 'react';

interface CodeRunnerProps {
  code: string;
  language: string;
}

interface RunCodeResponse {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  executionTime?: number;
}

export const CodeRunner: React.FC<CodeRunnerProps> = ({ code, language }) => {
  const [output, setOutput] = useState<{ stdout: string; stderr: string }>({
    stdout: '',
    stderr: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setOutput({ stdout: '', stderr: '' });
    setExecutionTime(null);

    try {
      const startTime = Date.now();
      const response = await fetch('/api/runCode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: RunCodeResponse = await response.json();
      const endTime = Date.now();

      setOutput({
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      });

      if (result.executionTime !== undefined) {
        setExecutionTime(result.executionTime);
      } else {
        setExecutionTime(endTime - startTime);
      }

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (e: any) {
      setError(e.message || '执行失败');
    } finally {
      setIsLoading(false);
    }
  }, [code, language]);

  const combinedOutput = (output.stdout + output.stderr).trim();
  const hasOutput = combinedOutput.length > 0 || error;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#252526',
        borderTop: '1px solid #404040',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#2d2d2d',
          borderBottom: '1px solid #404040',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              color: '#d1d5db',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            控制台
          </span>
          <span
            style={{
              color: '#6b7280',
              fontSize: '12px',
              textTransform: 'uppercase',
            }}
          >
            {language}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {executionTime !== null && !isLoading && (
            <span
              style={{
                color: '#9ca3af',
                fontSize: '12px',
                padding: '2px 8px',
                backgroundColor: '#374151',
                borderRadius: '4px',
              }}
            >
              执行时间: {executionTime}ms
            </span>
          )}

          <button
            onClick={handleRun}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: isLoading ? '#166534' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#16a34a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#22c55e';
              }
            }}
          >
            {isLoading ? (
              <>
                <svg
                  style={{
                    width: '16px',
                    height: '16px',
                    animation: 'spin 1s linear infinite',
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="60"
                    strokeDashoffset="20"
                    opacity="0.25"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                运行中...
              </>
            ) : (
              <>
                <svg
                  style={{ width: '16px', height: '16px' }}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                运行
              </>
            )}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: '12px 16px',
          backgroundColor: '#1e1e1e',
          overflow: 'auto',
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {isLoading ? (
          <div style={{ color: '#6b7280' }}>
            <span
              style={{
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              正在执行代码...
            </span>
          </div>
        ) : hasOutput ? (
          <div>
            {error && (
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    color: '#ef4444',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  [错误]
                </div>
                <div style={{ color: '#ef4444' }}>{error}</div>
              </div>
            )}
            {output.stderr && (
              <div style={{ marginBottom: output.stdout ? '8px' : 0 }}>
                <div
                  style={{
                    color: '#ef4444',
                    opacity: 0.8,
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  [stderr]
                </div>
                <div style={{ color: '#ef4444' }}>{output.stderr}</div>
              </div>
            )}
            {output.stdout && (
              <div>
                <div
                  style={{
                    color: '#86efac',
                    opacity: 0.8,
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  [stdout]
                </div>
                <div style={{ color: '#e5e7eb' }}>{output.stdout}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#4b5563', fontStyle: 'italic' }}>
            点击「运行」按钮执行代码，输出将显示在此处。
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default CodeRunner;
