export type AuctionStatus = 'pending' | 'active' | 'sold' | 'passed';

export interface AuctionItem {
  id: string;
  name: string;
  startingPrice: number;
  imageUrl: string;
  description: string;
  status: AuctionStatus;
  currentHighestBid: number;
  currentHighestBidder: string | null;
  bidHistory: BidRecord[];
  countdown: number;
}

export interface BidRecord {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  amount: number;
  timestamp: number;
  valid: boolean;
  rank: number;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  balance: number;
  initialBalance: number;
  bidCount: number;
}

export interface AuctionState {
  items: AuctionItem[];
  users: User[];
  currentActiveIndex: number;
  bidFeed: BidRecord[];
  manualPauseUntil: number;
}

export type AuctionAction =
  | { type: 'TICK'; payload: number }
  | { type: 'BID'; payload: { itemId: string; userId: string; amount: number } }
  | { type: 'MANUAL_BID'; payload: { itemId: string; amount: number } }
  | { type: 'SET_MANUAL_PAUSE'; payload: number }
  | { type: 'START_NEXT' };
