import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Character {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  skillName: string;
  skillPower: number;
  avatar?: string;
}

interface DiceResult {
  dice: number[];
  total: number;
}

interface CombatLogEntry {
  id: string;
  timestamp: number;
  attacker: string;
  target: string;
  skillName: string;
  diceResult: DiceResult;
  damage: number;
  message: string;
}

interface BattleRecord {
  id: string;
  startTime: number;
  endTime?: number;
  playerTeam: Character[];
  enemyTeam: Character[];
  logs: CombatLogEntry[];
  winner?: 'player' | 'enemy';
}

const presetCharacters: Character[] = [
  {
    id: 'warrior',
    name: '狂战士',
    maxHp: 120,
    currentHp: 120,
    attack: 15,
    skillName: '重击',
    skillPower: 1.5,
  },
  {
    id: 'mage',
    name: '火焰法师',
    maxHp: 80,
    currentHp: 80,
    attack: 10,
    skillName: '火球术',
    skillPower: 2.0,
  },
  {
    id: 'archer',
    name: '精灵射手',
    maxHp: 90,
    currentHp: 90,
    attack: 12,
    skillName: '穿透箭',
    skillPower: 1.8,
  },
  {
    id: 'healer',
    name: '神圣牧师',
    maxHp: 70,
    currentHp: 70,
    attack: 8,
    skillName: '圣光打击',
    skillPower: 1.2,
  },
  {
    id: 'rogue',
    name: '暗影刺客',
    maxHp: 85,
    currentHp: 85,
    attack: 18,
    skillName: '背刺',
    skillPower: 2.2,
  },
  {
    id: 'knight',
    name: '圣骑士',
    maxHp: 150,
    currentHp: 150,
    attack: 10,
    skillName: '审判',
    skillPower: 1.4,
  },
];

const battleRecords: BattleRecord[] = [];

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/characters', (req: Request, res: Response<Character[]>) => {
  res.json(presetCharacters);
});

app.post('/api/battle/records', (req: Request, res: Response) => {
  try {
    const record: BattleRecord = {
      ...req.body,
      id: uuidv4(),
    };
    battleRecords.unshift(record);
    res.json({ success: true, recordId: record.id });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save battle record' });
  }
});

app.get('/api/battle/records', (req: Request, res: Response<BattleRecord[]>) => {
  res.json(battleRecords);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
