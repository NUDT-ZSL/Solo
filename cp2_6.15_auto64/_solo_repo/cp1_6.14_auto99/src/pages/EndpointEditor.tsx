import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, Send } from 'lucide-react';
import { JsonEditor } from '../components/JsonEditor';
import { MethodBadge } from '../components/MethodBadge';
import { endpointApi } from '../http';
import { isValidJson, highlightJson } from '../utils';
import type { Endpoint, HttpMethod, TestResponse } from '../types';

const defaultResponseBody = JSON.stringify(
  {
    message: 'Hello from StubBubble!',
    success: true,
    data: null,
  },
  null,
  2
);

export const EndpointEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [leftWidth, setLeftWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/api/example');
  const [statusCode, setStatusCode] = useState(200);
  const [responseBody, setResponseBody] = useState(defaultResponseBody);
  const [delay, setDelay] = useState(0);
  const [testResult, setTestResult] = useState<TestResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!isNew && id) {
      const loadEndpoint = async () => {
        try {
          setLoading(true);
          const data = await endpointApi.getById(id);
          setMethod(data.method);
          setPath(data.path);
          setStatusCode(data.statusCode);
          setResponseBody(data.responseBody);
          setDelay(data.delay);
        } catch (error) {
          console.error('Failed to load endpoint:', error);
        } finally {
          setLoading(false);
        }
      };
      loadEndpoint();
    } else {
      setLoading(false);
    }
  }, [id, isNew]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
  }, [isMobile]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current || isMobile) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth >= 20 && newWidth <= 80) {
        setLeftWidth(newWidth);
      }
    },
    [isMobile]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleSave = async () => {
    if (!isValidJson(responseBody)) {
      alert('请输入有效的JSON响应体');
      return;
    }
    if (!path.startsWith('/')) {
      alert('路径必须以/开头');
      return;
    }

    try {
      setSaving(true);
      const data = {
        method,
        path,
        statusCode,
        responseBody,
        delay,
      };

      if (isNew) {
        await endpointApi.create(data);
      } else if (id) {
        await endpointApi.update(id, { ...data, id });
      }
      navigate('/');
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isNew && id && confirm('确定要删除这个端点吗？')) {
      try {
        await endpointApi.delete(id);
        navigate('/');
      } catch (error) {
        console.error('Failed to delete endpoint:', error);
      }
    }
  };

  const handleTest = async () => {
    if (!path.startsWith('/')) {
      alert('路径必须以/开头');
      return;
    }

    try {
      setTesting(true);
      setTestError(null);
      setTestResult(null);

      let tempId: string | null = null;
      if (isNew) {
        const tempEndpoint = await endpointApi.create({
          method,
          path,
          statusCode,
          responseBody,
          delay,
        });
        tempId = tempEndpoint.id;
      } else if (id) {
        await endpointApi.update(id, {
          id,
          method,
          path,
          statusCode,
          responseBody,
          delay,
        });
      }

      const result = await endpointApi.test(method, path, delay);
      setTestResult(result);

      if (tempId) {
        await endpointApi.delete(tempId);
      }
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestError(error?.message || '请求失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const leftStyle = isMobile
    ? { flex: 'none', width: '100%', borderRight: 'none', borderBottom: '2px solid var(--divider)' }
    : { flex: `0 0 ${leftWidth}%`, borderRight: '2px solid var(--divider)' };

  return (
    <div className="main-content" style={{ padding: 0, height: 'calc(100vh - 0px)' }}>
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft size={20} />
          </button>
          <MethodBadge method={method} />
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: '16px' }}>
            {path}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isNew && (
            <button className="btn-danger" onClick={handleDelete}>
              <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              删除
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate('/')}>
            取消
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ width: 'auto', padding: '0 20px' }}
          >
            <Save size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="editor-layout" ref={containerRef} style={{ height: 'calc(100vh - 65px)' }}>
        <div className="editor-panel editor-left" style={leftStyle}>
          <div className="form-group">
            <label className="form-label">HTTP 方法</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              style={{ cursor: 'pointer' }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">接口路径</label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/users"
              style={{ fontFamily: "'Fira Code', monospace" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">响应状态码</label>
            <input
              type="number"
              value={statusCode}
              onChange={(e) => setStatusCode(parseInt(e.target.value) || 200)}
              min={100}
              max={599}
              style={{ fontFamily: "'Fira Code', monospace" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              延迟响应
              <span className="slider-value">{delay}ms</span>
            </label>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
                min={0}
                max={5000}
                step={100}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
                width: '200px',
              }}
            >
              <span>0ms</span>
              <span>5000ms</span>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <button
              className="btn-primary"
              onClick={handleTest}
              disabled={testing}
              style={{
                width: '100px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseOver={(e) => {
                if (!testing) e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }}
            >
              <Send size={14} />
              {testing ? '测试中...' : '发送测试'}
            </button>
          </div>
        </div>

        {!isMobile && (
          <div
            className={`divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          />
        )}

        <div className="editor-panel editor-right" style={{ padding: '24px' }}>
          <JsonEditor value={responseBody} onChange={setResponseBody} />

          {(testResult || testError) && (
            <div className="test-result">
              <div className="test-status">
                {testResult && (
                  <>
                    <span
                      className={`status-code ${testResult.status >= 400 ? 'error' : ''}`}
                    >
                      {testResult.status} {testResult.statusText}
                    </span>
                    <span className="status-time">耗时: {testResult.time}ms</span>
                  </>
                )}
                {testError && (
                  <span className="status-code error">请求失败: {testError}</span>
                )}
              </div>
              {testResult && (
                <div
                  className="json-preview"
                  style={{ marginTop: 0 }}
                  dangerouslySetInnerHTML={{
                    __html: highlightJson(JSON.stringify(testResult.data, null, 2)),
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
