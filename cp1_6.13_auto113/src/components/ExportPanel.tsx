import { useState } from 'react';
import type { BookmarkNode } from '../api/bookmarks';

interface ExportPanelProps {
  bookmarks: BookmarkNode[];
}

function generateMarkdownTree(nodes: BookmarkNode[], depth: number = 2): string {
  let md = '';
  const prefix = '#'.repeat(Math.min(depth, 6));

  nodes.forEach(node => {
    if (node.url && node.url.trim()) {
      md += `${prefix} [${node.title}](${node.url})\n\n`;
    } else {
      md += `${prefix} ${node.title}\n\n`;
    }
    if (node.children && node.children.length > 0) {
      md += generateMarkdownTree(node.children, depth + 1);
    }
  });

  return md;
}

export default function ExportPanel({ bookmarks }: ExportPanelProps) {
  const [markdown, setMarkdown] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    const md = generateMarkdownTree(bookmarks);
    setMarkdown(md);
    setShowPreview(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      style={{
        width: '320px',
        height: '100%',
        backgroundColor: '#f8fafc',
        borderTopLeftRadius: '12px',
        borderBottomLeftRadius: '12px',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '4px',
          }}
        >
          导出面板
        </h2>
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          将书签导出为 Markdown 格式
        </p>
      </div>

      <div
        style={{
          padding: '20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={handleExport}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            marginBottom: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366f1';
          }}
        >
          导出为 Markdown
        </button>

        {showPreview && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                预览
              </span>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease, color 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                    e.currentTarget.style.color = '#475569';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  复制
                </button>
                {copied && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 6px)',
                      color: '#22c55e',
                      fontSize: '12px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      animation: 'fadeInOut 2s ease-in-out',
                    }}
                  >
                    已复制
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                padding: '16px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '22px',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {markdown}
            </div>
          </>
        )}

        {!showPreview && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '14px',
              textAlign: 'center',
              lineHeight: '24px',
            }}
          >
            <div>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
              点击上方按钮<br />生成 Markdown 预览
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-4px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
