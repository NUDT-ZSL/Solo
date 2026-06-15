import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Upload, ChevronRight, Copy, Download, RotateCw, Check, FileJson, Palette, Type, LayoutGrid, Box } from 'lucide-react';
import { parseDesignTokens, updateTokenValue, getAllTokens } from './parser';
import { generateCSSVariables, generateCSSLines, copyToClipboard, downloadCSS, highlightCSS } from './generator';
import TokenPreview from './components/TokenPreview';
import type { NormalizedTokens, TokenSelection, CategoryState, DesignToken } from './types';

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  color: { label: '颜色', icon: <Palette size={16} /> },
  font: { label: '字体', icon: <Type size={16} /> },
  spacing: { label: '间距', icon: <LayoutGrid size={16} /> },
  shadow: { label: '阴影', icon: <Box size={16} /> },
  other: { label: '其他', icon: <FileJson size={16} /> },
};

const emptyTokens: NormalizedTokens = {
  color: [],
  font: [],
  spacing: [],
  shadow: [],
  other: [],
};

const App: React.FC = () => {
  const [tokens, setTokens] = useState<NormalizedTokens>(emptyTokens);
  const [selection, setSelection] = useState<TokenSelection>({});
  const [expandedCategories, setExpandedCategories] = useState<CategoryState>({
    color: true,
    font: true,
    spacing: true,
    shadow: true,
    other: true,
  });
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showCopyNotice, setShowCopyNotice] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const hasTokens = useMemo(() => {
    return getAllTokens(tokens).length > 0;
  }, [tokens]);

  const cssVariables = useMemo(() => {
    return generateCSSVariables(tokens, selection);
  }, [tokens, selection]);

  const cssLines = useMemo(() => {
    return generateCSSLines(tokens, selection);
  }, [tokens, selection]);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setParseError('请上传JSON格式的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const normalized = parseDesignTokens(parsed);
        setTokens(normalized);
        const allTokens = getAllTokens(normalized);
        const newSelection: TokenSelection = {};
        allTokens.forEach((t) => {
          newSelection[t.name] = true;
        });
        setSelection(newSelection);
        setParseError(null);
      } catch {
        setParseError('JSON解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePasteParse = useCallback(() => {
    if (!pasteText.trim()) {
      setParseError('请输入JSON内容');
      return;
    }

    try {
      const parsed = JSON.parse(pasteText);
      const normalized = parseDesignTokens(parsed);
      setTokens(normalized);
      const allTokens = getAllTokens(normalized);
      const newSelection: TokenSelection = {};
      allTokens.forEach((t) => {
        newSelection[t.name] = true;
      });
      setSelection(newSelection);
      setParseError(null);
    } catch {
      setParseError('JSON解析失败，请检查格式');
    }
  }, [pasteText]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleToggleSelection = useCallback((tokenName: string) => {
    setSelection((prev) => ({
      ...prev,
      [tokenName]: prev[tokenName] === false ? true : false,
    }));
  }, []);

  const handleToggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleSelectAllInCategory = useCallback((category: keyof NormalizedTokens, select: boolean) => {
    setSelection((prev) => {
      const newSelection = { ...prev };
      tokens[category].forEach((token) => {
        newSelection[token.name] = select;
      });
      return newSelection;
    });
  }, [tokens]);

  const handleStartEdit = useCallback((token: DesignToken) => {
    setEditingToken(token.name);
    setEditValue(token.value);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }, []);

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleCommitEdit = useCallback(() => {
    if (editingToken) {
      const trimmed = editValue.trim() || editValue;
      setTokens((prev) => updateTokenValue(prev, editingToken, trimmed));
      setEditingToken(null);
      setEditValue('');
    }
  }, [editingToken, editValue]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      setEditingToken(null);
      setEditValue('');
    }
  }, [handleCommitEdit]);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(cssVariables);
    if (success) {
      setShowCopyNotice(true);
      setTimeout(() => setShowCopyNotice(false), 300);
    }
  }, [cssVariables]);

  const handleDownload = useCallback(() => {
    setIsDownloading(true);
    setTimeout(() => {
      downloadCSS(cssVariables, 'tokens.css');
      setIsDownloading(false);
    }, 500);
  }, [cssVariables]);

  const renderTokenCard = (token: DesignToken) => {
    const isSelected = selection[token.name] !== false;
    let cardContent: React.ReactNode = null;

    switch (token.type) {
      case 'color':
        cardContent = (
          <>
            <div className="token-color-preview" style={{ backgroundColor: token.value }} />
            <div className="token-value">{token.value}</div>
          </>
        );
        break;
      case 'font':
        cardContent = (
          <>
            <div className="token-font-preview" style={{ fontFamily: token.value }}>
              Aa
            </div>
            <div className="token-value">{token.value}</div>
          </>
        );
        break;
      case 'spacing': {
        const spacingToken = token as DesignToken & { pixelValue?: number };
        cardContent = (
          <>
            <div className="token-spacing-preview">
              <div
                className="spacing-dash"
                style={{ width: `${Math.min(Math.max(spacingToken.pixelValue || 16, 8), 60)}px` }}
              />
            </div>
            <div className="token-value">{token.value}</div>
          </>
        );
        break;
      }
      default:
        cardContent = <div className="token-value">{token.value}</div>;
    }

    return (
      <div
        key={token.name}
        className={`token-card ${isSelected ? 'selected' : ''}`}
      >
        <label className="token-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelection(token.name)}
          />
          <span className="checkbox-custom" />
        </label>
        <div className="token-content">
          <div className="token-name" title={token.name}>{token.name}</div>
          {cardContent}
        </div>
      </div>
    );
  };

  const renderCategory = (category: keyof NormalizedTokens) => {
    const categoryTokens = tokens[category];
    if (categoryTokens.length === 0) return null;

    const { label, icon } = categoryLabels[category];
    const isExpanded = expandedCategories[category];
    const allSelected = categoryTokens.every((t) => selection[t.name] !== false);

    return (
      <div key={category} className="token-category">
        <div className="category-header">
          <button
            className="category-toggle"
            onClick={() => handleToggleCategory(category)}
            type="button"
          >
            <ChevronRight
              size={16}
              className={`arrow-icon ${isExpanded ? 'expanded' : ''}`}
            />
            {icon}
            <span className="category-label">{label}</span>
            <span className="category-count">({categoryTokens.length})</span>
          </button>
          <div className="category-actions">
            <button
              type="button"
              className="mini-btn"
              onClick={() => handleSelectAllInCategory(category, !allSelected)}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="category-tokens">
            {categoryTokens.map((token) => renderTokenCard(token))}
          </div>
        )}
      </div>
    );
  };

  const renderEditableLine = (token: DesignToken, content: string) => {
    const isEditing = editingToken === token.name;
    const colonIdx = content.indexOf(':');
    const semiIdx = content.lastIndexOf(';');

    if (colonIdx === -1) {
      return (
        <div className="css-line">
          <span
            className="line-content"
            dangerouslySetInnerHTML={{ __html: highlightCSS(content) }}
          />
        </div>
      );
    }

    const beforePart = content.slice(0, colonIdx + 1) + ' ';
    const valuePart = content.slice(colonIdx + 1, semiIdx).trim();
    const afterPart = content.slice(semiIdx);

    if (isEditing) {
      return (
        <div className="css-line editing">
          <span className="line-content">
            <span dangerouslySetInnerHTML={{ __html: highlightCSS(beforePart) }} />
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={handleEditChange}
              onBlur={handleCommitEdit}
              onKeyDown={handleEditKeyDown}
              className="edit-input"
            />
            <span dangerouslySetInnerHTML={{ __html: highlightCSS(afterPart) }} />
          </span>
        </div>
      );
    }

    return (
      <div
        className="css-line editable-line"
        onClick={() => handleStartEdit(token)}
        title="点击编辑此值"
      >
        <span
          className="line-content"
          dangerouslySetInnerHTML={{
            __html: highlightCSS(beforePart) +
              `<span class="editable-value">${highlightCSS(valuePart)}</span>` +
              highlightCSS(afterPart),
          }}
        />
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">设计令牌提取与CSS变量生成器</h1>
        <p className="app-subtitle">自动解析JSON设计令牌，生成可复用的CSS变量</p>
      </header>

      {!hasTokens ? (
        <div className="input-section">
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab ${inputMode === 'upload' ? 'active' : ''}`}
              onClick={() => setInputMode('upload')}
            >
              <Upload size={18} />
              上传文件
            </button>
            <button
              type="button"
              className={`mode-tab ${inputMode === 'paste' ? 'active' : ''}`}
              onClick={() => setInputMode('paste')}
            >
              <FileJson size={18} />
              粘贴JSON
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <Upload size={48} className="drop-icon" />
              <p className="drop-text">拖拽JSON文件到此处</p>
              <p className="drop-subtext">或点击选择文件</p>
              <p className="drop-hint">支持扁平、嵌套及标准设计令牌JSON格式</p>
            </div>
          ) : (
            <div className="paste-section">
              <textarea
                className="paste-textarea"
                placeholder={'请粘贴JSON格式的设计令牌数据，例如：\n{\n  "color-primary": "#4a90d9",\n  "spacing-md": "16px"\n}'}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button
                type="button"
                className="parse-btn"
                onClick={handlePasteParse}
              >
                解析令牌
              </button>
            </div>
          )}

          {parseError && <div className="error-message">{parseError}</div>}
        </div>
      ) : (
        <div className="main-content">
          <div className="left-panel">
            <div className="panel-header">
              <h2>令牌列表</h2>
              <button
                type="button"
                className="reset-btn"
                onClick={() => {
                  setTokens(emptyTokens);
                  setSelection({});
                  setPasteText('');
                  setParseError(null);
                }}
              >
                重新导入
              </button>
            </div>
            <div className="token-list">
              {(['color', 'font', 'spacing', 'shadow', 'other'] as const).map(renderCategory)}
            </div>
          </div>

          <div className="divider" />

          <div className="right-panel">
            <div className="panel-header">
              <h2>CSS变量</h2>
              <div className="action-buttons">
                <button
                  type="button"
                  className="action-btn copy-btn"
                  onClick={handleCopy}
                >
                  {showCopyNotice ? <Check size={18} /> : <Copy size={18} />}
                  {showCopyNotice ? '已复制' : '复制代码'}
                </button>
                <button
                  type="button"
                  className="action-btn download-btn"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <RotateCw size={18} className="spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isDownloading ? '导出中...' : '下载CSS'}
                </button>
              </div>
            </div>

            <div className="code-container">
              <div className="code-wrapper">
                <div className="line-numbers">
                  {cssLines.map((_, index) => (
                    <div key={index} className="line-number">
                      {index + 1}
                    </div>
                  ))}
                </div>
                <div className="code-content">
                  {cssLines.map((line, index) => (
                    <div key={index} className="code-line">
                      {line.isVariable && line.token ? (
                        renderEditableLine(line.token, line.content)
                      ) : (
                        <div className="css-line">
                          <span
                            className="line-content"
                            dangerouslySetInnerHTML={{ __html: highlightCSS(line.content) }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="preview-section-container">
              <h3 className="preview-title">实时预览</h3>
              <TokenPreview tokens={tokens} />
            </div>
          </div>
        </div>
      )}

      {showCopyNotice && (
        <div className="copy-notice">已复制到剪贴板</div>
      )}
    </div>
  );
};

export default App;
