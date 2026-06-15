import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  instrumentsData,
  categories,
  filterByCategory,
  searchByName,
  getFormattedInstruments,
  formatPrice,
  getConditionColor,
  formatDate,
  type Instrument,
  type InstrumentCategory,
  type FormattedInstrument,
} from './data';
import { createInstrumentAudio, type AudioPlayer } from './audio';

const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #FAFAFA;
    color: #333;
    -webkit-font-smoothing: antialiased;
  }

  .app {
    min-height: 100vh;
  }

  .header {
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo {
    font-size: 24px;
    font-weight: bold;
    color: #FF6B35;
    white-space: nowrap;
  }

  .search-container {
    flex: 1;
    position: relative;
    max-width: 400px;
  }

  .search-input {
    width: 100%;
    padding: 10px 16px;
    border: 2px solid #E8E8E8;
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
    background: #F5F5F5;
  }

  .search-input:focus {
    border-color: #FF6B35;
    background: white;
  }

  .search-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    margin-top: 8px;
    overflow: hidden;
    z-index: 1000;
  }

  .search-item {
    padding: 12px 16px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    border-bottom: 1px solid #F0F0F0;
  }

  .search-item:last-child {
    border-bottom: none;
  }

  .search-item:hover {
    background-color: #FFF5F0;
  }

  .search-item-name {
    font-weight: 500;
    font-size: 14px;
    color: #333;
  }

  .search-item-price {
    font-size: 12px;
    color: #FF6B35;
    margin-top: 2px;
  }

  .search-empty {
    padding: 16px;
    text-align: center;
    color: #999;
    font-size: 14px;
  }

  .favorites-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    position: relative;
  }

  .favorites-btn:hover {
    background-color: #F5F5F5;
  }

  .favorites-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    background: #FF6B35;
    color: white;
    font-size: 11px;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    font-weight: bold;
  }

  .main-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
  }

  .category-filter {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 8px 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
    margin-bottom: 8px;
  }

  .category-filter::-webkit-scrollbar {
    display: none;
  }

  .category-tag {
    flex-shrink: 0;
    padding: 8px 20px;
    border-radius: 20px;
    background-color: #E0E0E0;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    user-select: none;
  }

  .category-tag:hover {
    background-color: #D0D0D0;
  }

  .category-tag.active {
    background-color: #FF6B35;
    color: white;
  }

  .category-count {
    font-size: 13px;
    color: #888;
    margin-bottom: 20px;
    padding-left: 4px;
  }

  .instruments-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .instrument-card {
    background: white;
    border: 1px solid #E8E8E8;
    border-radius: 8px;
    padding: 20px;
    cursor: pointer;
    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    position: relative;
  }

  .instrument-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.145);
  }

  .instrument-card.highlight {
    animation: highlightFlash 3s ease-out;
  }

  @keyframes highlightFlash {
    0%, 100% {
      border-color: #E8E8E8;
      box-shadow: none;
    }
    20% {
      border-color: #FF6B35;
      box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
    }
    40% {
      border-color: #FF6B35;
      box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
    }
  }

  .instrument-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .instrument-type {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #666;
    margin-bottom: 12px;
  }

  .type-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #FF6B35;
  }

  .instrument-price {
    font-size: 22px;
    font-weight: bold;
    color: #FF6B35;
    margin-bottom: 12px;
  }

  .instrument-condition {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .condition-bar {
    flex: 1;
    height: 6px;
    background: #F0F0F0;
    border-radius: 3px;
    overflow: hidden;
    max-width: 120px;
  }

  .condition-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .condition-text {
    font-size: 13px;
    font-weight: 500;
  }

  .instrument-date {
    font-size: 12px;
    color: #999;
  }

  .play-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #FFC107;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, background-color 0.2s ease;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.4);
  }

  .play-btn:hover {
    transform: scale(1.1);
  }

  .play-btn.playing {
    background-color: #F44336;
    box-shadow: 0 2px 8px rgba(244, 67, 54, 0.4);
    animation: pulse 0.15s ease infinite alternate;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.15);
    }
  }

  .play-icon {
    width: 0;
    height: 0;
    border-left: 10px solid white;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    margin-left: 2px;
  }

  .stop-icon {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 2px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }

  .modal-overlay.closing {
    animation: fadeOut 0.35s ease forwards;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 85vh;
    overflow-y: auto;
    animation: scaleIn 0.3s ease;
  }

  .modal-overlay.closing .modal-content {
    animation: scaleOut 0.35s ease forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes scaleOut {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.9);
    }
  }

  .modal-header {
    display: flex;
    justify-content: flex-end;
    padding: 12px 16px 0;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background-color: #F0F0F0;
    color: #666;
  }

  .modal-body {
    padding: 0 24px 24px;
  }

  .modal-image {
    width: 100%;
    height: 200px;
    background-color: #F5F5F5;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }

  .modal-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .modal-type {
    color: #FF6B35;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .modal-price {
    font-size: 28px;
    font-weight: bold;
    color: #FF6B35;
    margin-bottom: 16px;
  }

  .modal-condition {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .modal-condition-label {
    font-size: 14px;
    color: #666;
  }

  .modal-condition-bar {
    flex: 1;
    height: 8px;
    background: #F0F0F0;
    border-radius: 4px;
    overflow: hidden;
  }

  .modal-condition-fill {
    height: 100%;
    border-radius: 4px;
  }

  .modal-condition-text {
    font-size: 14px;
    font-weight: 600;
    min-width: 50px;
    text-align: right;
  }

  .modal-section {
    margin-bottom: 20px;
  }

  .modal-section-title {
    font-size: 14px;
    color: #888;
    margin-bottom: 8px;
  }

  .modal-description {
    font-size: 14px;
    line-height: 1.6;
    color: #444;
  }

  .modal-contact {
    font-size: 14px;
    color: #333;
  }

  .modal-date {
    font-size: 13px;
    color: #999;
  }

  .favorite-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: #F5F5F5;
    color: #666;
  }

  .favorite-btn:hover {
    background-color: #EBEBEB;
  }

  .favorite-btn.active {
    background-color: #FFF0EE;
    color: #E53935;
  }

  .heart-icon {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }

  .favorite-btn.active .heart-icon {
    animation: heartBurst 0.2s ease;
  }

  @keyframes heartBurst {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.3);
    }
    100% {
      transform: scale(1);
    }
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 999;
    animation: fadeIn 0.3s ease;
  }

  .sidebar-overlay.closing {
    animation: fadeOut 0.3s ease forwards;
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 320px;
    background: white;
    z-index: 1000;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.3s ease-out;
  }

  .sidebar.closing {
    animation: slideOutRight 0.3s ease-out forwards;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(100%);
    }
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #F0F0F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sidebar-title {
    font-size: 18px;
    font-weight: 600;
  }

  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #F8F8F8;
    animation: slideInItem 0.3s ease;
  }

  .sidebar-item.removing {
    animation: slideOutLeft 0.2s ease forwards;
  }

  @keyframes slideInItem {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutLeft {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-100%);
    }
  }

  .sidebar-item-info {
    flex: 1;
    overflow: hidden;
  }

  .sidebar-item-name {
    font-size: 14px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-item-price {
    font-size: 13px;
    color: #FF6B35;
    font-weight: 500;
    margin-top: 2px;
  }

  .sidebar-delete-btn {
    background: none;
    border: none;
    color: #CCC;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 18px;
    transition: color 0.2s ease;
  }

  .sidebar-delete-btn:hover {
    color: #F44336;
  }

  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid #F0F0F0;
  }

  .sidebar-count {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
    text-align: center;
  }

  .clear-btn {
    width: 100%;
    padding: 12px;
    border: 1px solid #E8E8E8;
    background: white;
    color: #666;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    border-color: #F44336;
    color: #F44336;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #999;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 16px;
  }

  @media (max-width: 768px) {
    .instruments-grid {
      grid-template-columns: 1fr;
    }

    .header-inner {
      flex-wrap: wrap;
    }

    .search-container {
      order: 3;
      max-width: 100%;
      flex-basis: 100%;
    }
  }

  @media (max-width: 480px) {
    .instrument-card {
      padding: 12px;
    }

    .main-container {
      padding: 12px;
    }

    .sidebar {
      width: 100%;
    }

    .instrument-name {
      font-size: 15px;
    }

    .instrument-price {
      font-size: 20px;
    }
  }
`;

const PlayIcon = () => <div className="play-icon" />;
const StopIcon = () => <div className="stop-icon" />;

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg className="heart-icon" viewBox="0 0 24 24" fill={filled ? '#E53935' : 'none'} stroke={filled ? '#E53935' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const InstrumentIconSVG = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    '吉他': (
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="40" r="14" />
        <circle cx="24" cy="40" r="6" />
        <line x1="38" y1="26" x2="54" y2="10" />
        <line x1="42" y1="22" x2="50" y2="14" />
      </svg>
    ),
    '钢琴': (
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="16" width="48" height="32" rx="2" />
        <line x1="14" y1="24" x2="14" y2="48" />
        <line x1="22" y1="24" x2="22" y2="48" />
        <line x1="30" y1="24" x2="30" y2="48" />
        <line x1="38" y1="24" x2="38" y2="48" />
        <line x1="46" y1="24" x2="46" y2="48" />
        <rect x="17" y="24" width="4" height="12" fill="#999" />
        <rect x="33" y="24" width="4" height="12" fill="#999" />
        <rect x="41" y="24" width="4" height="12" fill="#999" />
      </svg>
    ),
    '小提琴': (
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="32" cy="44" rx="14" ry="10" />
        <line x1="32" y1="34" x2="32" y2="10" />
        <circle cx="32" cy="8" r="4" />
        <line x1="24" y1="40" x2="40" y2="40" />
        <line x1="26" y1="48" x2="38" y2="48" />
      </svg>
    ),
    '架子鼓': (
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="32" cy="36" rx="18" ry="8" />
        <ellipse cx="32" cy="32" rx="18" ry="8" />
        <line x1="14" y1="36" x2="14" y2="54" />
        <line x1="50" y1="36" x2="50" y2="54" />
        <circle cx="12" cy="20" r="6" />
        <circle cx="52" cy="20" r="6" />
      </svg>
    ),
    '管乐器': (
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="48" cy="40" rx="10" ry="6" />
        <line x1="38" y1="40" x2="12" y2="20" />
        <circle cx="12" cy="18" r="4" />
        <line x1="20" y1="26" x2="24" y2="30" />
        <line x1="26" y1="30" x2="30" y2="34" />
      </svg>
    ),
  };
  return icons[type] || icons['吉他'];
};

const EmptyStateIcon = () => (
  <svg className="empty-icon" viewBox="0 0 64 64" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="24" cy="40" r="14" />
    <line x1="38" y1="26" x2="54" y2="10" />
    <circle cx="24" cy="40" r="6" />
    <line x1="44" y1="20" x2="52" y2="12" strokeWidth="3" />
  </svg>
);

interface InstrumentCardProps {
  instrument: FormattedInstrument;
  isPlaying: boolean;
  isHighlighted: boolean;
  onCardClick: (id: string) => void;
  onPlayClick: (id: string, category: InstrumentCategory) => void;
}

const InstrumentCard = React.memo(function InstrumentCard({
  instrument,
  isPlaying,
  isHighlighted,
  onCardClick,
  onPlayClick,
}: InstrumentCardProps) {
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayClick(instrument.id, instrument.category);
  };

  return (
    <div
      className={`instrument-card ${isHighlighted ? 'highlight' : ''}`}
      onClick={() => onCardClick(instrument.id)}
    >
      <h3 className="instrument-name">{instrument.name}</h3>
      <div className="instrument-type">
        <span className="type-dot" />
        <span>{instrument.type}</span>
      </div>
      <div className="instrument-price">{instrument.formattedPrice}</div>
      <div className="instrument-condition">
        <div className="condition-bar">
          <div
            className="condition-fill"
            style={{
              width: `${instrument.condition}%`,
              backgroundColor: instrument.conditionColor,
            }}
          />
        </div>
        <span className="condition-text" style={{ color: instrument.conditionColor }}>
          {instrument.condition}%新
        </span>
      </div>
      <div className="instrument-date">{instrument.formattedDate}</div>
      <button
        className={`play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={handlePlayClick}
        title={isPlaying ? '停止' : '试听'}
      >
        {isPlaying ? <StopIcon /> : <PlayIcon />}
      </button>
    </div>
  );
});

interface CategoryFilterProps {
  categories: InstrumentCategory[];
  activeCategory: InstrumentCategory;
  onCategoryChange: (category: InstrumentCategory) => void;
}

function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="category-filter">
      {categories.map(cat => (
        <div
          key={cat}
          className={`category-tag ${activeCategory === cat ? 'active' : ''}`}
          onClick={() => onCategoryChange(cat)}
        >
          {cat}
        </div>
      ))}
    </div>
  );
}

interface SearchBoxProps {
  instruments: Instrument[];
  onSelect: (id: string) => void;
}

function SearchBox({ instruments, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return searchByName(instruments, debouncedQuery).slice(0, 5);
  }, [instruments, debouncedQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setQuery('');
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleFocus = () => {
    if (debouncedQuery.trim()) {
      setIsOpen(true);
    }
  };

  return (
    <div className="search-container">
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="搜索乐器名称..."
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {isOpen && debouncedQuery.trim() && (
        <div className="search-dropdown">
          {results.length > 0 ? (
            results.map(inst => (
              <div
                key={inst.id}
                className="search-item"
                onClick={() => handleSelect(inst.id)}
              >
                <div className="search-item-name">{inst.name}</div>
                <div className="search-item-price">{formatPrice(inst.price)}</div>
              </div>
            ))
          ) : (
            <div className="search-empty">未找到相关乐器</div>
          )}
        </div>
      )}
    </div>
  );
}

interface InstrumentModalProps {
  instrument: FormattedInstrument | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
}

function InstrumentModal({ instrument, isFavorite, onClose, onToggleFavorite }: InstrumentModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    if (instrument) {
      setIsClosing(false);
    }
  }, [instrument]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && instrument) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [instrument]);

  if (!instrument) return null;

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <button className="close-btn" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-image">
            <InstrumentIconSVG type={instrument.category} />
          </div>
          <h2 className="modal-title">{instrument.name}</h2>
          <div className="modal-type">{instrument.type}</div>
          <div className="modal-price">{instrument.formattedPrice}</div>
          
          <div className="modal-condition">
            <span className="modal-condition-label">新旧程度</span>
            <div className="modal-condition-bar">
              <div
                className="modal-condition-fill"
                style={{
                  width: `${instrument.condition}%`,
                  backgroundColor: instrument.conditionColor,
                }}
              />
            </div>
            <span className="modal-condition-text" style={{ color: instrument.conditionColor }}>
              {instrument.condition}%
            </span>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">描述</div>
            <p className="modal-description">{instrument.description}</p>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">联系人</div>
            <div className="modal-contact">{instrument.contact}</div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">发布时间</div>
            <div className="modal-date">{instrument.formattedDate}</div>
          </div>

          <button
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(instrument.id)}
          >
            <HeartIcon filled={isFavorite} />
            {isFavorite ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FavoriteSidebarProps {
  instruments: Instrument[];
  favoriteIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function FavoriteSidebar({ instruments, favoriteIds, isOpen, onClose, onRemove, onClear }: FavoriteSidebarProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleRemove = (id: string) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      onRemove(id);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const favorites = useMemo(() => {
    return instruments.filter(inst => favoriteIds.includes(inst.id));
  }, [instruments, favoriteIds]);

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className={`sidebar-overlay ${isClosing ? 'closing' : ''}`}
        onClick={handleOverlayClick}
      />
      <div className={`sidebar ${isClosing ? 'closing' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">我的收藏</h3>
          <button className="close-btn" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="sidebar-list">
          {favorites.length > 0 ? (
            favorites.map(inst => (
              <div
                key={inst.id}
                className={`sidebar-item ${removingIds.has(inst.id) ? 'removing' : ''}`}
              >
                <div className="sidebar-item-info">
                  <div className="sidebar-item-name">{inst.name}</div>
                  <div className="sidebar-item-price">{formatPrice(inst.price)}</div>
                </div>
                <button
                  className="sidebar-delete-btn"
                  onClick={() => handleRemove(inst.id)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <EmptyStateIcon />
              <div className="empty-text">暂无收藏</div>
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-count">共 {favoriteIds.length} 件收藏</div>
          <button
            className="clear-btn"
            onClick={onClear}
            disabled={favoriteIds.length === 0}
          >
            清空收藏
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<InstrumentCategory>('全部');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const audioPlayersRef = useRef<Map<string, AudioPlayer>>(new Map());

  const filteredInstruments = useMemo(() => {
    return filterByCategory(instrumentsData, activeCategory);
  }, [activeCategory]);

  const formattedInstruments = useMemo(() => {
    return getFormattedInstruments(filteredInstruments);
  }, [filteredInstruments]);

  const selectedInstrument = useMemo(() => {
    if (!selectedInstrumentId) return null;
    const inst = instrumentsData.find(i => i.id === selectedInstrumentId);
    return inst ? {
      ...inst,
      formattedPrice: formatPrice(inst.price),
      conditionColor: getConditionColor(inst.condition),
      formattedDate: formatDate(inst.publishDate),
    } as FormattedInstrument : null;
  }, [selectedInstrumentId]);

  const handlePlayClick = useCallback((id: string, category: InstrumentCategory) => {
    const players = audioPlayersRef.current;
    
    if (playingId && playingId !== id) {
      const prevPlayer = players.get(playingId);
      if (prevPlayer) {
        prevPlayer.stop();
      }
    }

    let player = players.get(id);
    if (!player) {
      player = createInstrumentAudio(category);
      players.set(id, player);
    }

    if (player.isPlaying()) {
      player.stop();
      setPlayingId(null);
    } else {
      player.play();
      setPlayingId(id);
      setTimeout(() => {
        setPlayingId(currentId => currentId === id ? null : currentId);
      }, 2000);
    }
  }, [playingId]);

  const handleCardClick = useCallback((id: string) => {
    setSelectedInstrumentId(id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedInstrumentId(null);
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    setFavoriteIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(fid => fid !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const handleRemoveFavorite = useCallback((id: string) => {
    setFavoriteIds(prev => prev.filter(fid => fid !== id));
  }, []);

  const handleClearFavorites = useCallback(() => {
    setFavoriteIds([]);
  }, []);

  const handleSearchSelect = useCallback((id: string) => {
    const inst = instrumentsData.find(i => i.id === id);
    if (inst) {
      setActiveCategory(inst.category);
      setTimeout(() => {
        setHighlightedId(id);
        const card = document.getElementById(`card-${id}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
          setHighlightedId(null);
        }, 3000);
      }, 100);
    }
  }, []);

  const isFavorite = selectedInstrumentId ? favoriteIds.includes(selectedInstrumentId) : false;

  return (
    <div className="app">
      <style>{styles}</style>
      
      <header className="header">
        <div className="header-inner">
          <div className="logo">🎸 乐易</div>
          <SearchBox instruments={instrumentsData} onSelect={handleSearchSelect} />
          <button
            className="favorites-btn"
            onClick={() => setIsSidebarOpen(true)}
            title="收藏夹"
          >
            <BookmarkIcon />
            {favoriteIds.length > 0 && (
              <span className="favorites-badge">{favoriteIds.length}</span>
            )}
          </button>
        </div>
      </header>

      <main className="main-container">
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <div className="category-count">共 {filteredInstruments.length} 件</div>

        {formattedInstruments.length > 0 ? (
          <div className="instruments-grid">
            {formattedInstruments.map(inst => (
              <div key={inst.id} id={`card-${inst.id}`}>
                <InstrumentCard
                  instrument={inst}
                  isPlaying={playingId === inst.id}
                  isHighlighted={highlightedId === inst.id}
                  onCardClick={handleCardClick}
                  onPlayClick={handlePlayClick}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <EmptyStateIcon />
            <div className="empty-text">暂无该分类的乐器</div>
          </div>
        )}
      </main>

      <InstrumentModal
        instrument={selectedInstrument}
        isFavorite={isFavorite}
        onClose={handleCloseModal}
        onToggleFavorite={handleToggleFavorite}
      />

      <FavoriteSidebar
        instruments={instrumentsData}
        favoriteIds={favoriteIds}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onRemove={handleRemoveFavorite}
        onClear={handleClearFavorites}
      />
    </div>
  );
}
