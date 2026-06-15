import React, { useState, useMemo } from 'react';
import { Code, Copy, Check, Download } from 'lucide-react';
import type { ColorToken, TypographyToken, SpacingValue } from '../types';
import { generateCSS, downloadCSSFile } from '../utils/cssGenerator';
import { copyToClipboard } from '../utils/colorUtils';

interface CodeExportProps {
  colors: ColorToken[];
  typography: TypographyToken;
  spacings: SpacingValue[];
}

const CodeExport: React.FC<CodeExportProps> = ({ colors, typography, spacings }) => {
  const [copied, setCopied] = useState(false);

  const cssCode = useMemo(
    () => generateCSS(colors, typography, spacings),
    [colors, typography, spacings],
  );

  const handleCopy = async () => {
    await copyToClipboard(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    downloadCSSFile(cssCode, 'design-tokens.css');
  };

  return (
    <div className="code-export">
      <div className="code-header">
        <div className="code-title">
          <Code size={16} />
          <span>CSS 代码导出</span>
        </div>
        <div className="code-actions">
          <button
            className={`action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制代码'}
          </button>
          <button className="action-btn primary" onClick={handleDownload}>
            <Download size={14} />
            下载CSS文件
          </button>
        </div>
      </div>
      <pre className="code-block">
        <code>{cssCode}</code>
      </pre>
    </div>
  );
};

export default CodeExport;
