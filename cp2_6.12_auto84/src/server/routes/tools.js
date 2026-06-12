import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { category, search } = req.query;
  let query = `
    SELECT t.*, u.username as owner_name, u.avatar_url as owner_avatar
    FROM tools t
    LEFT JOIN users u ON t.owner_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    query += ' AND t.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (t.name LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.created_at DESC';

  const tools = db.prepare(query).all(...params);
  res.json(tools);
});

router.get('/:id', (req, res) => {
  const tool = db.prepare(`
    SELECT t.*, u.username as owner_name, u.avatar_url as owner_avatar
    FROM tools t
    LEFT JOIN users u ON t.owner_id = u.id
    WHERE t.id = ?
  `).get(req