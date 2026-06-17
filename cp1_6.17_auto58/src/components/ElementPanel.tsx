import { useMoodBoardStore } from '../store/useMoodBoardStore';
import { ELEMENT_LIBRARY } from '../data/elements';
import { CATEGORY_LABELS, type ElementCategory, type ElementItem } from '../types';
import './ElementPanel.css';

export function ElementPanel() {
  const { activeCategory, setActiveCategory, addElement } = useMoodBoardStore();
  const categories: ElementCategory[] = [
    'primaryColor',
    'secondaryColor',
    'font',
    'layout',
    'pattern',
    'iconStyle',
  ];

  const elements = ELEMENT_LIBRARY[activeCategory];

  const handleElementClick = (element: ElementItem) => {
    addElement(element.id);
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
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <div className="elements-grid">
        {elements.map((element) => (
          <div
            key={element.id}
            className="element-card"
            onClick={() => handleElementClick(element)}
            title={element.name}
          >
            {renderElementPreview(element)}
            <span className="element-name">{element.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
