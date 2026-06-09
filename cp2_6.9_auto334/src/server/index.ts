import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

type Emotion = 'joy' | 'sadness' | 'confusion' | 'anger';

interface Message {
  id: string;
  content: string;
  emotion: Emotion;
  timestamp: number;
  resonanceCount: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let messages: Message[] = [];

setInterval(() => {
  messages = [];
  console.log('[Server] Messages cleared at', new Date().toISOString());
}, 30 * 60 * 1000);

app.post('/api/messages', (req, res) => {
  const { content, emotion } = req.body as { content: string; emotion: Emotion };

  if (!content || typeof content !== 'string' || content.length > 80) {
    return res.status(400).json({ success: false, message: 'Content must be 1-80 characters' });
  }

  const validEmotions: Emotion[] = ['joy', 'sadness', 'confusion', 'anger'];
  if (!validEmotions.includes(emotion)) {
    return res.status(400).json({ success: false, message: 'Invalid emotion' });
  }

  const newMessage: Message = {
    id: uuidv4(),
    content,
    emotion,
    timestamp: Date.now(),
    resonanceCount: 0,
  };

  messages.push(newMessage);

  const fogConfig = {
    density: 0.02 + Math.random() * 0.03,
    color: '#ffffff',
  };

  res.json({ success: true, message: newMessage, fogConfig });
});

app.get('/api/messages', (_req, res) => {
  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);
  res.json(sorted);
});

app.post('/api/resonate', (req, res) => {
  const { messageId } = req.body as { messageId: string };

  const targetMessage = messages.find((m) => m.id === messageId);
  if (!targetMessage) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }

  const sameEmotionMessages = messages.filter(
    (m) => m.emotion === targetMessage.emotion && m.id !== messageId
  );

  if (sameEmotionMessages.length === 0) {
    return res.json({ success: false, message: 'No matching message found' });
  }

  const randomIndex = Math.floor(Math.random() * sameEmotionMessages.length);
  const matchedMessage = sameEmotionMessages[randomIndex];

  targetMessage.resonanceCount += 1;

  res.json({ success: true, matchedMessage, targetMessage });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
