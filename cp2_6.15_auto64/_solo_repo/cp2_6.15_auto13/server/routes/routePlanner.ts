import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';

interface Route {
  id: number;
  name: string;
  date: string;
  createdAt: string;
}

interface RoutePoint {
  id: number;
  routeId: number;
  lat: number;
  lng: number;
  name?: string;
  note?: string;
  orderIndex: number;
}

interface RouteWithPoints extends Route {
  points: RoutePoint[];
}

function createRouteRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const routes = db.prepare(`
        SELECT id, name, date, createdAt
        FROM routes
        ORDER BY createdAt DESC
      `).all() as Route[];

      res.json(routes);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const route = db.prepare(`
        SELECT id, name, date, createdAt
        FROM routes
        WHERE id = ?
      `).get(id) as Route | undefined;

      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      const points = db.prepare(`
        SELECT id, routeId, lat, lng, name, note, orderIndex
        FROM route_points
        WHERE routeId = ?
        ORDER BY orderIndex ASC
      `).all(id) as RoutePoint[];

      const routeWithPoints: RouteWithPoints = {
        ...route,
        points,
      };

      res.json(routeWithPoints);
    } catch (error) {
      console.error('Failed to fetch route:', error);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, date } = req.body;

      if (!name || !date) {
        res.status(400).json({ error: 'Name and date are required' });
        return;
      }

      const createdAt = new Date().toISOString();

      const result = db.prepare(`
        INSERT INTO routes (name, date, createdAt)
        VALUES (?, ?, ?)
      `).run(name, date, createdAt);

      const newRoute = db.prepare(`
        SELECT id, name, date, createdAt
        FROM routes
        WHERE id = ?
      `).get(result.lastInsertRowid) as Route;

      res.status(201).json(newRoute);
    } catch (error) {
      console.error('Failed to create route:', error);
      res.status(500).json({ error: 'Failed to create route' });
    }
  });

  router.put('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, date } = req.body;

      const existingRoute = db.prepare(`
        SELECT id FROM routes WHERE id = ?
      `).get(id);

      if (!existingRoute) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      db.prepare(`
        UPDATE routes
        SET name = ?, date = ?
        WHERE id = ?
      `).run(name, date, id);

      const updatedRoute = db.prepare(`
        SELECT id, name, date, createdAt
        FROM routes
        WHERE id = ?
      `).get(id) as Route;

      res.json(updatedRoute);
    } catch (error) {
      console.error('Failed to update route:', error);
      res.status(500).json({ error: 'Failed to update route' });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingRoute = db.prepare(`
        SELECT id FROM routes WHERE id = ?
      `).get(id);

      if (!existingRoute) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      const deleteStmt = db.transaction(() => {
        db.prepare(`
          UPDATE logs SET routeId = NULL WHERE routeId = ?
        `).run(id);

        db.prepare(`
          UPDATE logs SET pointId = NULL WHERE pointId IN (
            SELECT id FROM route_points WHERE routeId = ?
          )
        `).run(id);

        db.prepare(`
          DELETE FROM route_points WHERE routeId = ?
        `).run(id);

        db.prepare(`
          DELETE FROM routes WHERE id = ?
        `).run(id);
      });

      deleteStmt();

      res.json({ message: 'Route deleted successfully' });
    } catch (error) {
      console.error('Failed to delete route:', error);
      res.status(500).json({ error: 'Failed to delete route' });
    }
  });

  router.post('/:id/points', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { lat, lng, name, note, orderIndex } = req.body;

      const existingRoute = db.prepare(`
        SELECT id FROM routes WHERE id = ?
      `).get(id);

      if (!existingRoute) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      if (lat === undefined || lng === undefined || orderIndex === undefined) {
        res.status(400).json({ error: 'lat, lng and orderIndex are required' });
        return;
      }

      const result = db.prepare(`
        INSERT INTO route_points (routeId, lat, lng, name, note, orderIndex)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(Number(id), Number(lat), Number(lng), name || null, note || null, Number(orderIndex));

      const newPoint = db.prepare(`
        SELECT id, routeId, lat, lng, name, note, orderIndex
        FROM route_points
        WHERE id = ?
      `).get(result.lastInsertRowid) as RoutePoint;

      res.status(201).json(newPoint);
    } catch (error) {
      console.error('Failed to add point:', error);
      res.status(500).json({ error: 'Failed to add point' });
    }
  });

  router.put('/:id/points/:pointId', (req: Request, res: Response) => {
    try {
      const { id, pointId } = req.params;
      const { lat, lng, name, note, orderIndex } = req.body;

      const existingPoint = db.prepare(`
        SELECT id, routeId FROM route_points WHERE id = ? AND routeId = ?
      `).get(pointId, id);

      if (!existingPoint) {
        res.status(404).json({ error: 'Point not found' });
        return;
      }

      db.prepare(`
        UPDATE route_points
        SET lat = ?, lng = ?, name = ?, note = ?, orderIndex = ?
        WHERE id = ?
      `).run(
        Number(lat),
        Number(lng),
        name || null,
        note || null,
        Number(orderIndex),
        pointId
      );

      const updatedPoint = db.prepare(`
        SELECT id, routeId, lat, lng, name, note, orderIndex
        FROM route_points
        WHERE id = ?
      `).get(pointId) as RoutePoint;

      res.json(updatedPoint);
    } catch (error) {
      console.error('Failed to update point:', error);
      res.status(500).json({ error: 'Failed to update point' });
    }
  });

  router.delete('/:id/points/:pointId', (req: Request, res: Response) => {
    try {
      const { id, pointId } = req.params;

      const existingPoint = db.prepare(`
        SELECT id, routeId FROM route_points WHERE id = ? AND routeId = ?
      `).get(pointId, id);

      if (!existingPoint) {
        res.status(404).json({ error: 'Point not found' });
        return;
      }

      const deleteStmt = db.transaction(() => {
        db.prepare(`
          UPDATE logs SET pointId = NULL WHERE pointId = ?
        `).run(pointId);

        db.prepare(`
          DELETE FROM route_points WHERE id = ?
        `).run(pointId);
      });

      deleteStmt();

      res.json({ message: 'Point deleted successfully' });
    } catch (error) {
      console.error('Failed to delete point:', error);
      res.status(500).json({ error: 'Failed to delete point' });
    }
  });

  return router;
}

export default createRouteRouter;
