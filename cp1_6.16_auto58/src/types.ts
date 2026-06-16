export type InstrumentStatus = 'selling' | 'rented' | 'sold';

export interface Instrument {
  id: string;
  name: string;
  brand: string;
  price: number;
  dailyRentalPrice: number;
  status: InstrumentStatus;
  material: string;
  year: number;
  condition: string;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  createdAt: string;
}

export type OrderType = 'purchase' | 'rental';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  instrumentId: string;
  instrumentName: string;
  buyerId: string;
  sellerId: string;
  type: OrderType;
  price: number;
  deposit?: number;
  rentalDays?: number;
  status: OrderStatus;
  createdAt: string;
}

export type TransactionType = 'consignment_income' | 'rental_deposit' | 'refund' | 'rental_income';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  frozenDeposit: number;
  transactions: Transaction[];
}

export type NegotiationStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface Negotiation {
  id: string;
  instrumentId: string;
  instrumentName: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  proposedPrice: number;
  reason: string;
  status: NegotiationStatus;
  counterPrice?: number;
  createdAt: string;
  updatedAt: string;
}
