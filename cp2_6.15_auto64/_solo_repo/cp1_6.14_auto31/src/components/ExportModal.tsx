import React, { useState, useMemo, useCallback } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import type { ColorScheme, HSL } from '../utils/colorUtils';
import { hslToHex, copyToClipboard } from '../utils/colorUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  primary: HSL;
  schemes: readonly ColorScheme[];
}

type ExportFormat = 'css' | 'svg';

const SVG_CONFIG = {
  paddingX: 40,
  paddingTop: 40,
  paddingBottom: 40,
  headerHeight: 90,
  schemeGapY: 28,
  schemeLabelH: 24,
  swatchW: 160,
  swatchH: 70,
  swatchGap: 18,
  swatchLabelOffset: 20,
  borderRadius: 16,
};

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  primary,
  schemes,
}) => {
  const [format, setFormat] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  const cssContent = useMemo(() => {
    const lines: string[] = ['/* ColorHarmony 导出 - CSS 变量 */'];
    lines.push(`/* 生成时间: ${new Date().toISOString()} */`);
    lines.push(`/* 主色 HSL: hsl(${primary.h}, ${primary.s}%, ${primary.l}%) */`);
    lines.push('');
    lines.push(':root {');

    const primaryHex = hslToHex(primary);
    lines.push('  /* === 基础色 === */');
    lines.push(`  --color-primary: ${primaryHex};`);
    lines.push(`  --color-primary-h: ${primary.h};`);
    lines.push(`  --color-primary-s: ${primary.s}%;`);
    lines.push(`  --color-primary-l: ${primary.l}%;`);

    const typeNames: Record<string, { label: string; prefix: string }> = {
      monochromatic: { label: '单色方案', prefix: 'mono' },
      complementary: { label: '互补方案', prefix: 'comp' },
      split: { label: '分裂互补方案', prefix: 'split' },
      triadic: { label: '三角方案', prefix: 'tri' },
      tetradic: { label: '四色方案', prefix: 'tetra' },
    };

    lines.push('');
    lines.push('  /* === 按方案类型命名的颜色变量 === */');
    schemes.forEach((scheme) => {
      const cfg = typeNames[scheme.type] || {
        label: scheme.name,
        prefix: scheme.type,
      };
      lines.push(`  /* ${cfg.label} */`);
      scheme.colors.forEach((c, i) => {
        const hex = hslToHex(c);
        lines.push(`  --color-${cfg.prefix}-${i + 1}: ${hex};`);
      });
      lines.push('');
    });

    lines.push('  /* === 别名：语义化变量（取各方案首色） === */');
    const aliasMap: Array<[string, string]> = [
      ['secondary', schemes[1]?.type || 'comp'],
      ['accent', schemes[3]?.type || 'tri'],
      ['tertiary', schemes[2]?.type || 'split'],
      ['highlight', schemes[4]?.type || 'tetra'],
    ];
    aliasMap.forEach(([alias, type], i) => {
      const scheme = schemes.find((s) => s.type === type);
      const hex = scheme ? hslToHex(scheme.colors[0]) : primaryHex;
      lines.push(`  --color-${alias}: ${hex};`);
      void i;
    });

    lines.push('}');
    return lines.join('\n');
  }, [primary, schemes]);

  const svgContent = useMemo(() => {
    const {
      paddingX,
      paddingTop,
      headerHeight,
      schemeGapY,
      schemeLabelH,
      swatchW,
      swatchH,
      swatchGap,
      swatchLabelOffset,
      borderRadius,
      paddingBottom,
    } = SVG_CONFIG;

    const maxColorsPerScheme = Math.max(...schemes.map((s) => s.colors.length));
    const swatchRowWidth = maxColorsPerScheme * (swatchW + swatchGap) - swatchGap;
    const schemeBlockH = schemeLabelH + 10 + swatchH + swatchLabelOffset;
    const schemesTotalH =
      schemes.length * schemeBlockH + (schemes.length - 1) * schemeGapY;
    const totalW = Math.max(paddingX * 2 + swatchRowWidth, 720);
    const totalH = paddingTop + headerHeight + schemesTotalH + paddingBottom;
    const bgW = totalW;
    const bgH = totalH;

    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bgW}" height="${bgH}" viewBox="0 0 ${bgW} ${bgH}" xmlns:xlink="http://www.w3.org/1999/xlink">`
    );
    parts.push(
      `<defs><style>.t-title{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;font-size:26px;font-weight:800;fill:#f9fafb}.t-meta{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;font-size:13px;fill:#9ca3af}.t-scheme{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;font-size:15px;font-weight:700;fill:#c7d2fe}.t-hex{font-family:"SF Mono",Consolas,Monaco,monospace;font-size:12px;font-weight:700;fill:#f9fafb}</style></defs>`
    );
    parts.push(
      `<rect x="0" y="0" width="${bgW}" height="${bgH}" rx="${borderRadius}" fill="#111827"/>`
    );
    parts.push(
      `<line x1="${paddingX}" y1="${paddingTop + headerHeight - 18}" x2="${bgW - paddingX}" y2="${paddingTop + headerHeight - 18}" stroke="#1f2937" stroke-width="2"/>`
    );
    parts.push(
      `<text x="${paddingX}" y="${paddingTop + 34}" class="t-title">ColorHarmony 配色方案</text>`
    );
    parts.push(
      `<text x="${paddingX}" y="${paddingTop + 58}" class="t-meta">主色 HEX: ${hslToHex(
        primary
      )}  ·  HSL: (${primary.h}°, ${primary.s}%, ${primary.l}%)  ·  ${schemes.length} 套方案</text>`
    );
    parts.push(
      `<text x="${paddingX}" y="${paddingTop + 78}" class="t-meta">生成时间: ${new Date().toLocaleString(
        'zh-CN'
      )}</text>`
    );

    let cursorY = paddingTop + headerHeight;
    const rowStartX = paddingX;

    schemes.forEach((scheme) => {
      parts.push(
        `<text x="${rowStartX}" y="${cursorY + schemeLabelH}" class="t-scheme">${
          scheme.name
        }方案 <tspan fill="#6b7280" font-weight="500" font-size="12">· ${scheme.type}</tspan></text>`
      );
      const swatchY = cursorY + schemeLabelH + 10;
      scheme.colors.forEach((color, i) => {
        const x = rowStartX + i * (swatchW + swatchGap);
        const hex = hslToHex(color);
        parts.push(
          `<rect x="${x}" y="${swatchY}" width="${swatchW}" height="${swatchH}" rx="12" fill="${hex}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`
        );
        parts.push(
          `<text x="${x + swatchW / 2}" y="${swatchY + swatchH + swatchLabelOffset}" text-anchor="middle" class="t-hex">${hex}</text>`
        );
      });
      cursorY += schemeBlockH + schemeGapY;
    });

    parts.push(`</svg>`);
    return parts.join('\n');
  }, [primary, schemes]);

  const content = format === 'css' ? cssContent : svgContent;

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    const isCss = format === 'css';
    const blob = new Blob([content], {
      type: isCss
        ? 'text/css;charset=utf-8'
        : 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = hslToHex(primary).replace('#', '');
    a.download = isCss
      ? `colorharmony-${slug}.css`
      : `colorharmony-${slug}.svg`;
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
          <button
            className="export-close-btn"
            onClick={onClose}
            title="关闭"
          >
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
