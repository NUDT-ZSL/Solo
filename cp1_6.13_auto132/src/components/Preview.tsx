import { useEffect, useRef, useState, useCallback } from 'react';
import type { PreviewProps, SandboxMessage, PropsMap } from '../types';
import styles from './Preview.module.css';

const SANDBOX_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    #root {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .component-wrapper {
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .component-wrapper.updating {
      opacity: 0.7;
      transform: scale(0.99);
    }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      'use strict';
      
      let renderTimeout = null;
      let currentRoot = null;

      function formatError(error) {
        let message = error.message || String(error);
        const locMatch = message.match(/\\((\\d+):(\\d+)\\)/);
        if (locMatch) {
          const line = locMatch[1];
          const col = locMatch[2];
          message = message.replace(/\\(\\d+:\\d+\\)/, '');
          return \`第 \${line} 行第 \${col} 列: \${message.trim()}\`;
        }
        const lineMatch = message.match(/line (\\d+)/i);
        if (lineMatch) {
          return \`第 \${lineMatch[1]} 行: \${message.trim()}\`;
        }
        return message;
      }

      function compileAndRender(code, props) {
        try {
          if (!window.Babel) {
            throw new Error('Babel 尚未加载完成，请稍候...');
          }

          const componentCode = \`
            \${code}
          \`;

          const transformed = window.Babel.transform(componentCode, {
            presets: ['react'],
            filename: 'SandboxComponent.jsx',
          });

          const ComponentFactory = new Function('React', 'props', transformed.code);
          const Component = ComponentFactory(React, props);

          const rootEl = document.getElementById('root');
          rootEl.innerHTML = '';

          const wrapper = document.createElement('div');
          wrapper.className = 'component-wrapper';
          rootEl.appendChild(wrapper);

          if (currentRoot) {
            currentRoot.unmount();
          }
          
          currentRoot = ReactDOM.createRoot(wrapper);
          
          wrapper.classList.add('updating');
          if (renderTimeout) clearTimeout(renderTimeout);
          
          currentRoot.render(
            React.createElement(Component, props)
          );

          renderTimeout = setTimeout(() => {
            wrapper.classList.remove('updating');
          }, 150);

          window.parent.postMessage({ type: 'ready' }, '*');
          return true;
        } catch (error) {
          const formattedError = formatError(error);
          window.parent.postMessage({ type: 'error', error: formattedError }, '*');
          
          const rootEl = document.getElementById('root');
          rootEl.innerHTML = \`
            <div style="
              padding: 24px;
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              color: #991b1b;
              font-family: monospace;
              font-size: 13px;
              max-width: 100%;
              word-wrap: break-word;
            ">
              <div style="font-weight: 600; margin-bottom: 8px;">编译错误</div>
              <div>\${formattedError}</div>
            </div>
          \`;
          return false;
        }
      }

      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data && data.type === 'render') {
          compileAndRender(data.code, data.props);
        }
      });

      window.parent.postMessage({ type: 'ready' }, '*');
    })();
  </script>
</body>
</html>
`;

export default function Preview({ code, props, onError }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const lastCodeRef = useRef<string>('');
  const lastPropsRef = useRef<PropsMap | null>(null);

  const handleMessage = useCallback((event: MessageEvent<SandboxMessage>) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'ready') {
      setIsReady(true);
    } else if (data.type === 'error') {
      onError(data.error || '未知错误');
    }
  }, [onError]);

  const sendToSandbox = useCallback((code: string, props: PropsMap) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    const message: SandboxMessage = {
      type: 'render',
      code,
      props,
    };

    iframeRef.current.contentWindow.postMessage(message, '*');
    lastCodeRef.current = code;
    lastPropsRef.current = props;
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (!isReady) return;

    const propsChanged = JSON.stringify(props) !== JSON.stringify(lastPropsRef.current);
    const codeChanged = code !== lastCodeRef.current;

    if (codeChanged || propsChanged) {
      setIsUpdating(true);
      
      const timer = setTimeout(() => {
        sendToSandbox(code, props);
        onError(null);
      }, codeChanged ? 0 : 50);

      const updateTimer = setTimeout(() => {
        setIsUpdating(false);
      }, 200);

      return () => {
        clearTimeout(timer);
        clearTimeout(updateTimer);
      };
    }
  }, [code, props, isReady, sendToSandbox, onError]);

  return (
    <div className={styles.previewContainer}>
      <div className={styles.header}>
        <span className={styles.title}>组件预览</span>
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusDot} ${isReady ? styles.ready : ''}`} />
          <span className={styles.statusText}>{isReady ? '就绪' : '加载中...'}</span>
        </div>
      </div>
      <div className={`${styles.previewContent} ${isUpdating ? styles.updating : ''}`}>
        <iframe
          ref={iframeRef}
          className={styles.iframe}
          srcDoc={SANDBOX_HTML}
          sandbox="allow-scripts allow-same-origin"
          title="Component Preview"
        />
      </div>
    </div>
  );
}
