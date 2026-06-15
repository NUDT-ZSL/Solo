import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format, isToday, startOfDay, differenceInDays } from 'date-fns';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(express.json());

const dataDir = path.join(process.cwd(), 'data');
const decksDb = Datastore.create(path.join(dataDir, 'decks.db'));
const cardsDb = Datastore.create(path.join(dataDir, 'cards.db'));
const reviewLogsDb = Datastore.create(path.join(dataDir, 'reviewLogs.db'));
const userStatsDb = Datastore.create(path.join(dataDir, 'userStats.db'));

interface Deck {
  _id?: string;
  id: string;
  name: string;
  themeColor: string;
  createdAt: string;
  lastPracticedAt?: string;
  cardCount: number;
}

interface Card {
  _id?: string;
  id: string;
  deckId: string;
  word: string;
  meaning: string;
  example?: string;
  nextReviewAt: string;
  interval: number;
  createdAt: string;
}

interface ReviewLog {
  _id?: string;
  id: string;
  cardId: string;
  deckId: string;
  rating: 'easy' | 'medium' | 'hard';
  reviewedAt: string;
}

interface UserStats {
  _id?: string;
  id: string;
  todayLearned: number;
  totalCards: number;
  streakDays: number;
  lastActiveDate: string;
}

const THEME_COLORS = ['#fce7f3', '#ede9fe', '#cffafe', '#d1fae5', '#fef9c8'];

function getRandomColor(): string {
  return THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
}

async function updateUserStats(deckId?: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  let stats = (await userStatsDb.findOne({ id: 'default' })) as UserStats | null;

  const allCards = await cardsDb.find({});
  const totalCards = allCards.length;

  const todayLogs = await reviewLogsDb.find({
    reviewedAt: { $gte: startOfDay(new Date()).toISOString() },
  });
  const todayLearned = todayLogs.length;

  if (!stats) {
    stats = {
      id: 'default',
      todayLearned,
      totalCards,
      streakDays: 1,
      lastActiveDate: today,
    };
    await userStatsDb.insert(stats);
  } else {
    const lastActive = stats.lastActiveDate;
    const lastActiveDateObj = new Date(lastActive);
    const todayDateObj = new Date(today);
    const diffDays = differenceInDays(todayDateObj, lastActiveDateObj);

    let streakDays = stats.streakDays;
    if (diffDays === 1) {
      streakDays += 1;
    } else if (diffDays > 1) {
      streakDays = 1;
    }

    await userStatsDb.update(
      { id: 'default' },
      { $set: { todayLearned, totalCards, streakDays, lastActiveDate: today } }
    );
  }

  return stats;
}

async function seedData() {
  const decksCount = await decksDb.count({});
  if (decksCount > 0) return;

  const sampleDecks = [
    { id: uuidv4(), name: '英语基础词汇', themeColor: getRandomColor(), createdAt: new Date().toISOString(), cardCount: 5 },
    { id: uuidv4(), name: '托福核心词汇', themeColor: getRandomColor(), createdAt: new Date().toISOString(), cardCount: 5 },
    { id: uuidv4(), name: '商务英语', themeColor: getRandomColor(), createdAt: new Date().toISOString(), cardCount: 5 },
    { id: uuidv4(), name: '雅思高频词', themeColor: getRandomColor(), createdAt: new Date().toISOString(), cardCount: 4 },
  ];

  for (const deck of sampleDecks) {
    await decksDb.insert(deck as Deck);
  }

  const sampleCards = [
    { deckName: '英语基础词汇', word: 'apple', meaning: '苹果', example: 'I eat an apple every day.' },
    { deckName: '英语基础词汇', word: 'book', meaning: '书；书本', example: 'This book is very interesting.' },
    { deckName: '英语基础词汇', word: 'happy', meaning: '快乐的；高兴的', example: 'She looks very happy today.' },
    { deckName: '英语基础词汇', word: 'water', meaning: '水', example: 'Please give me some water.' },
    { deckName: '英语基础词汇', word: 'friend', meaning: '朋友', example: 'He is my best friend.' },
    { deckName: '托福核心词汇', word: 'abundant', meaning: '丰富的；充裕的', example: 'The region has abundant natural resources.' },
    { deckName: '托福核心词汇', word: 'ambiguous', meaning: '模糊的；有歧义的', example: 'The statement was deliberately ambiguous.' },
    { deckName: '托福核心词汇', word: 'contradict', meaning: '反驳；与...矛盾', example: 'The evidence contradicts his statement.' },
    { deckName: '托福核心词汇', word: 'diminish', meaning: '减少；降低', example: 'The importance of this issue cannot be diminished.' },
    { deckName: '托福核心词汇', word: 'elaborate', meaning: '精心制作的；详尽的', example: 'She gave an elaborate explanation.' },
    { deckName: '商务英语', word: 'negotiate', meaning: '谈判；协商', example: 'We need to negotiate the contract terms.' },
    { deckName: '商务英语', word: 'revenue', meaning: '收入；收益', example: 'The company\'s revenue increased by 20%.' },
    { deckName: '商务英语', word: 'deadline', meaning: '截止日期', example: 'The project deadline is next Friday.' },
    { deckName: '商务英语', word: 'colleague', meaning: '同事', example: 'I discussed this with my colleagues.' },
    { deckName: '商务英语', word: 'strategy', meaning: '战略；策略', example: 'We need a new marketing strategy.' },
    { deckName: '雅思高频词', word: 'phenomenon', meaning: '现象', example: 'This is a common natural phenomenon.' },
    { deckName: '雅思高频词', word: 'sustainable', meaning: '可持续的', example: 'We need sustainable development.' },
    { deckName: '雅思高频词', word: 'consequence', meaning: '结果；后果', example: 'Every action has its consequences.' },
    { deckName: '雅思高频词', word: 'deteriorate', meaning: '恶化；变坏', example: 'His health began to deteriorate.' },
  ];

  const allDecks = await decksDb.find({}) as Deck[];
  const deckMap = new Map(allDecks.map(d => [d.name, d.id]));

  for (const card of sampleCards) {
    const deckId = deckMap.get(card.deckName);
    if (deckId) {
      const newCard: Card = {
        id: uuidv4(),
        deckId,
        word: card.word,
        meaning: card.meaning,
        example: card.example,
        nextReviewAt: new Date().toISOString(),
        interval: 1,
        createdAt: new Date().toISOString(),
      };
      await cardsDb.insert(newCard);
    }
  }

  await updateUserStats();
}

app.get('/api/decks', async (req, res) => {
  try {
    const decks = (await decksDb.find({})) as Deck[];
    const decksWithCount = await Promise.all(
      decks.map(async (deck) => {
        const cardCount = await cardsDb.count({ deckId: deck.id });
        const recentLogs = await reviewLogsDb.find({ deckId: deck.id }).sort({ reviewedAt: -1 }).limit(1);
        return {
          ...deck,
          cardCount,
          lastPracticedAt: recentLogs.length > 0 ? recentLogs[0].reviewedAt : undefined,
        };
      })
    );
    res.json(decksWithCount);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

app.post('/api/decks', async (req, res) => {
  try {
    const { name } = req.body;
    const newDeck: Deck = {
      id: uuidv4(),
      name,
      themeColor: getRandomColor(),
      createdAt: new Date().toISOString(),
      cardCount: 0,
    };
    const inserted = await decksDb.insert(newDeck);
    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

app.get('/api/cards', async (req, res) => {
  try {
    const { deckId } = req.query;
    const query = deckId ? { deckId: deckId as string } : {};
    const cards = await cardsDb.find(query).sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

app.get('/api/cards/review', async (req, res) => {
  try {
    const { deckId } = req.query;
    const now = new Date().toISOString();
    const query = deckId
      ? { deckId: deckId as string, nextReviewAt: { $lte: now } }
      : { nextReviewAt: { $lte: now } };
    const cards = await cardsDb.find(query).sort({ nextReviewAt: 1 }).limit(20);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch review cards' });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const { deckId, word, meaning, example } = req.body;
    const newCard: Card = {
      id: uuidv4(),
      deckId,
      word,
      meaning,
      example: example || '',
      nextReviewAt: new Date().toISOString(),
      interval: 1,
      createdAt: new Date().toISOString(),
    };
    const inserted = await cardsDb.insert(newCard);
    await updateUserStats(deckId);
    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, meaning, example } = req.body;
    const updated = await cardsDb.update(
      { id },
      { $set: { word, meaning, example } },
      { returnUpdatedDocs: true }
    );
    if (!updated) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numRemoved = await cardsDb.remove({ id }, {});
    if (numRemoved === 0) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    await updateUserStats();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

app.post('/api/review', async (req, res) => {
  try {
    const { cardId, deckId, rating } = req.body as { cardId: string; deckId: string; rating: 'easy' | 'medium' | 'hard' };

    const card = (await cardsDb.findOne({ id: cardId })) as Card | null;
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    let intervalDays = 1;
    if (rating === 'easy') {
      intervalDays = 7;
    } else if (rating === 'medium') {
      intervalDays = 3;
    } else {
      intervalDays = 1;
    }

    const nextReviewAt = addDays(new Date(), intervalDays).toISOString();

    await cardsDb.update(
      { id: cardId },
      { $set: { nextReviewAt, interval: intervalDays } }
    );

    const reviewLog = {
      id: uuidv4(),
      cardId,
      deckId,
      rating,
      reviewedAt: new Date().toISOString(),
    };
    await reviewLogsDb.insert(reviewLog);

    await decksDb.update(
      { id: deckId },
      { $set: { lastPracticedAt: new Date().toISOString() } }
    );

    const updatedStats = await updateUserStats(deckId);

    res.json({ nextReviewAt, interval: intervalDays, stats: updatedStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record review' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await updateUserStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await seedData();
  console.log('Data seeded successfully');
});
