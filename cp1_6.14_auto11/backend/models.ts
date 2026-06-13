import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'models.db');

interface CreaseLine {
  id: string;
  start: [number, number];
  end: [number, number];
  type: 'mountain' | 'valley';
  angle: number;
}

interface CreasePattern {
  lines: CreaseLine[];
  vertices: [number, number][];
}

interface FoldStep {
  creaseLineId: string;
  targetAngle: number;
  currentAngle: number;
  timestamp: number;
}

interface OrigamiModel {
  _id?: string;
  id: string;
  name: string;
  steps: FoldStep[];
  creasePattern: CreasePattern;
  createdAt: number;
  updatedAt: number;
}

const db = Datastore.create({
  filename: dbPath,
  autoload: true
});

export const create = async (data: {
  name: string;
  steps: FoldStep[];
  creasePattern: CreasePattern;
}): Promise<OrigamiModel> => {
  const now = Date.now();
  const model: OrigamiModel = {
    id: uuidv4(),
    name: data.name,
    steps: data.steps,
    creasePattern: data.creasePattern,
    createdAt: now,
    updatedAt: now
  };
  
  const result = await db.insert(model);
  return result as OrigamiModel;
};

export const findAll = async (): Promise<OrigamiModel[]> => {
  const results = await db.find({}).sort({ createdAt: -1 }).exec();
  return results as OrigamiModel[];
};

export const findById = async (id: string): Promise<OrigamiModel | null> => {
  const result = await db.findOne({ id });
  return result as OrigamiModel | null;
};

export const update = async (
  id: string,
  data: Partial<OrigamiModel>
): Promise<OrigamiModel | null> => {
  const result = await db.update(
    { id },
    { $set: { ...data, updatedAt: Date.now() } },
    { returnUpdatedDocs: true }
  );
  return (result as any).updatedDocuments?.[0] || null;
};

export const remove = async (id: string): Promise<number> => {
  return await db.remove({ id });
};

export type { OrigamiModel, FoldStep, CreasePattern, CreaseLine };
