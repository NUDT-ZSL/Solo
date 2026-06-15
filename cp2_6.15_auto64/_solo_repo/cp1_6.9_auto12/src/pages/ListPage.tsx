import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Capsule3D from '../Capsule3D';
import HourglassIcon from '../components/HourglassIcon';
import { formatCountdown } from '../utils';
import { CapsuleListItem, CapsuleListResponse, FilterStatus } from '../types';
import { initAudioContext } from '../AudioManager';

const CountdownTimer: React.FC<{ unlockTime: number; onExpire?: () => void }> = ({ unlockTime, onExpire }) => {
  const [{ text, isExpired }, setState] = useState(() => formatCountdown(unlockTime));
  const expiredCalled = useRef(false);

  useEffect(() => {
    const tick = () => {
      const result = formatCountdown(unlockTime);
      setState(result);
      if (result.isExpired && !expiredCalled.current) {
        expiredCalled.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlockTime, onExpire]);

  return (
    <span className={`countdown-time ${isExpired ? 'unlocked-available' : ''}`}>
      {text}
    </span>
  );
};

const CapsuleCard: React.FC<{ capsule: CapsuleListItem }> = ({ capsule }) => {
  const navigate = useNavigate();
  const [displayUnlocked, setDisplayUnlocked] = useState(capsule.isUnlocked);

  const handleClick = () => {
    initAudioContext();
    navigate(`/capsule/${capsule.id}`);
  };

  return (
    <div
      className={`capsule-card ${displayUnlocked ? 'unlocked' : ''}`}
      onClick={handleClick}
    >
      <div className="capsule-card-header">
        <div className="capsule-card-title">{capsule.title}</div>
        {!displayUnlocked && <HourglassIcon className="hourglass-icon" />}
      </div>
      
      <div className="capsule-3d-wrapper">
        <Capsule3D
          isUnlocked={displayUnlocked}
          unlockTime={capsule.unlockTime}
          onClick={handleClick}
          size="small"
        />
      </div>
      
      <div className="countdown-display">
        <div className="countdown-text">
          {displayUnlocked ? '🎉 已到达解锁时间' : '距离解锁还有'}
        </div>
        <CountdownTimer
          unlockTime={capsule.unlockTime}
          onExpire={() => setDisplayUnlocked(true)}
        />
      </div>

      <button
        className={`btn-unlock ${displayUnlocked ? 'available' : ''}`}
        disabled={!displayUnlocked}
        onClick={(e) => {
          e.stopPropagation();
          if (displayUnlocked) {
            initAudioContext();
            navigate(`/capsule/${capsule.id}`);
          }
        }}
      >
        {displayUnlocked ? '点击开启胶囊' : '🔒 等待解锁'}
      </button>
    </div>
  );
};

const ListPage: React.FC = () => {
  const [capsules, setCapsules] = useState<CapsuleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const searchRef = useRef('');
  const filterRef = useRef<FilterStatus>('all');

  const fetchCapsules = useCallback(async (page: number, searchQuery: string, filter: FilterStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      });
      if (searchQuery) params.set('search', searchQuery);
      if (filter !== 'all') params.set('status', filter);

      const res = await fetch(`/api/capsules?${params.toString()}`);
      if (!res.ok) throw new Error('获取胶囊列表失败');
      const data: CapsuleListResponse = await res.json();
      setCapsules(data.capsules);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setCurrentPage(data.currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCapsules(1, '', 'all');
  }, [fetchCapsules]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRef.current = search;
      filterRef.current = filterStatus;
      fetchCapsules(1, search, filterStatus);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filterStatus, fetchCapsules]);

  useEffect(() => {
    const id = setInterval(() => {
      setCapsules(prev => prev.map(c => ({
        ...c,
        isUnlocked: Date.now() >= c.unlockTime ? true : c.isUnlocked,
      })));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchCapsules(page, searchRef.current, filterRef.current);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">我的胶囊</h1>
        <p className="page-subtitle">
          封存珍贵记忆，静候时光开启 · 共 {total} 个胶囊
        </p>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 搜索胶囊标题..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
        >
          <option value="all">全部状态</option>
          <option value="locked">未解锁</option>
          <option value="unlocked">已解锁</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <div>加载中...</div>
        </div>
      ) : capsules.length === 0 ? (
        <div className="empty-state">
          <HourglassIcon className="empty-icon" />
          <div className="empty-title">还没有胶囊</div>
          <div className="empty-desc">
            {search || filterStatus !== 'all'
              ? '没有找到匹配的胶囊，试试其他搜索条件吧'
              : '点击右上角「创建胶囊」，封存你的第一段珍贵记忆'}
          </div>
        </div>
      ) : (
        <>
          <div className="capsule-grid">
            {capsules.map(capsule => (
              <CapsuleCard key={capsule.id} capsule={capsule} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← 上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ListPage;
