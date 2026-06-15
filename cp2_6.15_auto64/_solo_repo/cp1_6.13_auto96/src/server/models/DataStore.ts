import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../../data');

class DataStore {
  private db: Datastore;

  constructor() {
    this.db = Datastore.create({
      filename: path.join(dataDir, 'assets.db'),
      autoload: true,
    });
  }

  async findAll(searchQuery?: string): Promise<Asset[]> {
    let query = {};
    if (searchQuery) {
      const regex = new RegExp(searchQuery, 'i');
      query = {
        $or: [
          { name: regex },
          { tags: { $in: [regex] } }
        ]
      };
    }
    const assets = await this.db.find<Asset>(query).sort({ createdAt: -1 });
    return assets;
  }

  async findById(id: string): Promise<Asset | null> {
    return this.db.findOne<Asset>({ _id: id });
  }

  async findByAuthor(authorId: string): Promise<Asset[]> {
    return this.db.find<Asset>({ authorId }).sort({ createdAt: -1 });
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    const now = Date.now();
    const asset: Asset = {
      ...dto,
      _id: uuidv4(),
      authorId: 'seller-001',
      favorites: 0,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.db.insert(asset);
    return result as unknown as Asset;
  }

  async update(id: string, dto: UpdateAssetDto): Promise<Asset | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: Asset = {
      ...existing,
      ...dto,
      updatedAt: Date.now(),
    };
    await this.db.update({ _id: id }, { $set: dto });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.remove({ _id: id }, {});
    return result > 0;
  }

  async toggleFavorite(id: string): Promise<{ favorites: number; isFavorited: boolean } | null> {
    const asset = await this.findById(id);
    if (!asset) return null;

    const isFavorited = !asset.isFavorited;
    const favorites = isFavorited ? asset.favorites + 1 : Math.max(0, asset.favorites - 1);

    await this.db.update(
      { _id: id },
      { $set: { favorites, isFavorited } }
    );

    return { favorites, isFavorited };
  }

  async count(): Promise<number> {
    return this.db.count({});
  }

  async insertMany(assets: Asset[]): Promise<void> {
    await this.db.insert(assets);
  }
}

export const dataStore = new DataStore();
