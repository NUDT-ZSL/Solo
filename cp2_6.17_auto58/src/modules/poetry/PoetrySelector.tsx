import React, { useState, useMemo } from 'react';
import { Poetry, poetryLibrary } from './PoetryLibrary';

export interface PoetrySelectorProps {
  selectedPoetryId?: string;
  onSelect: (poetry: Poetry) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

const CHAR_COUNT_OPTIONS = [
  { label: '全部', min: 0, max: 100 },
  { label: '短(≤25字)', min: 0, max: 25 },
  { label: '中(26-50字)', min: 26, max: 50 },
  { label: '长(>50字)', min: 51, max: 100 },
];

const PoetrySelector: React.FC<PoetrySelectorProps> = ({
  selectedPoetryId,
  onSelect,
  isMobile = false,
  isOpen = false,
  onCloseMobile,
}) => {
  const [selectedDynasty, setSelectedDynasty] = useState<'唐' | '宋' | '全部'>('全部');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('全部');
  const [selectedLength, setSelectedLength] = useState(0);

  const authors = useMemo(() => {
    const dynastyFilter = selectedDynasty === '全部' ? undefined : selectedDynasty;
    return ['全部', ...poetryLibrary.getAuthors(dynastyFilter)];
  }, [selectedDynasty]);

  const filteredPoems = useMemo(() => {
    let result = poetryLibrary.getAll();

    if (selectedDynasty !== '全部') {
      result = result.filter(p => p.dynasty === selectedDynasty);
    }

    if (selectedAuthor !== '全部') {
      result = result.filter(p => p.author === selectedAuthor);
    }

    const lengthFilter = CHAR_COUNT_OPTIONS[selectedLength];
    result = result.filter(p => p.charCount >= lengthFilter.min && p.charCount <= lengthFilter.max);

    return result;
  }, [selectedDynasty, selectedAuthor, selectedLength]);

  const handleDynastyChange = (dynasty: '唐' | '宋' | '全部') => {
    setSelectedDynasty(dynasty);
    setSelectedAuthor('全部');
  };

  const handlePoetryClick = (poetry: Poetry) => {
    onSelect(poetry);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="mobile-sidebar-overlay active"
          onClick={onCloseMobile}
        />
      )}
      <aside className={`sidebar ${isMobile && isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">诗词库</div>
          <div className="sidebar-subtitle">选择名篇，静心临摹</div>
        </div>

        <div className="filter-section">
          <div className="filter-label">朝代</div>
          <div className="filter-buttons">
            {(['全部', '唐', '宋'] as const).map(dynasty => (
              <button
                key={dynasty}
                className={`filter-btn ${selectedDynasty === dynasty ? 'active' : ''}`}
                onClick={() => handleDynastyChange(dynasty)}
              >
                {dynasty}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-label">作者</div>
          <div className="filter-buttons">
            {authors.map(author => (
              <button
                key={author}
                className={`filter-btn ${selectedAuthor === author ? 'active' : ''}`}
                onClick={() => setSelectedAuthor(author)}
              >
                {author}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-label">字数</div>
          <div className="filter-buttons">
            {CHAR_COUNT_OPTIONS.map((option, index) => (
              <button
                key={option.label}
                className={`filter-btn ${selectedLength === index ? 'active' : ''}`}
                onClick={() => setSelectedLength(index)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="poetry-grid">
          {filteredPoems.map(poetry => (
            <div
              key={poetry.id}
              className={`poetry-card ${selectedPoetryId === poetry.id ? 'active' : ''}`}
              onClick={() => handlePoetryClick(poetry)}
            >
              <span className="poetry-card-dynasty">{poetry.dynasty}</span>
              <div className="poetry-card-title">{poetry.title}</div>
              <div className="poetry-card-author">{poetry.author}</div>
              <div className="poetry-card-preview">
                {poetry.content.replace(/[，。？！、]/g, '').slice(0, 12)}
              </div>
            </div>
          ))}

          {filteredPoems.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 20px',
              color: '#888',
              fontSize: '13px',
            }}>
              暂无符合条件的诗词
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default PoetrySelector;
