export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  price: number;
  category: string;
  stock: number;
  description: string;
}

export interface Recommendation {
  id: string;
  bookTitle: string;
  recommenderName: string;
  reason: string;
  submittedAt: string;
}

export interface LayoutRecommendation {
  category: string;
  bookCount: number;
  books: Book[];
}

export type CategoryColorMap = Record<string, string>;
