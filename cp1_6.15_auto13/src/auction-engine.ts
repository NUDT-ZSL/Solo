import { v4 as uuidv4 } from 'uuid';
import { AuctionState, AuctionAction, BidRecord } from './types';

function computeRankByAmount(validBids: BidRecord[], targetAmount: number): number {
  const uniqueAmounts = [...new Set(validBids.map((b) => b.amount))].sort((a, b) => b - a);
  const idx = uniqueAmounts.findIndex((a) => a === targetAmount);
  return idx === -1 ? 0 : idx + 1;
}

function recomputeRanksForItem(bidHistory: BidRecord[]): BidRecord[] {
  const valid = bidHistory.filter((b) => b.valid);
  return bidHistory.map((b) => {
    if (!b.valid) return b;
    return { ...b, rank: computeRankByAmount(valid, b.amount) };
  });
}

export function auctionReducer(state: AuctionState, action: AuctionAction): AuctionState {
  switch (action.type) {
    case 'TICK': {
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

      const tempValidBids = [...item.bidHistory.filter((b) => b.valid)];
      if (isValid) tempValidBids.push({ id: 'tmp', itemId, userId, userName: user.name, amount, timestamp: 0, valid: true, rank: 0 });
      const rank = isValid ? computeRankByAmount(tempValidBids, amount) : 0;

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
      const newHistory = [...item.bidHistory, bidRecord];
      const recomputedHistory = recomputeRanksForItem(newHistory);

      if (isValid) {
        newItems[itemIndex] = {
          ...item,
          currentHighestBid: amount,
          currentHighestBidder: userId,
          bidHistory: recomputedHistory,
        };
      } else {
        newItems[itemIndex] = {
          ...item,
          bidHistory: recomputedHistory,
        };
      }

      const recomputedFeed = state.bidFeed.map((f) => {
        if (f.itemId !== itemId || !f.valid) return f;
        const allItemValid = recomputedHistory.filter((b) => b.valid);
        return { ...f, rank: computeRankByAmount(allItemValid, f.amount) };
      });
      const newFeed = [bidRecord, ...recomputedFeed];

      const newUsers = state.users.map((u) => {
        if (u.id !== userId || !isValid) return u;
        return { ...u, balance: u.balance - amount, bidCount: u.bidCount + 1 };
      });

      return {
        ...state,
        items: newItems,
        users: newUsers,
        bidFeed: newFeed,
      };
    }

    case 'MANUAL_BID': {
      const { itemId, amount } = action.payload;
      const itemIndex = state.items.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) return state;
      const item = state.items[itemIndex];
      if (item.status !== 'active') return state;

      const isValid = amount > item.currentHighestBid;

      const tempValidBids = [...item.bidHistory.filter((b) => b.valid)];
      if (isValid) tempValidBids.push({ id: 'tmp', itemId, userId: 'manual', userName: 'You', amount, timestamp: 0, valid: true, rank: 0 });
      const rank = isValid ? computeRankByAmount(tempValidBids, amount) : 0;

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
      const newHistory = [...item.bidHistory, bidRecord];
      const recomputedHistory = recomputeRanksForItem(newHistory);

      if (isValid) {
        newItems[itemIndex] = {
          ...item,
          currentHighestBid: amount,
          currentHighestBidder: 'manual',
          bidHistory: recomputedHistory,
        };
      } else {
        newItems[itemIndex] = {
          ...item,
          bidHistory: recomputedHistory,
        };
      }

      const recomputedFeed = state.bidFeed.map((f) => {
        if (f.itemId !== itemId || !f.valid) return f;
        const allItemValid = recomputedHistory.filter((b) => b.valid);
        return { ...f, rank: computeRankByAmount(allItemValid, f.amount) };
      });
      const newFeed = [bidRecord, ...recomputedFeed];

      return {
        ...state,
        items: newItems,
        bidFeed: newFeed,
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
