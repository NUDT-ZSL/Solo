import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let cards = [];

const generateCardNumber = () => {
  const prefix = '8888';
  const random = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
  return prefix + random;
};

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

app.get('/api/cards', (req, res) => {
  const result = cards.map(card => ({
    id: card.id,
    cardNumber: card.cardNumber,
    balance: card.balance,
    points: card.points,
    createdAt: card.createdAt,
  }));
  res.json(result);
});

app.post('/api/cards', (req, res) => {
  const { cardNumber, initialBalance } = req.body;
  const balance = Number(initialBalance) || 100;
  const newCard = {
    id: uuidv4(),
    cardNumber: cardNumber || generateCardNumber(),
    balance: balance,
    points: 0,
    createdAt: formatDate(new Date()),
    consumeRecords: [],
    pointsLog: [],
  };
  cards.push(newCard);
  res.status(201).json({
    id: newCard.id,
    cardNumber: newCard.cardNumber,
    balance: newCard.balance,
    points: newCard.points,
    createdAt: newCard.createdAt,
  });
});

app.get('/api/cards/:id', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  res.json({
    id: card.id,
    cardNumber: card.cardNumber,
    balance: card.balance,
    points: card.points,
    createdAt: card.createdAt,
    consumeRecords: card.consumeRecords,
    pointsLog: card.pointsLog,
  });
});

app.post('/api/cards/:id/consume', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  const { amount } = req.body;
  const consumeAmount = Number(amount);
  if (isNaN(consumeAmount) || consumeAmount <= 0) {
    return res.status(400).json({ error: '消费金额无效' });
  }
  if (card.balance < consumeAmount) {
    return res.status(400).json({ error: '余额不足' });
  }
  card.balance = Math.round((card.balance - consumeAmount) * 10) / 10;
  const pointsEarned = Math.floor(consumeAmount);
  card.points += pointsEarned;
  const record = {
    id: uuidv4(),
    time: formatDate(new Date()),
    amount: consumeAmount,
    remainingBalance: card.balance,
    pointsEarned: pointsEarned,
  };
  card.consumeRecords.unshift(record);
  res.json({
    balance: card.balance,
    points: card.points,
    record: record,
  });
});

app.post('/api/cards/:id/redeem', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  const { points, item } = req.body;
  const redeemPoints = Number(points);
  if (isNaN(redeemPoints) || redeemPoints <= 0) {
    return res.status(400).json({ error: '积分无效' });
  }
  if (card.points < redeemPoints) {
    return res.status(400).json({ error: '积分不足' });
  }
  card.points -= redeemPoints;
  const log = {
    id: uuidv4(),
    time: formatDate(new Date()),
    points: redeemPoints,
    item: item || '积分兑换',
    type: 'redeem',
  };
  card.pointsLog.unshift(log);
  res.json({
    points: card.points,
    log: log,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
