import { v4 as uuidv4 } from 'uuid';
import { AuctionState, AuctionAction, BidRecord } from './types';

export function auctionReducer(state: AuctionState, action: AuctionAction): AuctionState {
  switch (action.type) {
    case 'TICK': {
      const now = Date.now();
      const items = state.items.map((item, idx) => {
        if (idx !== state.currentActiveIndex || item.status !== 'active') return item;
        const newCountdown = item.countdown - action.payload;
        if (newCountdown <= 0) {
          const hasBids = item.bidHistory.some((b) => b.valid);
          return {
            ...item,
            countdown: 0,
            status: hasBids ? 'sold' as const : 'passed' as const,
          };
        }
        return { ...item, countdown: Math.max(0, newCountdown) };
      });

      let currentActiveIndex = state.currentActiveIndex;
      const currentItem = items[currentActiveIndex];
      if (currentItem && (currentItem.status === 'sold' || currentItem.status === 'passed')) {
        const nextIndex = currentActiveIndex + 1;
        if (nextIndex < items.length) {
          items[nextIndex] = { ...items[nextIndex], status: 'active', countdown: 120 };
          currentActiveIndex = nextIndex;
        }
      }

      return { ...state, items, currentActiveIndex };
    }

    case 'BID': {
      const { itemId, userId, amount } = action.payload;
      const itemIndex = state.items.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) return state;
      const item = state.items[itemIndex];
      if (item.status !== 'active') return state;

      const user = state.users.find((u) => u.id === userId);
      if (!user) return state;

      const isValid = amount > item.currentHighestBid && user.balance >= amount;

      const validBids = item.bidHistory.filter((b) => b.valid);
      const rank = isValid ? validBids.length + 1 : 0;

      const bidRecord: BidRecord = {
        id: uuidv4(),
        itemId,
        userId,
        userName: user.name,
        amount,
        timestamp: Date.now(),
        valid: isValid,
        rank,
      };

      const newItems = [...state.items];
      if (isValid) {
        newItems[itemIndex] = {
          ...item,
          currentHighestBid: amount,
          currentHighestBidder: userId,
          bidHistory: [...item.bidHistory, bidRecord],
        };
      } else {
        newItems[itemIndex] = {
          ...item,
          bidHistory: [...item.bidHistory, bidRecord],
        };
      }

      const newUsers = state.users.map((u) => {
        if (u.id !== userId || !isValid) return u;
        return { ...u, balance: u.balance - amount, bidCount: u.bidCount + 1 };
      });

      return {
        ...state,
        items: newItems,
        users: newUsers,
        bidFeed: [bidRecord, ...state.bidFeed],
      };
    }

    case 'MANUAL_BID': {
      const { itemId, amount } = action.payload;
      const itemIndex = state.items.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) return state;
      const item = state.items[itemIndex];
      if (item.status !== 'active') return state;

      const isValid = amount > item.currentHighestBid;
      const validBids = item.bidHistory.filter((b) => b.valid);
      const rank = isValid ? validBids.length + 1 : 0;

      const bidRecord: BidRecord = {
        id: uuidv4(),
        itemId,
        userId: 'manual',
        userName: 'You',
        amount,
        timestamp: Date.now(),
        valid: isValid,
        rank,
      };

      const newItems = [...state.items];
      if (isValid) {
        newItems[itemIndex] = {
          ...item,
          currentHighestBid: amount,
          currentHighestBidder: 'manual',
          bidHistory: [...item.bidHistory, bidRecord],
        };
      } else {
        newItems[itemIndex] = {
          ...item,
          bidHistory: [...item.bidHistory, bidRecord],
        };
      }

      return {
        ...state,
        items: newItems,
        bidFeed: [bidRecord, ...state.bidFeed],
        manualPauseUntil: Date.now() + 2000,
      };
    }

    case 'SET_MANUAL_PAUSE': {
      return { ...state, manualPauseUntil: action.payload };
    }

    case 'START_NEXT': {
      const items = [...state.items];
      const idx = state.currentActiveIndex;
      if (idx < items.length && items[idx].status === 'pending') {
        items[idx] = { ...items[idx], status: 'active', countdown: 120 };
      }
      return { ...state, items };
    }

    default:
      return state;
  }
}

export function generateAutoBid(
  state: AuctionState,
  now: number
): { userId: string; itemId: string; amount: number } | null {
  if (now < state.manualPauseUntil) return null;

  const activeItem = state.items[state.currentActiveIndex];
  if (!activeItem || activeItem.status !== 'active') return null;

  const eligibleUsers = state.users.filter(
    (u) => u.balance > activeItem.currentHighestBid && u.id !== activeItem.currentHighestBidder
  );
  if (eligibleUsers.length === 0) return null;

  const user = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
  const multiplier = 1.01 + Math.random() * 0.19;
  const amount = Math.round(activeItem.currentHighestBid * multiplier * 100) / 100;

  return { userId: user.id, itemId: activeItem.id, amount };
}
