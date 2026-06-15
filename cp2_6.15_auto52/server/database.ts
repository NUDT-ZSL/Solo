import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import type { GalleryLayout, LayoutElement, Artwork, Invitation } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'gallery.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

const initDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS gallery_layout (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Main Gallery',
        width INTEGER NOT NULL DEFAULT 600,
        height INTEGER NOT NULL DEFAULT 400,
        elements_json TEXT NOT NULL DEFAULT '[]',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS artwork (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        tags_json TEXT DEFAULT '[]',
        original_url TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL,
        average_color TEXT DEFAULT '#6c63ff',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS invitation (
        id TEXT PRIMARY KEY,
        layout_id TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (layout_id) REFERENCES gallery_layout(id)
      )
    `);

    db.get(
      'SELECT id FROM gallery_layout WHERE id = ?',
      ['default'],
      (err, row) => {
        if (!row) {
          db.run(
            `INSERT INTO gallery_layout (id, name, width, height, elements_json) 
             VALUES (?, ?, ?, ?, ?)`,
            ['default', 'Main Gallery', 600, 400, '[]']
          );
        }
      }
    );
  });
};

export const getLayout = (): Promise<GalleryLayout> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM gallery_layout WHERE id = ?',
      ['default'],
      (err, row: any) => {
        if (err) reject(err);
        else if (!row) reject(new Error('Layout not found'));
        else {
          resolve({
            id: row.id,
            name: row.name,
            width: row.width,
            height: row.height,
            elements: JSON.parse(row.elements_json),
            updatedAt: row.updated_at,
          });
        }
      }
    );
  });
};

export const updateLayout = (
  id: string,
  elements: LayoutElement[]
): Promise<GalleryLayout> => {
  return new Promise((resolve, reject) => {
    const elementsJson = JSON.stringify(elements);
    db.run(
      `UPDATE gallery_layout 
       SET elements_json = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [elementsJson, id],
      function (err) {
        if (err) reject(err);
        else {
          getLayout()
            .then(resolve)
            .catch(reject);
        }
      }
    );
  });
};

export const getArtworks = (): Promise<Artwork[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM artwork ORDER BY uploaded_at DESC', (err, rows: any[]) => {
      if (err) reject(err);
      else {
        resolve(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            tags: JSON.parse(row.tags_json || '[]'),
            originalUrl: row.original_url,
            thumbnailUrl: row.thumbnail_url,
            averageColor: row.average_color,
            uploadedAt: row.uploaded_at,
          }))
        );
      }
    });
  });
};

export const addArtwork = (
  artwork: Omit<Artwork, 'uploadedAt'>
): Promise<Artwork> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO artwork (id, name, description, tags_json, original_url, thumbnail_url, average_color) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        artwork.id,
        artwork.name,
        artwork.description,
        JSON.stringify(artwork.tags),
        artwork.originalUrl,
        artwork.thumbnailUrl,
        artwork.averageColor,
      ],
      function (err) {
        if (err) reject(err);
        else {
          db.get(
            'SELECT * FROM artwork WHERE id = ?',
            [artwork.id],
            (err, row: any) => {
              if (err) reject(err);
              else
                resolve({
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  tags: JSON.parse(row.tags_json || '[]'),
                  originalUrl: row.original_url,
                  thumbnailUrl: row.thumbnail_url,
                  averageColor: row.average_color,
                  uploadedAt: row.uploaded_at,
                });
            }
          );
        }
      }
    );
  });
};

export const addInvitation = (
  invitation: Omit<Invitation, 'createdAt'>
): Promise<Invitation> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO invitation (id, layout_id, email, status) 
       VALUES (?, ?, ?, ?)`,
      [invitation.id, invitation.layoutId || 'default', invitation.email, invitation.status],
      function (err) {
        if (err) reject(err);
        else {
          db.get(
            'SELECT * FROM invitation WHERE id = ?',
            [invitation.id],
            (err, row: any) => {
              if (err) reject(err);
              else
                resolve({
                  id: row.id,
                  email: row.email,
                  status: row.status as 'pending' | 'accepted',
                  createdAt: row.created_at,
                });
            }
          );
        }
      }
    );
  });
};

export default db;
