import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BriefModuleData } from '../types';
import '../styles/PreviewPanel.css';

interface PreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  modules: BriefModuleData[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ isOpen, onClose, modules }) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayModules, setDisplayModules] = useState(modules);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayModules(modules);
        setIsTransitioning(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [modules, isOpen]);

  const handleViewChange = (mode: 'desktop' | 'mobile') => {
    if (mode === viewMode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(mode);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 250);
  };

  const previewHtml = useMemo(() => {
    const generateModuleHtml = (module: BriefModuleData, index: number) => {
      const bgColors: Record<string, string> = {
        headline: '#eff6ff',
        local: '#f0f9ff',
        international: '#eef2ff',
        finance: '#ecfdf5',
      };
      const accentColors: Record<string, string> = {
        headline: '#2563eb',
        local: '#0ea5e9',
        international: '#4f46e5',
        finance: '#10b981',
      };

      return `
        <div style="
          background: white;
          border-radius: 10px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          border-left: 4px solid ${accentColors[module.type]};
        ">
          <div style="
            background: ${bgColors[module.type]};
            padding: 12px 16px;
            font-weight: 600;
            color: ${accentColors[module.type]};
            font-size: 15px;
          ">
            ${module.title || '未命名模块'}
          </div>
          <div style="
            padding: 14px 16px;
            font-size: 13px;
            line-height: 1.7;
            color: #334155;
          ">
            ${module.content || '<p style="color:#94a3b8">暂无内容</p>'}
          </div>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
            background: #f8fafc;
            padding: 20px;
          }
          .news-brief {
            max-width: 600px;
            margin: 0 auto;
          }
          .brief-header {
            background: linear-gradient(135deg, #1e3a5f, #2563eb);
            color: white;
            padding: 24px 20px;
            border-radius: 12px 12px 0 0;
            text-align: center;
          }
          .brief-header h1 {
            font-size: 22px;
            margin-bottom: 6px;
          }
          .brief-header .date {
            font-size: 13px;
            opacity: 0.85;
          }
          .brief-body {
            background: white;
            padding: 20px;
            border-radius: 0 0 12px 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          img { max-width: 100%; height: auto; }
          ul, ol { padding-left: 24px; margin: 8px 0; }
          h1, h2, h3 { margin: 10px 0; }
          p { margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="news-brief">
          <div class="brief-header">
            <h1>每日新闻简报</h1>
            <div class="date">${new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}</div>
          </div>
          <div class="brief-body">
            ${displayModules.map((m, i) => generateModuleHtml(m, i)).join('')}
          </div>
        </div>
      </body>
      </html>
    `;
  }, [displayModules]);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml, isOpen]);

  return (
    <>
      <div className={`preview-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <div className={`preview-panel ${isOpen ? 'open' : ''}`}>
        <div className="preview-header">
          <h2>预览</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => handleViewChange('desktop')}
          >
            💻 桌面版
          </button>
          <button
            className={`view-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => handleViewChange('mobile')}
          >
            📱 手机版
          </button>
        </div>

        <div className="preview-content">
          <div className={`preview-frame-wrapper ${viewMode}`}>
            <iframe ref={iframeRef} className="preview-iframe" title="预览" />
          </div>

          {isTransitioning && (
            <div className="transition-overlay">
              <div className="gradient-block animating" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PreviewPanel;
