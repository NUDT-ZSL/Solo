export interface User {
  id: string;
  name: string;
  avatar: string;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'outbid' | 'won' | 'system';
  message: string;
  read: boolean;
  timestamp: number;
}

export interface Artwork {
  id: string;
  title: string;
  color: string;
  galleryId: string;
  positionIndex: number | null;
  startingPrice: number;
  currentBid: number;
  bidderId: string | null;
  auctionEndTime: number | null;
  auctionActive: boolean;
}

export interface Gallery {
  id: string;
  name: string;
  curatorId: string;
  theme: string;
  layout: string;
  lighting: string;
  createdAt: number;
  artworkIds: string[];
}

export interface Transaction {
  id: string;
  artworkId: string;
  artworkTitle: string;
  galleryId: string;
  galleryName: string;
  buyerId: string;
  sellerId: string;
  price: number;
  timestamp: number;
}

class Database {
  private users: Map<string, User> = new Map();
  private artworks: Map<string, Artwork> = new Map();
  private galleries: Map<string, Gallery> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const users: User[] = [
      {
        id: 'user-1',
        name: '林静怡',
        avatar: '#D4C9C0',
        notifications: []
      },
      {
        id: 'user-2',
        name: '陈逸凡',
        avatar: '#A89F91',
        notifications: []
      },
      {
        id: 'user-3',
        name: '苏婉清',
        avatar: '#8B7D6B',
        notifications: []
      },
      {
        id: 'user-4',
        name: '周墨白',
        avatar: '#B8A9A3',
        notifications: []
      }
    ];

    users.forEach(user => this.users.set(user.id, user));

    const galleries: Gallery[] = [
      {
        id: 'gallery-1',
        name: '莫兰迪的梦境',
        curatorId: 'user-1',
        theme: '极简主义',
        layout: 'classic',
        lighting: 'soft',
        createdAt: Date.now() - 86400000 * 3,
        artworkIds: ['art-1', 'art-2', 'art-3', 'art-4', 'art-5']
      },
      {
        id: 'gallery-2',
        name: '色彩诗篇',
        curatorId: 'user-2',
        theme: '抽象表现',
        layout: 'modern',
        lighting: 'warm',
        createdAt: Date.now() - 86400000 * 2,
        artworkIds: ['art-6', 'art-7', 'art-8']
      },
      {
        id: 'gallery-3',
        name: '静谧时光',
        curatorId: 'user-3',
        theme: '印象派',
        layout: 'classic',
        lighting: 'natural',
        createdAt: Date.now() - 86400000,
        artworkIds: ['art-9', 'art-10', 'art-11', 'art-12']
      },
      {
        id: 'gallery-4',
        name: '几何幻想',
        curatorId: 'user-4',
        theme: '构成主义',
        layout: 'grid',
        lighting: 'cool',
        createdAt: Date.now() - 3600000 * 12,
        artworkIds: ['art-13', 'art-14']
      },
      {
        id: 'gallery-5',
        name: '东方韵致',
        curatorId: 'user-1',
        theme: '新中式',
        layout: 'zen',
        lighting: 'soft',
        createdAt: Date.now() - 3600000 * 6,
        artworkIds: ['art-15', 'art-16', 'art-17', 'art-18', 'art-19']
      },
      {
        id: 'gallery-6',
        name: '未来遗迹',
        curatorId: 'user-2',
        theme: '赛博朋克',
        layout: 'modern',
        lighting: 'neon',
        createdAt: Date.now() - 3600000 * 2,
        artworkIds: ['art-20', 'art-21']
      }
    ];

    galleries.forEach(gallery => this.galleries.set(gallery.id, gallery));

    const artworksData = [
      { id: 'art-1', title: '晨雾中的山谷', color: '#9CA38F', galleryId: 'gallery-1', position: 0, price: 500, duration: 7200 },
      { id: 'art-2', title: '午后的阳光', color: '#D4B896', galleryId: 'gallery-1', position: 2, price: 800, duration: 10800 },
      { id: 'art-3', title: '静谧的湖', color: '#7D8A95', galleryId: 'gallery-1', position: 4, price: 650, duration: 5400 },
      { id: 'art-4', title: '暮色森林', color: '#5D6B5A', galleryId: 'gallery-1', position: 6, price: 1200, duration: 14400 },
      { id: 'art-5', title: '花开时节', color: '#C9A0A0', galleryId: 'gallery-1', position: 8, price: 450, duration: 3600 },
      { id: 'art-6', title: '红色狂想', color: '#B85450', galleryId: 'gallery-2', position: 1, price: 2000, duration: 21600 },
      { id: 'art-7', title: '蓝色忧郁', color: '#4A6FA5', galleryId: 'gallery-2', position: 4, price: 1500, duration: 18000 },
      { id: 'art-8', title: '金色年华', color: '#D4AF37', galleryId: 'gallery-2', position: 7, price: 3000, duration: 28800 },
      { id: 'art-9', title: '睡莲印象', color: '#8FA87A', galleryId: 'gallery-3', position: 0, price: 900, duration: 7200 },
      { id: 'art-10', title: '日出时分', color: '#E8B86D', galleryId: 'gallery-3', position: 3, price: 1100, duration: 10800 },
      { id: 'art-11', title: '乡间小径', color: '#A39078', galleryId: 'gallery-3', position: 5, price: 750, duration: 5400 },
      { id: 'art-12', title: '河边倒影', color: '#6B8E9F', galleryId: 'gallery-3', position: 8, price: 1350, duration: 14400 },
      { id: 'art-13', title: '正方形的对话', color: '#5C6B7A', galleryId: 'gallery-4', position: 2, price: 600, duration: 3600 },
      { id: 'art-14', title: '圆形的韵律', color: '#8B7355', galleryId: 'gallery-4', position: 6, price: 700, duration: 4800 },
      { id: 'art-15', title: '山水清音', color: '#7B8B7A', galleryId: 'gallery-5', position: 0, price: 1800, duration: 21600 },
      { id: 'art-16', title: '墨竹图', color: '#4A5043', galleryId: 'gallery-5', position: 2, price: 2200, duration: 28800 },
      { id: 'art-17', title: '红梅傲雪', color: '#A85050', galleryId: 'gallery-5', position: 4, price: 1600, duration: 18000 },
      { id: 'art-18', title: '幽兰', color: '#9A9E7A', galleryId: 'gallery-5', position: 6, price: 1400, duration: 14400 },
      { id: 'art-19', title: '秋山行旅', color: '#B8956A', galleryId: 'gallery-5', position: 8, price: 2500, duration: 36000 },
      { id: 'art-20', title: '霓虹都市', color: '#9B59B6', galleryId: 'gallery-6', position: 3, price: 3200, duration: 43200 },
      { id: 'art-21', title: '数据洪流', color: '#2C3E50', galleryId: 'gallery-6', position: 5, price: 2800, duration: 36000 }
    ];

    const now = Date.now();
    artworksData.forEach((data, index) => {
      const bidderIds = ['user-2', 'user-3', 'user-4', null];
      const randomBidder = bidderIds[index % 4];
      const hasBid = randomBidder !== null;
      
      const artwork: Artwork = {
        id: data.id,
        title: data.title,
        color: data.color,
        galleryId: data.galleryId,
        positionIndex: data.position,
        startingPrice: data.price,
        currentBid: hasBid ? data.price + Math.floor(Math.random() * 500) + 100 : data.price,
        bidderId: randomBidder,
        auctionEndTime: now + data.duration * 1000,
        auctionActive: true
      };
      this.artworks.set(artwork.id, artwork);
    });
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  addNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp'>): Notification {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    user.notifications.unshift(newNotification);
    this.users.set(userId, user);
    return newNotification;
  }

  markNotificationRead(userId: string, notificationId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    const notification = user.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  getGallery(galleryId: string): Gallery | undefined {
    return this.galleries.get(galleryId);
  }

  getAllGalleries(): Gallery[] {
    return Array.from(this.galleries.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  createGallery(data: Omit<Gallery, 'id' | 'createdAt' | 'artworkIds'>): Gallery {
    const gallery: Gallery = {
      ...data,
      id: `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      artworkIds: []
    };
    this.galleries.set(gallery.id, gallery);
    return gallery;
  }

  updateGallery(gallery: Gallery): Gallery {
    this.galleries.set(gallery.id, gallery);
    return gallery;
  }

  deleteGallery(galleryId: string): boolean {
    const gallery = this.galleries.get(galleryId);
    if (!gallery) return false;

    gallery.artworkIds.forEach(artworkId => this.artworks.delete(artworkId));
    return this.galleries.delete(galleryId);
  }

  getArtwork(artworkId: string): Artwork | undefined {
    return this.artworks.get(artworkId);
  }

  getArtworksByGallery(galleryId: string): Artwork[] {
    return Array.from(this.artworks.values())
      .filter(a => a.galleryId === galleryId)
      .sort((a, b) => {
        const posA = a.positionIndex ?? 999;
        const posB = b.positionIndex ?? 999;
        return posA - posB;
      });
  }

  getActiveAuctions(): Artwork[] {
    return Array.from(this.artworks.values()).filter(a => a.auctionActive && a.auctionEndTime !== null);
  }

  createArtwork(data: Omit<Artwork, 'id' | 'currentBid' | 'bidderId' | 'auctionActive'>): Artwork {
    const artwork: Artwork = {
      ...data,
      id: `art-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      currentBid: data.startingPrice,
      bidderId: null,
      auctionActive: true
    };
    this.artworks.set(artwork.id, artwork);

    const gallery = this.galleries.get(data.galleryId);
    if (gallery) {
      gallery.artworkIds.push(artwork.id);
      this.galleries.set(gallery.id, gallery);
    }

    return artwork;
  }

  updateArtwork(artwork: Artwork): Artwork {
    this.artworks.set(artwork.id, artwork);
    return artwork;
  }

  placeArtworkInPosition(artworkId: string, positionIndex: number): Artwork | null {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return null;

    const gallery = this.galleries.get(artwork.galleryId);
    if (!gallery) return null;

    const existingArtwork = Array.from(this.artworks.values())
      .find(a => a.galleryId === artwork.galleryId && a.positionIndex === positionIndex);
    
    if (existingArtwork && existingArtwork.id !== artworkId) {
      existingArtwork.positionIndex = artwork.positionIndex;
      this.artworks.set(existingArtwork.id, existingArtwork);
    }

    artwork.positionIndex = positionIndex;
    this.artworks.set(artwork.id, artwork);
    return artwork;
  }

  removeArtworkFromPosition(artworkId: string): Artwork | null {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return null;

    artwork.positionIndex = null;
    this.artworks.set(artwork.id, artwork);
    return artwork;
  }

  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  getTransactionsByUser(userId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.buyerId === userId || t.sellerId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  createTransaction(data: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
    const transaction: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  getActiveAuctionCountForGallery(galleryId: string): number {
    return Array.from(this.artworks.values())
      .filter(a => a.galleryId === galleryId && a.auctionActive && a.auctionEndTime !== null).length;
  }
}

export const db = new Database();
export default db;
