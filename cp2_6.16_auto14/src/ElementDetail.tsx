import { Element, CATEGORY_COLORS, CATEGORY_LABELS } from './elementData';

interface ElementDetailProps {
  element: Element | null;
  onClose: () => void;
  onPrevElement: () => void;
  onNextElement: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

function ElectronShellsDiagram({ shells }: { shells: number[] }) {
  const shellCount = Math.max(shells.length, 3);
  const shellSizes = [40, 75, 110, 145, 175, 200, 220];
  const shellLabels = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

  const renderElectrons = (count: number, radius: number) => {
    const dots: JSX.Element[] = [];
    const dotSpacing = 8;
    const circumference = 2 * Math.PI * radius;
    const maxDots = Math.floor(circumference / dotSpacing);
    const displayCount = Math.min(count, maxDots);

    for (let i = 0; i < displayCount; i++) {
      const angle = (i / displayCount) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * radius - 3;
      const y = Math.sin(angle) * radius - 3;
      dots.push(
        <span
          key={i}
          className="electron-dot"
          style={{
            transform: `translate(${x}px, ${y}px)`,
          }}
        />
      );
    }
    return dots;
  };

  return (
    <div className="electron-shells-diagram">
      {Array.from({ length: shellCount }).map((_, idx) => {
        const size = shellSizes[idx] || shellSizes[shellSizes.length - 1];
        const electronCount = shells[idx] || 0;
        return (
          <div
            key={idx}
            className="shell-circle"
            style={{
              width: `${size}px`,
              height: `${size}px`,
            }}
          >
            <span className="shell-label">{shellLabels[idx]}</span>
            {renderElectrons(electronCount, size / 2)}
          </div>
        );
      })}
      <div className="nucleus" />
    </div>
  );
}

export function ElementDetail({
  element,
  onClose,
  onPrevElement,
  onNextElement,
  canGoPrev,
  canGoNext,
}: ElementDetailProps) {
  if (!element) {
    return <aside className={`detail-panel ${element ? 'open' : ''}`} />;
  }

  const bgColor = CATEGORY_COLORS[element.category];
  const categoryLabel = CATEGORY_LABELS[element.category];

  return (
    <aside className={`detail-panel open`}>
      <button className="detail-close-btn" onClick={onClose} aria-label="关闭">
        ×
      </button>

      <div className="detail-header">
        <div className="detail-symbol" style={{ color: bgColor }}>
          {element.symbol}
        </div>
        <div className="detail-name">{element.name}</div>
        <div className="detail-atomic-number">原子序数 {element.atomicNumber}</div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">基本信息</div>
        <div className="detail-info-row">
          <span className="detail-info-label">原子量</span>
          <span className="detail-info-value">{element.weight.toFixed(3)}</span>
        </div>
        <div className="detail-info-row">
          <span className="detail-info-label">分类</span>
          <span className="detail-info-value">{categoryLabel}</span>
        </div>
        <div className="detail-info-row">
          <span className="detail-info-label">周期</span>
          <span className="detail-info-value">第 {element.period} 周期</span>
        </div>
        <div className="detail-info-row">
          <span className="detail-info-label">族</span>
          <span className="detail-info-value">第 {element.group} 族</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">电子层排布</div>
        <ElectronShellsDiagram shells={element.electronShells} />
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {element.electronShells.join(' · ')} 个电子
        </div>
      </div>

      <div className="detail-nav-buttons">
        <button className="nav-btn" onClick={onPrevElement} disabled={!canGoPrev}>
          ← 上一个
        </button>
        <button className="nav-btn" onClick={onNextElement} disabled={!canGoNext}>
          下一个 →
        </button>
      </div>
    </aside>
  );
}
