import type { Person, PersonInput } from '@listcollab/shared'
import express, { type Request, type Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import db from '../config/database.js'
import logger from '../logger.js'

type PersonRow = RowDataPacket & Person;

const router = express.Router();

// GET /api/people - Get all people
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.execute<PersonRow[]>('SELECT * FROM people ORDER BY name');
    res.json(rows);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching people')
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// GET /api/people/:id - Get person by ID
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [rows] = await db.execute<PersonRow[]>('SELECT * FROM people WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching person')
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// POST /api/people - Create new person
router.post('/', async (req: Request<Record<string, never>, PersonRow, PersonInput>, res: Response) => {
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO people (name) VALUES (?)',
      [name.trim()]
    );
    
    const [rows] = await db.execute<PersonRow[]>('SELECT * FROM people WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error({ err: error }, 'Error creating person')
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// PUT /api/people/:id - Update person
router.put('/:id', async (req: Request<{ id: string }, PersonRow, PersonInput>, res: Response) => {
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE people SET name = ? WHERE id = ?',
      [name.trim(), req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    const [rows] = await db.execute<PersonRow[]>('SELECT * FROM people WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    logger.error({ err: error }, 'Error updating person')
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// DELETE /api/people/:id - Delete person (and their items)
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [result] = await db.execute<ResultSetHeader>('DELETE FROM people WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting person')
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

export default router
