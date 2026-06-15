import { Book, Match, Exchange, Notification, User } from '../types';

const BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

function parseBookFromApi(book: any): Book {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    tags: book.tags || [],
    condition: book.condition || '九成新',
    image: book.image_url || undefined,
    ownerId: book.owner_id,
    ownerName: book.owner_name || '',
    ownerAvatar: book.owner_avatar || undefined,
    latitude: book.latitude || book.owner_lat || 0,
    longitude: book.longitude || book.owner_lon || 0,
    description: book.description || undefined,
    createdAt: book.created_at || new Date().toISOString(),
  };
}

function parseUserFromApi(user: any): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || undefined,
    latitude: user.latitude || 0,
    longitude: user.longitude || 0,
  };
}

function parseNotificationFromApi(notification: any): Notification {
  return {
    id: notification.id,
    type: notification.type as any,
    userId: notification.user_id,
    title: notification.title || getNotificationTitle(notification.type),
    content: notification.content || '',
    read: notification.is_read || false,
    createdAt: notification.created_at || new Date().toISOString(),
    relatedId: notification.related_id || undefined,
  };
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'match':
      return '新的匹配';
    case 'exchange_request':
      return '交换请求';
    case 'exchange_update':
    case 'exchange_status':
      return '交换状态更新';
    default:
      return '通知';
  }
}

export const authAPI = {
  login: (username: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }).then((res) => ({
      user: parseUserFromApi(res.user),
      token: res.token,
    })),

  register: (data: {
    username: string;
    password: string;
    email: string;
    latitude: number;
    longitude: number;
  }) =>
    request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => ({
      user: parseUserFromApi(res.user),
      token: res.token,
    })),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),
};

export const booksAPI = {
  getAll: (params?: { search?: string; tags?: string[]; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.tags?.length) queryParams.set('tags', params.tags.join(','));
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    const query = queryParams.toString();
    return request<{ books: any[]; pagination: any }>(`/books${query ? `?${query}` : ''}`)
      .then((res) => ({
        books: res.books.map(parseBookFromApi),
        pagination: res.pagination,
      }));
  },

  getById: (id: string) =>
    request<{ book: any; owner: any }>(`/books/${id}`)
      .then((res) => {
        const book = parseBookFromApi(res.book);
        if (res.owner) {
          book.ownerName = res.owner.username;
          book.ownerId = res.owner.id;
        }
        return book;
      }),

  getByUser: (userId: string) =>
    request<{ books: any[] }>(`/books/user/${userId}`)
      .then((res) => res.books.map(parseBookFromApi)),

  create: (data: { owner_id: string; title: string; author: string; tags: string[]; condition: string; image_url?: string }) =>
    request<{ book: any }>('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => parseBookFromApi(res.book)),
};

export const matchesAPI = {
  getForUser: (userId: string) =>
    request<{ matches: any[] }>(`/match/${userId}`)
      .then((res) => res.matches.map((m: any) => ({
        book: parseBookFromApi(m.book),
        owner: m.owner,
        matchPercentage: m.matchPercentage,
      }))),
};

export const exchangesAPI = {
  create: (data: { from_user_id: string; to_user_id: string; from_book_id: string; to_book_id: string }) =>
    request<{ exchange: any }>('/exchange', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => res.exchange),

  getForUser: (userId: string) =>
    request<{ exchanges: any[] }>(`/exchange/${userId}`)
      .then((res) => res.exchanges),

  updateStatus: (id: string, status: string) =>
    request<{ exchange: any }>(`/exchange/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }).then((res) => res.exchange),
};

export const notificationsAPI = {
  getForUser: (userId: string) =>
    request<{ notifications: any[] }>(`/notifications/${userId}`)
      .then((res) => res.notifications.map(parseNotificationFromApi)),

  markAsRead: (id: string) =>
    request<{ notification: any }>(`/notifications/${id}/read`, {
      method: 'PUT',
    }).then((res) => parseNotificationFromApi(res.notification)),

  getUnreadCount: (userId: string) =>
    request<{ unreadCount: number }>(`/notifications/${userId}/unread-count`)
      .then((res) => ({ count: res.unreadCount })),
};
