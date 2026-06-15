import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EchoCard, fetchCards, createCard } from "./EchoCardEngine";
import CardRenderer from "./CardRenderer";
import ShareModal from "./ShareModal";

const PAGE_SIZE = 12;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useInView(ref: React.RefObject<HTMLElement | null>, rootMargin = "200px") {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isIntersecting;
}

const LazyCard: React.FC<{
  card: EchoCard;
  onShare: (card: EchoCard) => void;
  onResonate: (cardId: string, newCount: number) => void;
}> = ({ card, onShare, onResonate }) => {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);

  return (
    <div ref={ref} className="waterfall__item">
      {visible ? (
        <CardRenderer card={card} onShare={onShare} onResonate={onResonate} />
      ) : (
        <div className="echo-card echo-card--placeholder">
          <div className="echo-card__shimmer" />
        </div>
      )}
    </div>
  );
};

const CollectionView: React.FC = () => {
  const [cards, setCards] = useState<EchoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createUrl, setCreateUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [shareCard, setShareCard] = useState<EchoCard | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCards(
        sentimentFilter !== "all" ? sentimentFilter : undefined,
        debouncedSearch || undefined
      );
      setCards(data);
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      setLoading(false);
    }
  }, [sentimentFilter, debouncedSearch]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleCreate = useCallback(async () => {
    const url = createUrl.trim();
    if (!url) return;
    setCreating(true);
    try {
      const newCard = await createCard(url);
      setCards((prev) => [newCard, ...prev]);
      setCreateUrl("");
    } catch (err) {
      console.error("Failed to create card:", err);
    } finally {
      setCreating(false);
    }
  }, [createUrl]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleCreate();
    },
    [handleCreate]
  );

  const handleResonate = useCallback((cardId: string, newCount: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, resonances: newCount } : c))
    );
  }, []);

  const visibleCards = useMemo(() => cards.slice(0, PAGE_SIZE * 3), [cards]);

  return (
    <div className="collection">
      <div className="collection__input-area">
        <div className="collection__input-wrapper">
          <input
            type="url"
            className="collection__url-input"
            placeholder="粘贴一个网址，生成你的回声卡片..."
            value={createUrl}
            onChange={(e) => setCreateUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={creating}
          />
          <button
            className={`collection__create-btn ${creating ? "collection__create-btn--loading" : ""}`}
            onClick={handleCreate}
            disabled={creating || !createUrl.trim()}
          >
            {creating ? (
              <span className="spinner">
                <span className="spinner__dot" />
                <span className="spinner__dot" />
                <span className="spinner__dot" />
              </span>
            ) : (
              "生成回声"
            )}
          </button>
        </div>
      </div>

      <div className="waterfall">
        {loading && cards.length === 0 ? (
          <div className="collection__empty">
            <div className="collection__empty-icon">꩜</div>
            <p>正在收集回声...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="collection__empty">
            <div className="collection__empty-icon">◯</div>
            <p>还没有回声卡片，粘贴一个网址开始吧</p>
          </div>
        ) : (
          visibleCards.map((card) => (
            <LazyCard
              key={card.id}
              card={card}
              onShare={setShareCard}
              onResonate={handleResonate}
            />
          ))
        )}
      </div>

      {shareCard && (
        <ShareModal card={shareCard} onClose={() => setShareCard(null)} />
      )}
    </div>
  );
};

export default CollectionView;
