import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Plant } from '../types';
import { placeBid } from '../api';
import { useApp } from '../context/AppContext';
import FavoriteButton from './FavoriteButton';
import RippleButton from './RippleButton';
import './components.css';

interface AuctionBoardProps {
  activity: Activity;
  onPlantUpdated: (plant: Plant) => void;
}

interface BidState {
  [plantId: string]: number;
}

interface HighlightState {
  [plantId: string]: boolean;
}

const AuctionBoard: React.FC<AuctionBoardProps> = ({ activity, onPlantUpdated }) => {
  const [bidAmounts, setBidAmounts] = useState<BidState>({});
  const [highlightedPlants, setHighlightedPlants] = useState<HighlightState>({});
  const [biddingPlantId, setBiddingPlantId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<Set<string>>(new Set());
  const { showToast } = useApp();
  const isEnded = activity.status === 'ended';

  useEffect(() => {
    const initialBids: BidState = {};
    activity.plants.forEach(plant => {
      initialBids[plant.id] = plant.currentPrice + 1;
    });
    setBidAmounts(initialBids);
  }, [activity.plants]);

  useEffect(() => {
    if (isEnded) {
      activity.plants.forEach((plant, index) => {
        setTimeout(() => {
          setShowResults(prev => new Set([...prev, plant.id]));
        }, index * 150);
      });
    }
  }, [isEnded, activity.plants]);

  const handleBidChange = (plantId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBidAmounts(prev => ({ ...prev, [plantId]: numValue }));
  };

  const handlePlaceBid = async (plant: Plant) => {
    const bidAmount = bidAmounts[plant.id] || 0;
    if (bidAmount < plant.currentPrice + 1) {
      showToast(`出价必须高于当前价格${plant.currentPrice}元（至少高1元）`, 'error');
      return;
    }
    if (isEnded) {
      showToast('活动已结束，无法出价', 'error');
      return;
    }

    setBiddingPlantId(plant.id);
    const res = await placeBid({
      plantId: plant.id,
      activityId: activity.id,
      amount: bidAmount,
    });
    setBiddingPlantId(null);

    if (res.success && res.data) {
      setHighlightedPlants(prev => ({ ...prev, [plant.id]: true }));
      setTimeout(() => {
        setHighlightedPlants(prev => ({ ...prev, [plant.id]: false }));
      }, 400);

      setBidAmounts(prev => ({
        ...prev,
        [plant.id]: res.data!.currentPrice + 1,
      }));

      showToast('出价成功！', 'success');
      onPlantUpdated(res.data);
    } else {
      showToast(res.message || '出价失败', 'error');
    }
  };

  const sortedPlants = useMemo(() => {
    return [...activity.plants].sort((a, b) => {
      if (a.status === 'sold' && b.status !== 'sold') return 1;
      if (a.status !== 'sold' && b.status === 'sold') return -1;
      return b.currentPrice - a.currentPrice;
    });
  }, [activity.plants]);

  if (activity.plants.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>暂无上架的植物</p>
        {!isEnded && (
          <p style={styles.emptyHint}>点击右上角"上架植物"按钮开始分享你的植物吧！</p>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        🌿 拍卖清单
        <span style={styles.count}>{activity.plants.length} 株植物</span>
      </h2>

      <div style={styles.list}>
        {sortedPlants.map((plant) => (
          <div
            key={plant.id}
            style={{
              ...styles.item,
              backgroundColor: highlightedPlants[plant.id]
                ? 'var(--highlight-color)'
                : 'white',
              transition: 'background-color 0.2s ease',
              animation: highlightedPlants[plant.id]
                ? 'highlightFlash 0.4s ease'
                : 'none',
            }}
          >
            <div style={styles.itemContent} className="item-content-responsive">
              <img src={plant.photoUrl} alt={plant.name} style={styles.plantImage} />

              <div style={styles.plantInfo}>
                <div style={styles.plantHeader}>
                  <div style={styles.plantNameRow}>
                    <h3 style={styles.plantName}>{plant.name}</h3>
                    <FavoriteButton plant={plant} size="small" />
                  </div>
                  <span style={styles.plantVariety}>{plant.variety}</span>
                </div>
                <p style={styles.plantDescription}>{plant.description}</p>

                <div style={styles.priceRow}>
                  <div style={styles.priceItem}>
                    <span style={styles.priceLabel}>起拍价</span>
                    <span style={styles.startPrice}>¥{plant.startPrice}</span>
                  </div>
                  <div style={styles.priceItem}>
                    <span style={styles.priceLabel}>当前价</span>
                    <span style={styles.currentPrice}>¥{plant.currentPrice}</span>
                  </div>
                  {plant.highestBidder && (
                    <div style={styles.priceItem}>
                      <span style={styles.priceLabel}>最高出价</span>
                      <span style={styles.bidder}>{plant.highestBidder}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isEnded ? (
              <div style={styles.bidSection} className="bid-section-responsive">
                <div style={styles.bidInputWrapper}>
                  <span style={styles.currencySymbol}>¥</span>
                  <input
                    type="number"
                    value={bidAmounts[plant.id] || ''}
                    onChange={e => handleBidChange(plant.id, e.target.value)}
                    min={plant.currentPrice + 1}
                    style={styles.bidInput}
                    placeholder={String(plant.currentPrice + 1)}
                    disabled={plant.status !== 'active'}
                  />
                </div>
                <RippleButton
                  onClick={() => handlePlaceBid(plant)}
                  disabled={biddingPlantId === plant.id || plant.status !== 'active'}
                  style={styles.bidButton}
                >
                  {biddingPlantId === plant.id ? '出价中...' : '出价'}
                </RippleButton>
              </div>
            ) : (
              showResults.has(plant.id) && (
                <div
                  style={{
                    ...styles.resultSection,
                    animation: 'expandDown 0.6s ease forwards',
                  }}
                >
                  {plant.status === 'sold' ? (
                    <div style={styles.soldInfo}>
                      <span style={styles.checkIcon}>✓</span>
                      <div>
                        <p style={styles.soldLabel}>成交</p>
                        <p style={styles.soldPrice}>¥{plant.currentPrice}</p>
                        <p style={styles.soldBidder}>得标人：{plant.highestBidder}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.unsoldInfo}>
                      <p style={styles.unsoldText}>流拍</p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  count: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--card-bg-light)',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius)',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'all 0.2s ease',
  },
  itemContent: {
    display: 'flex',
    gap: '20px',
  },
  plantImage: {
    width: '120px',
    height: '120px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  plantInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: 0,
  },
  plantHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  plantNameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  plantName: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  plantVariety: {
    fontSize: '13px',
    color: 'var(--primary-color)',
    fontWeight: 500,
  },
  plantDescription: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },
  priceRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    marginTop: 'auto',
  },
  priceItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  priceLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  startPrice: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  currentPrice: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--primary-color)',
  },
  bidder: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  bidSection: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  bidInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '0 12px',
    flex: 1,
    minWidth: '150px',
    transition: 'border-color 0.2s ease',
  },
  currencySymbol: {
    fontSize: '16px',
    color: 'var(--text-muted)',
    marginRight: '4px',
  },
  bidInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px 0',
    fontSize: '16px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    minWidth: 0,
  },
  bidButton: {
    minWidth: '100px',
  },
  resultSection: {
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
    overflow: 'hidden',
  },
  soldInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: '#E8F5E9',
    borderRadius: '8px',
  },
  checkIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--success-color)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  soldLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '0 0 2px 0',
  },
  soldPrice: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--primary-color)',
    margin: '0 0 2px 0',
  },
  soldBidder: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  unsoldInfo: {
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  unsoldText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  emptyText: {
    fontSize: '16px',
    color: 'var(--text-muted)',
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
  },
};

export default AuctionBoard;
