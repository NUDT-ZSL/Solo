export interface Book {
  _id: string
  title: string
  author: string
  isbn: string
  category: string
  donor: string
  入库Date: string
  status: '在馆' | '已借出' | '已预约'
  borrowCount: number
  createdAt: string
}

export interface Review {
  _id: string
  bookId: string
  rating: number
  comment: string
  reviewer: string
  createdAt: string
}

export interface Stats {
  totalBooks: number
  totalReviews: number
  availableBooks: number
  borrowedBooks: number
}

export interface BookInput {
  title: string
  author: string
  isbn: string
  category: string
  donor: string
  入库Date: string
}
