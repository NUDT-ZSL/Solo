import express, { Request, Response } from 'express';
import type {
  GenerateCardRequest,
  GenerateCardResponse,
  GetCardResponse,
  GetCardsResponse,
  DeleteCardResponse,
} from './types';
import { cardService } from './services/CardService';

const app = express();
const PORT = 4000;

app.use(express.json({ limit: '50mb' }));
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/api/generate', (req: Request<{}, {}, GenerateCardRequest>, res: Response<GenerateCardResponse>) => {
  const startTime = Date.now();
  try {
    const { poem, themeId, audioBase64, audioMimeType, thumbnailDataUrl } = req.body;

    if (!poem || !poem.lines || poem.lines.length === 0) {
      return res.status(400).json({
        success: false,
        cardId: '',
        shareUrl: '',
      });
    }

    if (!themeId) {
      return res.status(400).json({
        success: false,
        cardId: '',
        shareUrl: '',
      });
    }

    const card = cardService.generateCard({
      poem,
      themeId,
      audioBase64: audioBase64 || null,
      audioMimeType: audioMimeType || 'audio/webm',
      thumbnailDataUrl,
    });

    const shareUrl = `/card/${card.id}`;
    const elapsed = Date.now() - startTime;
    console.log(`[Generate] Card ${card.id} created in ${elapsed}ms`);

    res.json({
      success: true,
      cardId: card.id,
      shareUrl,
    });
  } catch (error) {
    console.error('Error generating card:', error);
    res.status(500).json({
      success: false,
      cardId: '',
      shareUrl: '',
    });
  }
});

app.get('/api/card/:id', (req: Request<{ id: string }>, res: Response<GetCardResponse>) => {
  try {
    const { id } = req.params;
    const card = cardService.getCardById(id);

    if (!card) {
      return res.status(404).json({
        success: false,
        card: null,
      });
    }

    res.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error('Error getting card:', error);
    res.status(500).json({
      success: false,
      card: null,
    });
  }
});

app.get('/api/cards', (_req: Request, res: Response<GetCardsResponse>) => {
  try {
    const cards = cardService.getAllCards(20);
    const total = cardService.getTotalCount();

    res.json({
      success: true,
      cards,
      total,
    });
  } catch (error) {
    console.error('Error getting cards:', error);
    res.status(500).json({
      success: true,
      cards: [],
      total: 0,
    });
  }
});

app.delete('/api/card/:id', (req: Request<{ id: string }>, res: Response<DeleteCardResponse>) => {
  try {
    const { id } = req.params;
    const deleted = cardService.deleteCard(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '卡片不存在',
      });
    }

    res.json({
      success: true,
      message: '卡片已删除',
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({
      success: false,
      message: '删除失败',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`✨ 读诗·流光书签 后端服务启动成功`);
  console.log(`🚀 服务地址: http://localhost:${PORT}`);
  console.log(`📚  API 文档:`);
  console.log(`   POST   /api/generate   - 生成卡片`);
  console.log(`   GET    /api/card/:id   - 获取卡片`);
  console.log(`   GET    /api/cards      - 卡片列表`);
  console.log(`   DELETE /api/card/:id   - 删除卡片`);
});
