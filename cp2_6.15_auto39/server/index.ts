import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import {
  initDatabase,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  aggregateIngredients,
  seedSampleData,
} from './database';
import type { WSMessage, GroceryItem } from '../src/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const groceryLists: Record<string, Record<string, GroceryItem>> = {};

app.get('/api/recipes', (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const recipes = getAllRecipes(search);
    res.json(recipes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取菜谱失败' });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const recipe = getRecipeById(id);
    if (!recipe) return res.status(404).json({ error: '菜谱不存在' });
    res.json(recipe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取菜谱失败' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const recipe = createRecipe(req.body);
    res.status(201).json(recipe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建菜谱失败' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const recipe = updateRecipe(id, req.body);
    if (!recipe) return res.status(404).json({ error: '菜谱不存在' });
    res.json(recipe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '更新菜谱失败' });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    deleteRecipe(id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '删除菜谱失败' });
  }
});

app.patch('/api/recipes/:id/rating', (req, res) => {
  try {
    const id = Number(req.params.id);
    const recipe = updateRecipe(id, { rating: req.body.rating });
    if (!recipe) return res.status(404).json({ error: '菜谱不存在' });
    res.json(recipe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '评分失败' });
  }
});

app.patch('/api/recipes/:id/favorite', (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = getRecipeById(id);
    if (!current) return res.status(404).json({ error: '菜谱不存在' });
    const recipe = updateRecipe(id, { isFavorite: !current.isFavorite });
    res.json(recipe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '操作失败' });
  }
});

app.post('/api/grocery/aggregate', (req, res) => {
  try {
    const { recipeIds, scales } = req.body;
    const list = aggregateIngredients(recipeIds || [], scales || {});
    const items: GroceryItem[] = list.map((item, idx) => ({
      id: `${item.name}-${idx}`,
      ...item,
      checked: false,
    }));
    const listId = `list-${Date.now()}`;
    const itemMap: Record<string, GroceryItem> = {};
    items.forEach((it) => (itemMap[it.id] = it));
    groceryLists[listId] = itemMap;
    res.json({ listId, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '生成清单失败' });
  }
});

const clients = new Map<WebSocket, { id: string; listId?: string }>();

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).slice(2, 10);
  clients.set(ws, { id: clientId });

  ws.on('message', (raw) => {
    try {
      const msg: WSMessage = JSON.parse(raw.toString());
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      if (msg.type === 'join') {
        clientInfo.listId = msg.listId;
        if (!groceryLists[msg.listId]) {
          groceryLists[msg.listId] = {};
        }
        ws.send(
          JSON.stringify({
            type: 'init',
            listId: msg.listId,
            items: Object.values(groceryLists[msg.listId]),
            userId: clientId,
          }),
        );
        return;
      }

      if (!groceryLists[msg.listId]) return;
      const list = groceryLists[msg.listId];

      if (msg.type === 'item-update' && msg.itemId && msg.changes) {
        if (list[msg.itemId]) {
          list[msg.itemId] = { ...list[msg.itemId], ...msg.changes };
        }
        for (const [client, info] of clients.entries()) {
          if (client !== ws && info.listId === msg.listId) {
            client.send(
              JSON.stringify({
                type: 'peer-update',
                itemId: msg.itemId,
                changes: msg.changes,
                userId: clientId,
              }),
            );
          }
        }
      }

      if (msg.type === 'item-toggle' && msg.itemId !== undefined && msg.checked !== undefined) {
        if (list[msg.itemId]) {
          list[msg.itemId] = { ...list[msg.itemId], checked: msg.checked };
        }
        for (const [client, info] of clients.entries()) {
          if (client !== ws && info.listId === msg.listId) {
            client.send(
              JSON.stringify({
                type: 'peer-toggle',
                itemId: msg.itemId,
                checked: msg.checked,
                userId: clientId,
              }),
            );
          }
        }
      }
    } catch (e) {
      console.error('WS error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const PORT = 3001;
try {
  initDatabase();
  seedSampleData();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (e) {
  console.error('Startup error:', e);
}
