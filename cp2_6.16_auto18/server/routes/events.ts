import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery, runQuery } from '../database';
import type { CareEvent } from '../../src/types';

const router = Router();

router.get('/plant/:plantId', async (req, res) => {
  try {
    const { plantId } = req.params;

    const events = await allQuery<any>(`
      SELECT 
        id, 
        plant_id as plantId,
        type,
        date,
        note
      FROM care_events 
      WHERE plant_id = ?
      ORDER BY date DESC
    `, [plantId]);

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events',
    });
  }
});

router.post('/plant/:plantId', async (req, res) => {
  try {
    const { plantId } = req.params;
    const { type, date, note } = req.body;

    if (!type || !date) {
      return res.status(400).json({
        success: false,
        error: 'Type and date are required',
      });
    }

    const plantExists = await getQuery<any>('SELECT id FROM plants WHERE id = ?', [plantId]);
    if (!plantExists) {
      return res.status(404).json({
        success: false,
        error: 'Plant not found',
      });
    }

    const eventId = uuidv4();

    await runQuery(`
      INSERT INTO care_events (id, plant_id, type, date, note)
      VALUES (?, ?, ?, ?, ?)
    `, [eventId, plantId, type, date, note || null]);

    const event = await getQuery<any>(`
      SELECT 
        id, 
        plant_id as plantId,
        type,
        date,
        note
      FROM care_events 
      WHERE id = ?
    `, [eventId]);

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add event',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, date, note } = req.body;

    const existing = await getQuery<any>('SELECT id FROM care_events WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    await runQuery(`
      UPDATE care_events 
      SET type = ?, date = ?, note = ?
      WHERE id = ?
    `, [type, date, note || null, id]);

    const event = await getQuery<any>(`
      SELECT 
        id, 
        plant_id as plantId,
        type,
        date,
        note
      FROM care_events 
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await runQuery('DELETE FROM care_events WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
    });
  }
});

export default router;
