import { Instrument, InstrumentStatus, Negotiation } from '../types';

export const statusColors: Record<InstrumentStatus, { bg: string; text: string; label: string }> = {
  selling: { bg: '#2ECC71', text: '#FFFFFF', label: '在售' },
  rented: { bg: '#F39C12', text: '#FFFFFF', label: '已租' },
  sold: { bg: '#E74C3C', text: '#FFFFFF', label: '已售' }
};

export const getStatusStyle = (status: InstrumentStatus) => statusColors[status];

export const transitionInstrumentStatus = (
  instrument: Instrument,
  newStatus: InstrumentStatus
): Instrument => {
  return { ...instrument, status: newStatus };
};

export const calculateDailyRentalPrice = (basePrice: number): number => {
  return Math.round(basePrice * 0.015 * 100) / 100;
};

export const calculateRentalDeposit = (basePrice: number, days: number): number => {
  const dailyRate = calculateDailyRentalPrice(basePrice);
  const totalRent = dailyRate * days;
  const deposit = Math.round(basePrice * 0.3 * 100) / 100;
  return Math.round((totalRent + deposit) * 100) / 100;
};

export const mapRatingToStars = (rating: number): number => {
  if (rating >= 90) return 5;
  if (rating >= 75) return 4;
  if (rating >= 60) return 3;
  if (rating >= 40) return 2;
  if (rating >= 20) return 1;
  return 0;
};

export const applyCreditDecay = (currentRating: number, daysSinceLastSale: number): number => {
  const decayPerMonth = 2;
  const decayRate = decayPerMonth / 30;
  const decay = Math.min(daysSinceLastSale * decayRate, currentRating * 0.5);
  return Math.max(0, Math.round((currentRating - decay) * 100) / 100);
};

export const updateSellerRating = (
  currentRating: number,
  isPositive: boolean,
  transactionCount: number
): number => {
  const impact = isPositive ? 5 : -8;
  const weight = Math.min(1, 10 / (transactionCount + 10));
  const adjustment = impact * weight;
  return Math.max(0, Math.min(100, Math.round((currentRating + adjustment) * 100) / 100));
};

export const canNegotiate = (instrument: Instrument): boolean => {
  return instrument.status === 'selling';
};

export const validateNegotiationPrice = (
  proposedPrice: number,
  originalPrice: number
): { valid: boolean; message?: string } => {
  if (proposedPrice <= 0) {
    return { valid: false, message: '议价必须大于0' };
  }
  if (proposedPrice < originalPrice * 0.5) {
    return { valid: false, message: '议价不能低于原价的50%' };
  }
  if (proposedPrice >= originalPrice) {
    return { valid: false, message: '议价必须低于原价' };
  }
  return { valid: true };
};

export const getActiveNegotiations = (
  negotiations: Negotiation[],
  sellerId: string
): Negotiation[] => {
  return negotiations.filter(
    (n) => n.sellerId === sellerId && (n.status === 'pending' || n.status === 'countered')
  );
};
