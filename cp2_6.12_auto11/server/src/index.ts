import express from 'express';
import cors from 'cors';
import { initDB, getTodosByDate, getTodosByDateRange, createTodo, updateTodo, deleteTodo, reorderTodos } from './db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/todos', (req, res) => {
  const { date, startDate, endDate } = req.query;
  
  if (date) {
    const todos = getTodosByDate(date as string);
    return res.json(todos);
  }
  
  if (startDate && endDate) {
    const todos = getTodosByDateRange(startDate as string, endDate as string);
    return res.json(todos);
  }
  
  return res.status(400).json({ error: 'Please provide date or startDate and endDate' });
});

app.post('/api/todos', (req, res) => {
  const { title, description, priority, tags, date, order_index } = req.body;
  
  if (!title || !date) {
    return res.status(