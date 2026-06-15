import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initDatabase } from './database';
import userRoutes from './user/userRoutes';
import bookRoutes from './book/bookRoutes';
import loanRoutes from './loan/loanRoutes';
import { scanOverdueLoans } from './loan/loanService';

const app = express();
const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/loans', loanRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');

    const updatedCount = scanOverdueLoans();
    console.log(`Overdue scan complete. Updated ${updatedCount} overdue loans.`);

    app.listen(PORT, () => {
      console.log(`Server ready on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
