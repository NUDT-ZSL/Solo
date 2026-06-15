import { Router, type Request, type Response } from 'express';
import {
  createLoan,
  returnLoan,
  getUserLoans,
  getAllLoans,
  getOverdueLoans,
  getUserOverdueCount,
  createReservation,
  getUserReservations,
  cancelReservation,
  getLoanStats,
} from './loanService';

const router = Router();

router.post('/borrow', (req: Request, res: Response): void => {
  try {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
      res.status(400).json({ success: false, error: '缺少用户ID或图书ID' });
      return;
    }

    const loan = createLoan(userId, bookId);
    res.json({ success: true, loan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/return/:id', (req: Request, res: Response): void => {
  try {
    const loan = returnLoan(req.params.id);
    res.json({ success: true, loan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/user/:userId', (req: Request, res: Response): void => {
  try {
    const { year, category } = req.query;
    const loans = getUserLoans(
      req.params.userId,
      typeof year === 'string' ? year : undefined,
      typeof category === 'string' ? category : undefined
    );
    res.json({ success: true, loans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/overdue', (_req: Request, res: Response): void => {
  try {
    const loans = getOverdueLoans();
    res.json({ success: true, loans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/overdue/:userId', (req: Request, res: Response): void => {
  try {
    const result = getUserOverdueCount(req.params.userId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats/:userId', (req: Request, res: Response): void => {
  try {
    const stats = getLoanStats(req.params.userId);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (req: Request, res: Response): void => {
  try {
    const { userName, bookTitle, dateFrom, dateTo } = req.query;
    const loans = getAllLoans(
      typeof userName === 'string' ? userName : undefined,
      typeof bookTitle === 'string' ? bookTitle : undefined,
      typeof dateFrom === 'string' ? dateFrom : undefined,
      typeof dateTo === 'string' ? dateTo : undefined
    );
    res.json({ success: true, loans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reserve', (req: Request, res: Response): void => {
  try {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
      res.status(400).json({ success: false, error: '缺少用户ID或图书ID' });
      return;
    }

    const { reservation, position } = createReservation(userId, bookId);
    res.json({ success: true, reservation, position });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/reservations/:userId', (req: Request, res: Response): void => {
  try {
    const reservations = getUserReservations(req.params.userId);
    res.json({ success: true, reservations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reservations/cancel/:id', (req: Request, res: Response): void => {
  try {
    cancelReservation(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
