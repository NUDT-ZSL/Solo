import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const db = new Database(path.join(__dirname, 'recipe-lab.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    match_score INTEGER NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    required_ingredients TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cooking_logs (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    match_score INTEGER NOT NULL,
    notes TEXT,
    rating INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const seedIngredients =