import express from 'express';
import cors from 'cors';
import filmsRouter from './routes/films.js';
import ratingsRouter from './routes/ratings.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/films', filmsRouter);
app.use('/ratings', ratingsRouter);
app.use('/dashboard', dashboardRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
