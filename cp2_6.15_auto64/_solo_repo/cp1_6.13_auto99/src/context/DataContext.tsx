import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { Book, CartItem, Category } from '../types';

interface DataContextValue {
  books: Book[];
  setBooks: (books: Book[]) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  selectedCategory: Category;
  setSelectedCategory: (c: Category) => void;
  searchKeyword: string;
  setSearchKeyword: (k: string) => void;
  filteredBooks: Book[];
  categoryCounts: Record<string, number>;
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartOpen: boolean;
  setCartOpen: (o: boolean) => void;
  addToCart: (book: Book) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  selectedBook: Book | null;
  setSelectedBook: (b: Book | null) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('全部');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 全部: books.length };
    books.forEach(b => { counts[b.category] = (counts[b.category] || 0) + 1; });
    return counts;
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchCat = selectedCategory === '全部' || book.category === selectedCategory;
      const kw = searchKeyword.trim().toLowerCase();
      const matchKw = !kw || book.title.toLowerCase().includes(kw) || book.author.toLowerCase().includes(kw);
      return matchCat && matchKw;
    });
  }, [books, selectedCategory, searchKeyword]);

  const addToCart = useCallback((book: Book) => {
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.id === book.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, {
        id: book.id, title: book.title, author: book.author,
        price: book.price, cover: book.cover, quantity: 1
      }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.id !== id));
      return;
    }
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cartItems]
  );
  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems]
  );

  const value: DataContextValue = {
    books, setBooks, loading, setLoading,
    selectedCategory, setSelectedCategory,
    searchKeyword, setSearchKeyword,
    filteredBooks, categoryCounts,
    cartItems, setCartItems, cartOpen, setCartOpen,
    addToCart, removeFromCart, updateQuantity, clearCart,
    cartTotal, cartCount,
    selectedBook, setSelectedBook
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
