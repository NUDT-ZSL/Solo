import { db, Artwork, Transaction } from './Database';

export type AuctionSettleCallback = (
  artwork: Artwork,
  transaction: Transaction | null
) => void;

export type BidCallback = (artwork: Artwork) => void;

class AuctionEngine {
  private intervalId: number | null = null;
  private checkIntervalMs: number = 10000;
  private settleCallbacks: Set<AuctionSettleCallback> = new Set();
  private bidCallbacks: Set<BidCallback> = new Set();
  private isRunning: boolean = false;
  private static instance: AuctionEngine | null = null;

  constructor() {
    this.start();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleBeforeUnload = () => {
    this.dispose();
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = window.setInterval(() => {
      this.checkAndSettleExpiredAuctions();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  dispose(): void {
    this.stop();
    this.settleCallbacks.clear();
    this.bidCallbacks.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  setCheckInterval(ms: number): void {
    this.checkIntervalMs = ms;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  private checkAndSettleExpiredAuctions(): void {
    const now = Date.now();
    const activeAuctions = db.getActiveAuctions();

    for (const artwork of activeAuctions) {
      if (artwork.auctionEndTime && artwork.auctionEndTime <= now) {
        this.settleAuction(artwork.id);
      }
    }
  }

  settleAuction(artworkId: string): { artwork: Artwork; transaction: Transaction | null } | null {
    const artwork = db.getArtwork(artworkId);
    if (!artwork || !artwork.auctionActive) return null;

    artwork.auctionActive = false;
    db.updateArtwork(artwork);

    let transaction: Transaction | null = null;

    if (artwork.bidderId && artwork.currentBid > artwork.startingPrice) {
      const gallery = db.getGallery(artwork.galleryId);
      const sellerId = gallery?.curatorId || 'unknown';

      transaction = db.createTransaction({
        artworkId: artwork.id,
        artworkTitle: artwork.title,
        galleryId: artwork.galleryId,
        galleryName: gallery?.name || 'Unknown Gallery',
        buyerId: artwork.bidderId,
        sellerId: sellerId,
        price: artwork.currentBid
      });

      db.addNotification(artwork.bidderId, {
        type: 'won',
        message: `恭喜！您成功竞拍了「${artwork.title}」`,
        read: false
      });

      db.addNotification(sellerId, {
        type: 'system',
        message: `您的作品「${artwork.title}」已以 ¥${artwork.currentBid} 成交`,
        read: false
      });
    } else {
      const gallery = db.getGallery(artwork.galleryId);
      const sellerId = gallery?.curatorId || 'unknown';
      db.addNotification(sellerId, {
        type: 'system',
        message: `您的作品「${artwork.title}」竞拍结束，暂无买家`,
        read: false
      });
    }

    this.settleCallbacks.forEach(callback => {
      try {
        callback(artwork, transaction);
      } catch (e) {
        console.error('Error in auction settle callback:', e);
      }
    });

    return { artwork, transaction };
  }

  placeBid(artworkId: string, bidderId: string, bidAmount: number): { success: boolean; artwork?: Artwork; message: string } {
    const artwork = db.getArtwork(artworkId);
    if (!artwork) {
      return { success: false, message: '作品不存在' };
    }

    if (!artwork.auctionActive) {
      return { success: false, message: '竞拍已结束' };
    }

    if (artwork.auctionEndTime && Date.now() >= artwork.auctionEndTime) {
      return { success: false, message: '竞拍已到期' };
    }

    if (bidAmount <= artwork.currentBid) {
      return { success: false, message: `出价必须高于当前最高价 ¥${artwork.currentBid}` };
    }

    if (bidAmount < artwork.startingPrice) {
      return { success: false, message: `出价不能低于起拍价 ¥${artwork.startingPrice}` };
    }

    const previousBidderId = artwork.bidderId;

    artwork.bidderId = bidderId;
    artwork.currentBid = bidAmount;
    db.updateArtwork(artwork);

    if (previousBidderId && previousBidderId !== bidderId) {
      db.addNotification(previousBidderId, {
        type: 'outbid',
        message: `您在「${artwork.title}」中的出价被超过了`,
        read: false
      });
    }

    this.bidCallbacks.forEach(callback => {
      try {
        callback(artwork);
      } catch (e) {
        console.error('Error in bid callback:', e);
      }
    });

    return { success: true, artwork, message: '出价成功' };
  }

  onSettle(callback: AuctionSettleCallback): () => void {
    this.settleCallbacks.add(callback);
    return () => {
      this.settleCallbacks.delete(callback);
    };
  }

  onBid(callback: BidCallback): () => void {
    this.bidCallbacks.add(callback);
    return () => {
      this.bidCallbacks.delete(callback);
    };
  }

  getTimeRemaining(artworkId: string): { days: number; hours: number; minutes: number; seconds: number; ended: boolean } {
    const artwork = db.getArtwork(artworkId);
    if (!artwork || !artwork.auctionEndTime || !artwork.auctionActive) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
    }

    const now = Date.now();
    const diff = Math.max(0, artwork.auctionEndTime - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      ended: diff <= 0
    };
  }

  triggerCheck(): void {
    this.checkAndSettleExpiredAuctions();
  }
}

export const auctionEngine = new AuctionEngine();
export default auctionEngine;
