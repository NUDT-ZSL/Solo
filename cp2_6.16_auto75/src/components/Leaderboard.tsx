import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Contributor, FilterDimension, SortBy } from '../types';

interface LeaderboardProps {
  owner: string;
  repo: string;
  selectedUser: string | null;
  onSelectUser: (username: string) => void;
}

interface ApiResponse {
  success: boolean;
  data: {
    name: string;
    owner: string;
    totalCommits: number;
    maxCommits: number;
    contributors: Contributor[];
    total: number;
  };
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  owner,
  repo,
  selectedUser,
  onSelectUser
}) => {
  const [filter, setFilter] = useState<FilterDimension>('all');
  const [sortBy, setSortBy] = useState<SortBy>('commits');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [maxCommits, setMaxCommits] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());

  const listRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const ITEM_HEIGHT = 72;
  const BUFFER = 5;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        sortBy
      });
      const response = await fetch(
        `/api/contributors/${owner}/${repo}?${params.toString()}`
      );
      const result: ApiResponse = await response.json();

      if (result.success) {
        setContributors(result.data.contributors);
        setMaxCommits(result.data.maxCommits);
        setTotal(result.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch contributors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, filter, sortBy]);

  useEffect(() => {
    if (owner && repo) {
      fetchData();
    }
  }, [fetchData]);

  useEffect(() => {
    const newHeights = new Map(itemHeights);
    itemRefs.current.forEach((el, key) => {
      if (el) {
        newHeights.set(key, el.offsetHeight || ITEM_HEIGHT);
      }
    });
    if (newHeights.size !== itemHeights.size) {
      setItemHeights(newHeights);
    }
  }, [contributors]);

  const getItemHeight = (index: number) => {
    const c = contributors[index];
    if (c && itemHeights.has(c.username)) {
      return itemHeights.get(c.username)!;
    }
    return ITEM_HEIGHT;
  };

  const getOffsetForIndex = (targetIndex: number) => {
    let offset = 0;
    for (let i = 0; i < targetIndex && i < contributors.length; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  };

  const totalHeight = contributors.reduce((sum, _, i) => sum + getItemHeight(i), 0);
  const containerHeight = listContainerRef.current?.clientHeight || 600;

  let startIndex = 0;
  let accumulated = 0;
  for (let i = 0; i < contributors.length; i++) {
    const h = getItemHeight(i);
    if (accumulated + h > scrollTop) {
      startIndex = Math.max(0, i - BUFFER);
      break;
    }
    accumulated += h;
  }

  let endIndex = startIndex;
  accumulated = getOffsetForIndex(startIndex);
  while (endIndex < contributors.length && accumulated < scrollTop + containerHeight) {
    accumulated += getItemHeight(endIndex);
    endIndex++;
  }
  endIndex = Math.min(contributors.length, endIndex + BUFFER);

  const visibleItems = contributors.slice(startIndex, endIndex);
  const offsetY = getOffsetForIndex(startIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  };

  const handleFilterChange = (newFilter: FilterDimension) => {
    setFilter(newFilter);
    setScrollTop(0);
  };

  const handleSortChange = (newSort: SortBy) => {
    setSortBy(newSort);
    setScrollTop(0);
  };

  const setItemRef = (username: string) => (el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(username, el);
    } else {
      itemRefs.current.delete(username);
    }
  };

  const filterButtons: { key: FilterDimension; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'code', label: '代码' },
    { key: 'issue', label: 'Issue' },
    { key: 'pr', label: 'PR' }
  ];

  const sortOptions: { key: SortBy; label: string }[] = [
    { key: 'commits', label: '按提交数' },
    { key: 'lines', label: '按代码变更' },
    { key: 'prMergeRate', label: '按PR合并率' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.filterGroup}>
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              disabled={isLoading}
              style={{
                ...styles.filterButton,
                backgroundColor: filter === key ? '#6366f1' : '#ffffff',
                color: filter === key ? '#ffffff' : '#64748b',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as SortBy)}
          disabled={isLoading}
          style={{
            ...styles.sortSelect,
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {sortOptions.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.countInfo}>
        {isLoading ? '加载中...' : `共 ${total} 位贡献者`}
      </div>

      <div
        ref={listContainerRef}
        onScroll={handleScroll}
        style={styles.listContainer}
      >
        {isLoading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <span>正在加载数据...</span>
          </div>
        ) : (
          <div ref={listRef} style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map((contributor, idx) => {
                const absoluteIndex = startIndex + idx;
                return (
                  <div
                    key={contributor.username}
                    ref={setItemRef(contributor.username)}
                  >
                    <ContributorCard
                      contributor={contributor}
                      isSelected={selectedUser === contributor.username}
                      onClick={() => onSelectUser(contributor.username)}
                      maxCommits={maxCommits}
                      sortBy={sortBy}
                      index={absoluteIndex}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CardProps {
  contributor: Contributor;
  isSelected: boolean;
  onClick: () => void;
  maxCommits: number;
  sortBy: SortBy;
  index: number;
}

const ContributorCard: React.FC<CardProps> = ({
  contributor,
  isSelected,
  onClick,
  maxCommits,
  sortBy
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getProgressValue = () => {
    if (sortBy === 'commits') {
      return maxCommits > 0 ? (contributor.commits / maxCommits) * 100 : 0;
    } else if (sortBy === 'lines') {
      const maxLines = maxCommits * 100;
      return maxLines > 0
        ? ((contributor.linesAdded + contributor.linesDeleted) / maxLines) * 100
        : 0;
    }
    return contributor.prMergeRate * 100;
  };

  const getSubText = () => {
    if (sortBy === 'commits') {
      return `${contributor.commits} 次提交`;
    } else if (sortBy === 'lines') {
      const total = contributor.linesAdded + contributor.linesDeleted;
      return `${total.toLocaleString()} 行变更`;
    }
    return `${(contributor.prMergeRate * 100).toFixed(1)}% 合并率`;
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.card,
        backgroundColor: isHovered || isSelected ? '#f1f5f9' : '#ffffff',
        borderLeftColor: isSelected ? '#6366f1' : 'transparent'
      }}
    >
      <img
        src={contributor.avatar}
        alt={contributor.username}
        style={styles.avatar}
      />
      <div style={styles.info}>
        <span style={styles.username}>{contributor.username}</span>
        <div style={styles.subInfo}>
          <span style={styles.commitsText}>{getSubText()}</span>
          <div style={styles.progressBarBg}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${Math.min(100, getProgressValue())}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px'
  } as React.CSSProperties,
  filterGroup: {
    display: 'flex',
    gap: '8px'
  } as React.CSSProperties,
  filterButton: {
    width: '100px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  } as React.CSSProperties,
  sortSelect: {
    width: '160px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    color: '#64748b',
    padding: '0 12px',
    cursor: 'pointer',
    outline: 'none'
  } as React.CSSProperties,
  countInfo: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '12px'
  } as React.CSSProperties,
  listContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    borderRadius: '8px'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '12px',
    color: '#64748b'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  } as React.CSSProperties,
  card: {
    height: '64px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    marginBottom: '8px',
    cursor: 'pointer',
    borderLeft: '4px solid transparent',
    transition: 'background-color 0.15s, border-left-color 0.15s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  } as React.CSSProperties,
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: '2px solid #e2e8f0',
    marginRight: '14px',
    flexShrink: 0
  } as React.CSSProperties,
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '6px',
    minWidth: 0
  },
  username: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b'
  } as React.CSSProperties,
  subInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  } as React.CSSProperties,
  commitsText: {
    fontSize: '14px',
    color: '#64748b',
    flexShrink: 0
  } as React.CSSProperties,
  progressBarBg: {
    flex: 1,
    width: '120px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    minWidth: 0
  } as React.CSSProperties,
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  } as React.CSSProperties
};

export default Leaderboard;
