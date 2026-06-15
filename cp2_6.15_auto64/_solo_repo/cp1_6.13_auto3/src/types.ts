export interface Record {
  _id?: string;
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  createdAt?: number;
}
