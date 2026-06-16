import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Puzzle {
  id: string;
  artifactName: string;
  artifactType: string;
  correctSequence: number[];
  story: string;
}

interface SolveRequest {
  id: string;
  playerSequence: number[];
}

interface SolveResponse {
  success: boolean;
  reward?: {
    id: string;
    artifactName: string;
    artifactType: string;
    story: string;
  };
}

const puzzlesPath = path.join(__dirname, 'puzzles.json');
const collectionPath = path.join(__dirname, 'collection.json');

const readJsonFile = <T>(filePath: string): T => {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as T;
};

const writeJsonFile = <T>(filePath: string, data: T): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/puzzles/:id', (req, res) => {
  const { id } = req.params;
  try {
    const puzzles = readJsonFile<Puzzle[]>(puzzlesPath);
    const puzzle = puzzles.find((p) => p.id === id);
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }
    res.json(puzzle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read puzzle data' });
  }
});

app.post('/api/puzzles/solve', (req, res) => {
  const { id, playerSequence }: SolveRequest = req.body;
  try {
    const puzzles = readJsonFile<Puzzle[]>(puzzlesPath);
    const puzzle = puzzles.find((p) => p.id === id);
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }

    const success =
      playerSequence.length === puzzle.correctSequence.length &&
      playerSequence.every((val, idx) => val === puzzle.correctSequence[idx]);

    const response: SolveResponse = { success };

    if (success) {
      response.reward = {
        id: puzzle.id,
        artifactName: puzzle.artifactName,
        artifactType: puzzle.artifactType,
        story: puzzle.story,
      };

      const collection = readJsonFile<string[]>(collectionPath);
      if (!collection.includes(puzzle.id)) {
        collection.push(puzzle.id);
        writeJsonFile(collectionPath, collection);
      }
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to solve puzzle' });
  }
});

app.get('/api/collection', (_req, res) => {
  try {
    const collection = readJsonFile<string[]>(collectionPath);
    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read collection' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
