import { useState, useEffect } from 'react';
import { useMoodBoardStore } from '../store/useMoodBoardStore';
import { ELEMENT_LIBRARY } from '../data/elements';
import { CATEGORY_LABELS, type ElementCategory, type ElementItem } from '../types';
import './ElementPanel.css';

const CATEGORIES: ElementCategory[] = [
  'primaryColor',
  'secondaryColor',
  'font',
  'layout',
  'pattern',
  'iconStyle',
];

const CATEGORY_ICONS: Record<ElementCategory, string> = {
  primaryColor: '🎨',
  secondaryColor: '🖌️',
  font: '🔤',
  layout: '📐',
  pattern: '🔷',
  iconStyle: '✨',
};

export function ElementPanel() {
  const { activeCategory, setActiveCategory, addElement } = useMoodBoardStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const elements = ELEMENT_LIBRARY[activeCategory];

  const handleElementClick = (element: ElementItem) => {
    addElement(element.id);
  };

  const handleCategorySelect = (cat: ElementCategory) => {
    setActiveCategory(cat);
    setIsDropdownOpen(false);
  };

  const renderElementPreview = (element: ElementItem) => {
    switch (element.category) {
      case 'primaryColor':
      case 'secondaryColor':
        return (
          <div
            className="element-preview color-preview"
            style={{ backgroundColor: element.value }}
          />
        );
      case 'font':
        return (
          <div
            className="element-preview font-preview"
            style={{ fontFamily: element.value }}
          >
            Aa
          </div>
        );
      case 'layout':
        return <div className={`element-preview layout-preview layout-${element.value}`} />;
      case 'pattern':
        return <div className={`element-preview pattern-preview pattern-${element.value}`} />;
      case 'iconStyle':
        return <div className={`element-preview icon-preview icon-${element.value}`} />;
      default:
        return null;
    }
  };

  return (
    <div className="element-panel">
      {isMobileView ? (
        <div className="category-scroll-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-scroll-item ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategorySelect(cat)}
            >
              <span className="scroll-icon">{CATEGORY_ICONS[cat]}</span>
              <span className="scroll-label">{CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="category-selector">
          <div
            className="category-selector-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="selector-icon">{CATEGORY_ICONS[activeCategory]}</span>
            <span className="selector-label">{CATEGORY_LABELS[activeCategory]}</span>
            <span className={`selector-arrow ${isDropdownOpen ? 'open' : ''}`}>▾</span>
          </div>
          {isDropdownOpen && (
            <div className="category-dropdown">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className={`dropdown-item ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <span className="dropdown-icon">{CATEGORY_ICONS[cat]}</span>
                  <span className="dropdown-label">{CATEGORY_LABELS[cat]}</span>
                  {activeCategory === cat && <span className="dropdown-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="elements-grid">
        {elements.map((element) => (
          <div
            key={element.id}
            className="element-card"
            onClick={() => handleElementClick(element)}
            title={`点击添加：${element.name}`}
          >
            {renderElementPreview(element)}
            <span className="element-name">{element.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
