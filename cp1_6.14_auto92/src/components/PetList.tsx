import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import PetCard from './PetCard';
import { petApi, breedApi } from '../http';
import type { Pet } from '../types';

export default function PetList() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const PAGE_SIZE = 12;

  const fetchBreeds = useCallback(async () => {
    try {
      const data = await breedApi.getList();
      setBreeds(data);
    } catch (e) {
      console.error('Failed to fetch breeds:', e);
    }
  }, []);

  const fetchPets = useCallback(
    async (pageNum: number, reset = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const response = await petApi.getList({
          page: pageNum,
          limit: PAGE_SIZE,
          search: search || undefined,
          breed: selectedBreed || undefined,
        });
        setPets((prev) => (reset ? response.data : [...prev, ...response.data]));
        setHasMore(response.hasMore);
        setPage(pageNum);
      } catch (e) {
        console.error('Failed to fetch pets:', e);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [loading, search, selectedBreed]
  );

  useEffect(() => {
    fetchBreeds();
  }, [fetchBreeds]);

  useEffect(() => {
    setPets([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    fetchPets(1, true);
  }, [search, selectedBreed]);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPets(page + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page, fetchPets]
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">待领养宠物</h1>
        <div className="list-filters">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="搜索宠物名或品种..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            value={selectedBreed}
            onChange={(e) => setSelectedBreed(e.target.value)}
            className="breed-select"
          >
            <option value="">全部品种</option>
            {breeds.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {initialLoading ? (
        <div className="loading-state">
          <Loader2 size={32} className="spinner" />
          <p>加载中...</p>
        </div>
      ) : pets.length === 0 ? (
        <div className="empty-state">
          <p>暂无符合条件的宠物</p>
        </div>
      ) : (
        <>
          <div className="pet-grid">
            {pets.map((pet, index) => (
              <div key={pet.id} ref={index === pets.length - 1 ? lastItemRef : observerRef}>
                <PetCard pet={pet} index={index} />
              </div>
            ))}
          </div>
          {loading && (
            <div className="loading-more">
              <Loader2 size={20} className="spinner" />
              <span>加载更多...</span>
            </div>
          )}
          {!hasMore && pets.length > 0 && (
            <div className="no-more">已加载全部宠物</div>
          )}
        </>
      )}
    </div>
  );
}
