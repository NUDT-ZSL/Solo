import express from 'express';
import cors from 'cors';
import { getMockBooks, getMockReviews, updateReviewLikes } from './src/mock/mockData.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/books', (req, res) => {
  const books = getMockBooks();
  res.json(books);
});

app.get('/api/reviews', (req, res) => {
  const { bookId, ratings, sortBy } = req.query;
  
  let starRatings: number[] | undefined;
  
  if (ratings && typeof ratings === 'string') {
    const ratingArray = ratings.split(',').map(r => parseInt(r, 10)).filter(r => !isNaN(r) && r >= 1 && r <= 5);
    if (ratingArray.length > 0) {
      starRatings = ratingArray;
    }
  }
  
  const reviews = getMockReviews({
    bookId: bookId as string | undefined,
    starRatings,
    sortBy: sortBy as 'latest' | 'hottest' | undefined
  });
  
  res.json(reviews);
});

app.post('/api/reviews/:id/like', (req, res) => {
  const { id } = req.params;
  const { liked } = req.body;
  
  const updatedReview = updateReviewLikes(id, liked);
  if (updatedReview) {
    res.json(updatedReview);
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
