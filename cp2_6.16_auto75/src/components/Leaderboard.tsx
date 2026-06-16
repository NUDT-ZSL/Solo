import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contributor, FilterDimension, SortBy } from '../types';

interface LeaderboardProps {
  contributors: Contributor[];
  selectedUser: string | null;
  onSelectUser: (username: string) => void;
  maxCommits: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  contributors,
  selectedUser,
  onSelectUser,
  maxCommits
}) => {
  const [filter, setFilter] = useState<FilterDimension>('all');
  const [sortBy, setSortBy] = useState<SortBy>('commits');
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemHeight = 72;
  const visibleCount = 12;

  const filteredContributors = useMemo(() => {
    let list = [...contributors];

    if (filter === 'code') {
      list = list.filter(c => c.commits > 10);
    } else if (filter === 'issue') {
      list = list.filter(c => c.issues > 0);
    } else if (filter === 'pr') {
      list = list.filter(c => c.pullRequests > 0);
    }

    if (sortBy === 'commits') {
      list.sort((a, b) => b.commits - a.commits);
    } else if (sortBy === 'lines') {
      list.sort((a, b) => (b.linesAdded + b.linesDeleted) - (a.linesAdded + a.linesDeleted));
    } else if (sortBy === 'prMergeRate') {
      list.sort((a, b) => b.prMergeRate - a.prMergeRate);
    }

    return list;
  }, [contributors, filter, sortBy]);

  const totalHeight = filteredContributors.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(
    filteredContributors.length,
    startIndex + visibleCount + 4
  );
  const visibleItems = filteredContributors.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  };

  const useVirtualScroll = filteredContributors.length > 100;

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
              onClick={() => setFilter(key)}
              style={{
                ...styles.filterButton,
                backgroundColor: filter === key ? '#6366f1' : '#ffffff',
                color: filter === key ? '#ffffff' : '#64748b'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={styles.sortSelect}
        >
          {sortOptions.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.countInfo}>
        共 {filteredContributors.length} 位贡献者
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        style={styles.listContainer}
      >
        {useVirtualScroll ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map((contributor) => (
                <ContributorCard
                  key={contributor.username}
                  contributor={contributor}
                  isSelected={selectedUser === contributor.username}
                  onClick={() => onSelectUser(contributor.username)}
                  maxCommits={maxCommits}
                  sortBy={sortBy}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {filteredContributors.map((contributor) => (
              <ContributorCard
                key={contributor.username}
                contributor={contributor}
                isSelected={selectedUser === contributor.username}
                onClick={() => onSelectUser(contributor.username)}
                maxCommits={maxCommits}
                sortBy={sortBy}
              />
            ))}
          </>
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
      return (contributor.commits / maxCommits) * 100;
    } else if (sortBy === 'lines') {
      const maxLines = maxCommits * 100;
      return ((contributor.linesAdded + contributor.linesDeleted) / maxLines) * 100;
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
    flexDirection: 'column',
    height: '100%'
  } as React.CSSProperties,
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
