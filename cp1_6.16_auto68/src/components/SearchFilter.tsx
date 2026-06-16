import React from 'react';
import { PRODUCT_TYPE_LABELS, type ProductType } from '../types';

interface SearchFilterProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterOptions: { value: string; label: string }[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterLabel: string;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterOptions,
  filterValue,
  onFilterChange,
  filterLabel,
}) => {
  return (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-tags">
        <span className="filter-label">{filterLabel}:</span>
        <button
          className={`filter-tag ${filterValue === '' ? 'active' : ''}`}
          onClick={() => onFilterChange('')}
        >
          全部
        </button>
        {filterOptions.map((option) => (
          <button
            key={option.value}
            className={`filter-tag ${filterValue === option.value ? 'active' : ''}`}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const materialColorOptions = [
  { value: '#E74C3C', label: '红色' },
  { value: '#3498DB', label: '蓝色' },
  { value: '#2ECC71', label: '绿色' },
  { value: '#F39C12', label: '橙色' },
  { value: '#9B59B6', label: '紫色' },
  { value: '#BDC3C7', label: '银色' },
  { value: '#ECF0F1', label: '白色' },
];

export const patternTypeOptions: { value: ProductType; label: string }[] = [
  { value: 'bracelet', label: PRODUCT_TYPE_LABELS.bracelet },
  { value: 'necklace', label: PRODUCT_TYPE_LABELS.necklace },
  { value: 'earring', label: PRODUCT_TYPE_LABELS.earring },
];
