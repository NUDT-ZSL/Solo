import express, { Request, Response } from 'express';
import cors from 'cors';
import { pets, applications, breeds } from './data';
import type { Pet, PetStatus, AdoptionApplication } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let petsData: Pet[] = JSON.parse(JSON.stringify(pets));
let applicationsData: AdoptionApplication[] = JSON.parse(JSON.stringify(applications));

app.get('/api/breeds', (_req: Request, res: Response) => {
  res.json(breeds);
});

app.get('/api/pets', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = (req.query.search as string)?.toLowerCase() || '';
  const breed = (req.query.breed as string) || '';

  let filtered = petsData;
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.breed.toLowerCase().includes(search)
    );
  }
  if (breed) {
    filtered = filtered.filter((p) => p.breed === breed);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);
  const hasMore = start + limit < total;

  setTimeout(() => {
    res.json({ data, total, page, hasMore });
  }, 150);
});

app.get('/api/pets/:id', (req: Request, res: Response) => {
  const pet = petsData.find((p) => p.id === req.params.id);
  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  res.json(pet);
});

app.post('/api/pets', (req: Request, res: Response) => {
  const body = req.body as Partial<Pet>;
  const newPet: Pet = {
    id: Math.random().toString(36).substring(2, 10),
    name: body.name || '',
    breed: body.breed || '',
    age: body.age || 0,
    description: body.description || '',
    healthNotes: body.healthNotes,
    photos: body.photos || [],
    status: (body.status as PetStatus) || 'pending',
    createdAt: new Date().toISOString(),
    adoptionHistory: [],
  };
  petsData.unshift(newPet);
  res.status(201).json(newPet);
});

app.put('/api/pets/:id', (req: Request, res: Response) => {
  const index = petsData.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  petsData[index] = { ...petsData[index], ...req.body };
  res.json(petsData[index]);
});

app.delete('/api/pets/:id', (req: Request, res: Response) => {
  const index = petsData.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  petsData.splice(index, 1);
  res.json({ success: true });
});

app.get('/api/applications', (req: Request, res: Response) => {
  const status = req.query.status as string;
  let result = applicationsData;
  if (status) {
    result = result.filter((a) => a.status === status);
  }
  res.json(result);
});

app.patch('/api/applications/:id/status', (req: Request, res: Response) => {
  const index = applicationsData.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const newStatus = req.body.status as PetStatus;
  applicationsData[index].status = newStatus;

  const petIndex = petsData.findIndex((p) => p.id === applicationsData[index].petId);
  if (petIndex !== -1) {
    petsData[petIndex].status = newStatus;
  }

  res.json(applicationsData[index]);
});

app.listen(PORT, () => {
  console.log(`PetPal server running at http://localhost:${PORT}`);
});
