import React, { useState, useMemo, useCallback } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import type { ColorScheme, HSL } from '../utils/colorUtils';
import { hslToHex } from '../utils/colorUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  primary: HSL;
  schemes: ColorScheme[];
}

type ExportFormat = 'css' | 'svg';

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  primary,
  schemes,
}) => {
  const [format, setFormat] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  const cssContent = useMemo(() => {
    const lines: string[] = [':root {'];
    lines.push(`  --color-primary: ${hslToHex(primary)};`);

    const allColors: string[] = [];
    schemes.forEach((scheme) => {
      scheme.colors.forEach((c) => allColors.push(hslToHex(c)));
    });

    const uniqueColors = [...new Set(allColors)];
    uniqueColors.slice(0, 4).forEach((hex, i) => {
      const names = ['secondary', 'accent', 'tertiary', 'highlight'];
      lines.push(`  --color-${names[i]}: ${hex};`);
    });

    lines.push('');
    lines.push('  /* 各配色方案完整色值 */');
    schemes.forEach((scheme) => {
      const prefix = `--${scheme.type}`;
      scheme.colors.forEach((c, i) => {
        lines.push(`  ${prefix}-${i + 1}: ${hslToHex(c)};`);
      });
    });

    lines.push('}');
    return lines.join('\n');
  }, [primary, schemes]);

  const svgContent = useMemo(() => {
    const swatchW = 140;
    const swatchH = 60;
    const gap = 16;
    const padding = 32;
    const headerH = 72;
    const schemeH = swatchH + gap + 40;
    const totalH = headerH + schemes.length * schemeH + padding * 2;
    const totalW = padding * 2 + 4 * (swatchW + gap);

    const parts: string[] = [];
    parts.push(
      `<?xml version="1.0" encoding="UTF-8"?>`
    );
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`
    );
    parts.push(
      `<rect width="100%" height="100%" rx="16" fill="#111827"/>`
    );
    parts.push(
      `<text x="${padding}" y="${padding + 28}" font-family="sans-serif" font-size="22" font-weight="700" fill="#f9fafb">ColorHarmony 配色方案</text>`
    );
    parts.push(
      `<text x="${padding}" y="${padding + 52}" font-family="sans-serif" font-size="13" fill="#9ca3af">主色: ${hslToHex(primary)}  |  生成时间: ${new Date().toLocaleString('zh-CN')}</text>`
    );

    let y = headerH + padding;

    schemes.forEach((scheme) => {
      parts.push(
        `<text x="${padding}" y="${y + 20}" font-family="sans-serif" font-size="14" font-weight="600" fill="#c7d2fe">${scheme.name}方案</text>`
      );
      scheme.colors.forEach((color, i) => {
        const x = padding + i * (swatchW + gap);
        const hex = hslToHex(color);
        const rowY = y + 32;
        parts.push(
          `<rect x="${x}" y="${rowY}" width="${swatchW}" height="${swatchH}" rx="10" fill="${hex}"/>`
        );
        parts.push(
          `<text x="${x + swatchW / 2}" y="${rowY + swatchH + 22}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="#f9fafb">${hex}</text>`
        );
      });
      y += schemeH;
    });

    parts.push(`</svg>`);
    return parts.join('\n');
  }, [primary, schemes]);

  const content = format === 'css' ? cssContent : svgContent;

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], {
      type:
        format === 'css' ? 'text/css;charset=utf-8' : 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      format === 'css'
        ? `colorharmony-${hslToHex(primary).replace('#', '')}.css`
        : `colorharmony-${hslToHex(primary).replace('#', '')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, format, primary]);

  if (!isOpen) return null;

  return (
    <div className="export-modal-backdrop" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="export-modal-title">导出色板</div>
          <button className="export-close-btn" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="export-tabs">
          <button
            className={`export-tab ${format === 'css' ? 'active' : ''}`}
            onClick={() => setFormat('css')}
          >
            CSS 变量
          </button>
          <button
            className={`export-tab ${format === 'svg' ? 'active' : ''}`}
            onClick={() => setFormat('svg')}
          >
            SVG 色板
          </button>
        </div>

        <div className="export-body">
          <pre className="export-code">{content}</pre>
        </div>

        <div className="export-footer">
          <button
            className="btn-secondary"
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            className="btn-primary"
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={15} />
            下载{format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
