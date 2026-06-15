import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export interface Pet {
  id: string;
  name: string;
  type: 'cat' | 'dog' | 'dragon';
  level: number;
  hunger: number;
  happiness: number;
  energy: number;
  isSick: boolean;
  evolved: boolean;
  ownerId: string;
  createdAt: number;
}

interface SocialPet extends Pet {
  ownerName: string;
}

const userPets: Pet[] = [];

const ownerNames = ['小明', '小红', '阿强', '小美', '大龙', '小云'];
const petNames = ['咪咪', '旺财', '小火龙', '球球', '豆豆', '花花', '毛毛', '布丁'];
const petTypes: ('cat' | 'dog' | 'dragon')[] = ['cat', 'dog', 'dragon'];

function generateSocialPets(): SocialPet[] {
  const count = 3 + Math.floor(Math.random() * 3);
  const pets: SocialPet[] = [];
  for (let i = 0; i < count; i++) {
    const type = petTypes[Math.floor(Math.random() * petTypes.length)];
    const level = 1 + Math.floor(Math.random() * 8);
    pets.push({
      id: uuidv4(),
      name: petNames[Math.floor(Math.random() * petNames.length)],
      type,
      level,
      hunger: 20 + Math.floor(Math.random() * 80),
      happiness: 20 + Math.floor(Math.random() * 80),
      energy: 20 + Math.floor(Math.random() * 80),
      isSick: false,
      evolved: level >= 5,
      ownerId: uuidv4(),
      ownerName: ownerNames[Math.floor(Math.random() * ownerNames.length)],
      createdAt: Date.now() - Math.random() * 86400000,
    });
  }
  return pets;
}

function checkSick(pet: Pet): Pet {
  const isSick = pet.hunger <= 0 || pet.happiness <= 0 || pet.energy <= 0;
  return { ...pet, isSick };
}

function checkLevelUp(pet: Pet): Pet {
  const avgStatus = (pet.hunger + pet.happiness + pet.energy) / 3;
  if (avgStatus >= 80 && pet.level < 10) {
    const newLevel = pet.level + 1;
    return { ...pet, level: newLevel, evolved: newLevel >= 5 };
  }
  return pet;
}

app.get('/api/pets', (_req: Request, res: Response) => {
  res.json(userPets);
});

app.post('/api/pets', (req: Request, res: Response) => {
  const { name, type } = req.body;
  const newPet: Pet = {
    id: uuidv4(),
    name: name || getDefaultName(type),
    type,
    level: 1,
    hunger: 80,
    happiness: 80,
    energy: 80,
    isSick: false,
    evolved: false,
    ownerId: 'local-user',
    createdAt: Date.now(),
  };
  userPets.push(newPet);
  res.status(201).json(newPet);
});

function getDefaultName(type: string): string {
  switch (type) {
    case 'cat': return '咪咪';
    case 'dog': return '旺财';
    case 'dragon': return '小火龙';
    default: return '小宠物';
  }
}

app.post('/api/pets/:id/interact', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;
  const petIndex = userPets.findIndex((p) => p.id === id);
  if (petIndex === -1) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  let pet = { ...userPets[petIndex] };
  switch (action) {
    case 'feed':
      pet.hunger = Math.min(100, pet.hunger + 20);
      break;
    case 'play':
      pet.happiness = Math.min(100, pet.happiness + 15);
      pet.energy = Math.max(0, pet.energy - 5);
      break;
    case 'rest':
      pet.energy = Math.min(100, pet.energy + 30);
      break;
    default:
      return res.status(400).json({ error: '无效的交互类型' });
  }
  pet = checkSick(pet);
  pet = checkLevelUp(pet);
  userPets[petIndex] = pet;
  res.json(pet);
});

app.post('/api/pets/:id/decay', (req: Request, res: Response) => {
  const { id } = req.params;
  const petIndex = userPets.findIndex((p) => p.id === id);
  if (petIndex === -1) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  const { hungerDecay = 0, happinessDecay = 0, energyDecay = 0 } = req.body;
  let pet = { ...userPets[petIndex] };
  pet.hunger = Math.max(0, pet.hunger - hungerDecay);
  pet.happiness = Math.max(0, pet.happiness - happinessDecay);
  pet.energy = Math.max(0, pet.energy - energyDecay);
  pet = checkSick(pet);
  userPets[petIndex] = pet;
  res.json(pet);
});

app.get('/api/social', (_req: Request, res: Response) => {
  res.json(generateSocialPets());
});

app.post('/api/social/:id/pat', (req: Request, res: Response) => {
  const { id } = req.params;
  const { myPetId } = req.body;
  let myPetUpdate: Pet | null = null;
  if (myPetId) {
    const myPetIndex = userPets.findIndex((p) => p.id === myPetId);
    if (myPetIndex !== -1) {
      let pet = { ...userPets[myPetIndex] };
      pet.happiness = Math.min(100, pet.happiness + 5);
      pet = checkSick(pet);
      pet = checkLevelUp(pet);
      userPets[myPetIndex] = pet;
      myPetUpdate = pet;
    }
  }
  res.json({ success: true, targetHappiness: 100, myPet: myPetUpdate });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
