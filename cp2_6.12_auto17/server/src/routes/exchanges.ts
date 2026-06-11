import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import { query, getOne, run, runTransaction } from '../database';

const router = Router();

interface Exchange {
  id: string;
  fromUserId: string;
  toUserId: string;
  bookId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

interface ExchangeWithBook extends Exchange {
  book?: {
    id: string;
    title: string;
    author: string;
    isbn: string;
    coverUrl: string;
    status: string;
  };
}

const USER_NAMES: Record<string, string> = {
  'user-1': 'Alice',
  'user-2': 'Bob',
  'user-3': 'Charlie',
};

const getUserName = (userId: string) => USER_NAMES[userId] || '未知用户';

let io: SocketIOServer | null = null;

export const setSocketIO = (socketIO: SocketIOServer) => {
  io = socketIO;
};

const sendToUser = (userId: string, event: string, data: any) => {
  if (!io) return;
  const sockets = io.sockets.sockets;
  for (const socket of sockets.values()) {
    if (socket.handshake.query.userId === userId) {
      socket.emit(event, data);
    }
  }
};

router.get('/', (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };

  let querySql = `
    SELECT e.*, b.id as book_id, b.title as book_title, b.author as book_author, 
           b.isbn as book_isbn, b.coverUrl as book_coverUrl, b.status as book_status
    FROM exchanges e
    LEFT JOIN books b ON e.bookId = b.id
  `;
  const params: string[] = [];

  if (userId) {
    querySql += ' WHERE e.fromUserId = ? OR e.toUserId = ?';
    params.push(userId, userId);
  }

  querySql += ' ORDER BY e.createdAt DESC';

  const rows = query<any>(querySql, params);

  const exchanges: ExchangeWithBook[] = rows.map((row) => ({
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    bookId: row.bookId,
    status: row.status,
    createdAt: row.createdAt,
    book: row.book_id
      ? {
          id: row.book_id,
          title: row.book_title,
          author: row.book_author,
          isbn: row.book_isbn,
          coverUrl: row.book_coverUrl,
          status: row.book_status,
        }
      : undefined,
  }));

  res.json(exchanges);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const row = getOne<any>(
    `
    SELECT e.*, b.id as book_id, b.title as book_title, b.author as book_author, 
           b.isbn as book_isbn, b.coverUrl as book_coverUrl, b.status as book_status
    FROM exchanges e
    LEFT JOIN books b ON e.bookId = b.id
    WHERE e.id = ?
  `,
    [id]
  );

  if (!row) {
    return res.status(404).json({ error: 'Exchange request not found' });
  }

  const exchange: ExchangeWithBook = {
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    bookId: row.bookId,
    status: row.status,
    createdAt: row.createdAt,
    book: row.book_id
      ? {
          id: row.book_id,
          title: row.book_title,
          author: row.book_author,
          isbn: row.book_isbn,
          coverUrl: row.book_coverUrl,
          status: row.book_status,
        }
      : undefined,
  };

  res.json(exchange);
});

router.post('/', (req: Request, res: Response) => {
  const { fromUserId, toUserId, bookId } = req.body;

  if (!fromUserId || !toUserId || !bookId) {
    return res.status(400).json({ error: 'fromUserId, toUserId, and bookId are required' });
  }

  if (fromUserId === toUserId) {
    return res.status(400).json({ error: 'Cannot request exchange with yourself' });
  }

  const book = getOne<any>('SELECT * FROM books WHERE id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.status !== 'available') {
    return res.status(400).json({ error: 'Book is not available for exchange' });
  }

  const existingRequest = getOne<any>(
    "SELECT * FROM exchanges WHERE fromUserId = ? AND toUserId = ? AND bookId = ? AND status = 'pending'",
    [fromUserId, toUserId, bookId]
  );

  if (existingRequest) {
    return res.status(400).json({ error: 'A pending exchange request already exists' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  run(
    'INSERT INTO exchanges (id, fromUserId, toUserId, bookId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, fromUserId, toUserId, bookId, 'pending', createdAt]
  );

  const fromUserName = getUserName(fromUserId);
  const toUserName = getUserName(toUserId);

  sendToUser(toUserId, 'exchange_notification', {
    message: `${fromUserName} 向你请求交换《${book.title}》！`,
    exchangeId: id,
  });

  sendToUser(toUserId, 'new_exchange_request', { exchangeId: id });
  sendToUser(fromUserId, 'new_exchange_request', { exchangeId: id });

  const newExchange = getOne<Exchange>('SELECT * FROM exchanges WHERE id = ?', [id]);
  res.status(201).json(newExchange);
});

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  if (!status || !['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be one of: pending, accepted, rejected, cancelled',
    });
  }

  const exchange = getOne<Exchange>('SELECT * FROM exchanges WHERE id = ?', [id]);

  if (!exchange) {
    return res.status(404).json({ error: 'Exchange request not found' });
  }

  runTransaction(() => {
    run('UPDATE exchanges SET status = ? WHERE id = ?', [status, id]);

    if (status === 'accepted') {
      run("UPDATE books SET status = 'exchanged' WHERE id = ?", [exchange.bookId]);
      run(
        "UPDATE exchanges SET status = 'cancelled' WHERE bookId = ? AND id != ? AND status = 'pending'",
        [exchange.bookId, id]
      );
    }
  });

  const fromUserName = getUserName(exchange.fromUserId);
  const toUserName = getUserName(exchange.toUserId);

  const book = getOne<{ title: string }>('SELECT title FROM books WHERE id = ?', [exchange.bookId]);

  let message = '';
  if (status === 'accepted') {
    message = `${toUserName} 接受了《${book?.title}》的交换请求！`;
  } else if (status === 'rejected') {
    message = `${toUserName} 拒绝了《${book?.title}》的交换请求`;
  }

  sendToUser(exchange.fromUserId, 'exchange_updated', {
    message,
    status,
    exchangeId: id,
  });

  sendToUser(exchange.toUserId, 'exchange_updated', {
    message,
    status,
    exchangeId: id,
  });

  const updatedExchange = getOne<Exchange>('SELECT * FROM exchanges WHERE id = ?', [id]);
  res.json(updatedExchange);
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const exchange = getOne<Exchange>('SELECT * FROM exchanges WHERE id = ?', [id]);

  if (!exchange) {
    return res.status(404).json({ error: 'Exchange request not found' });
  }

  run('DELETE FROM exchanges WHERE id = ?', [id]);

  res.json({ success: true });
});

export default router;
