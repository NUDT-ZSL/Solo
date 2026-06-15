import { useState, useMemo, useRef, useCallback } from 'react';
import { ElementCard } from './ElementCard';
import { ElementDetail } from './ElementDetail';
import {
  elements,
  mainTableElements,
  lanthanides,
  actinides,
  Element,
  ElementCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from './elementData';

type FilterCategory = 'all' | ElementCategory;

export function PeriodicTable() {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [isFBlockExpanded, setIsFBlockExpanded] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredElements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query && categoryFilter === 'all') return elements;

    return elements.filter((el) => {
      const matchesSearch =
        !query ||
        el.symbol.toLowerCase().includes(query) ||
        el.name.toLowerCase().includes(query) ||
        el.atomicNumber.toString().includes(query);

      const matchesCategory = categoryFilter === 'all' || el.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const filteredAtomicNumbers = useMemo(
    () => new Set(filteredElements.map((e) => e.atomicNumber)),
    [filteredElements]
  );

  const isElementVisible = useCallback(
    (el: Element) => filteredAtomicNumbers.has(el.atomicNumber),
    [filteredAtomicNumbers]
  );

  const isDimmed = useCallback(
    (el: Element) => {
      if (!selectedElement && !hoveredElement) return false;
      const refEl = selectedElement || hoveredElement;
      if (!refEl) return false;
      return el.period !== refEl.period && el.group !== refEl.group;
    },
    [selectedElement, hoveredElement]
  );

  const scrollToElement = useCallback((element: Element) => {
    const card = document.querySelector(
      `[data-atomic-number="${element.atomicNumber}"]`
    ) as HTMLElement | null;
    if (card) {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, []);

  const handleElementSelect = useCallback((element: Element) => {
    setSelectedElement((prev) => {
      if (prev?.atomicNumber === element.atomicNumber) {
        return null;
      }
      return element;
    });
  }, []);

  const handleElementHover = useCallback((element: Element | null) => {
    setHoveredElement(element);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedElement(null);
  }, []);

  const handlePrevElement = useCallback(() => {
    if (!selectedElement) return;
    const currentIdx = filteredElements.findIndex(
      (e) => e.atomicNumber === selectedElement.atomicNumber
    );
    if (currentIdx > 0) {
      const prev = filteredElements[currentIdx - 1];
      setSelectedElement(prev);
      scrollToElement(prev);
    }
  }, [selectedElement, filteredElements, scrollToElement]);

  const handleNextElement = useCallback(() => {
    if (!selectedElement) return;
    const currentIdx = filteredElements.findIndex(
      (e) => e.atomicNumber === selectedElement.atomicNumber
    );
    if (currentIdx >= 0 && currentIdx < filteredElements.length - 1) {
      const next = filteredElements[currentIdx + 1];
      setSelectedElement(next);
      scrollToElement(next);
    }
  }, [selectedElement, filteredElements, scrollToElement]);

  const currentIdx = useMemo(() => {
    if (!selectedElement) return -1;
    return filteredElements.findIndex((e) => e.atomicNumber === selectedElement.atomicNumber);
  }, [selectedElement, filteredElements]);

  const categoryOptions = useMemo(() => {
    const cats = Object.entries(CATEGORY_LABELS) as [ElementCategory, string][];
    return cats;
  }, []);

  return (
    <div className="app">
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索元素符号、名称或原子序数..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FilterCategory)}
        >
          <option value="all">全部分类</option>
          {categoryOptions.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="periodic-table-container">
        <div className="periodic-table-wrapper" ref={tableRef}>
          <div className="periodic-table">
            {mainTableElements
              .filter(isElementVisible)
              .map((element) => (
                <ElementCard
                  key={element.atomicNumber}
                  element={element}
                  isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                  isHovered={hoveredElement?.atomicNumber === element.atomicNumber}
                  isDimmed={isDimmed(element)}
                  searchQuery={searchQuery}
                  onSelect={handleElementSelect}
                  onHover={handleElementHover}
                />
              ))}
          </div>

          <button
            className="toggle-f-block-btn"
            onClick={() => setIsFBlockExpanded((v) => !v)}
          >
            <span className={`arrow-icon ${isFBlockExpanded ? 'up' : ''}`}>▼</span>
            {isFBlockExpanded ? '收起镧系/锕系' : '展开镧系/锕系'}
          </button>

          <div
            className={`lanthanide-actinide-section ${
              isFBlockExpanded ? 'expanded' : 'collapsed'
            }`}
          >
            <div className="lanthanide-row">
              {lanthanides.filter(isElementVisible).map((element) => (
                <ElementCard
                  key={element.atomicNumber}
                  element={element}
                  isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                  isHovered={hoveredElement?.atomicNumber === element.atomicNumber}
                  isDimmed={isDimmed(element)}
                  searchQuery={searchQuery}
                  onSelect={handleElementSelect}
                  onHover={handleElementHover}
                />
              ))}
            </div>
            <div className="actinide-row">
              {actinides.filter(isElementVisible).map((element) => (
                <ElementCard
                  key={element.atomicNumber}
                  element={element}
                  isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                  isHovered={hoveredElement?.atomicNumber === element.atomicNumber}
                  isDimmed={isDimmed(element)}
                  searchQuery={searchQuery}
                  onSelect={handleElementSelect}
                  onHover={handleElementHover}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="legend">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <div key={key} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: CATEGORY_COLORS[key as ElementCategory] }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <ElementDetail
        element={selectedElement}
        onClose={handleCloseDetail}
        onPrevElement={handlePrevElement}
        onNextElement={handleNextElement}
        canGoPrev={currentIdx > 0}
        canGoNext={currentIdx >= 0 && currentIdx < filteredElements.length - 1}
      />
    </div>
  );
}
