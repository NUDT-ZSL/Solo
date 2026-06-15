import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery, runQuery } from '../database';
import { getPlantById } from '../plantIdentify';
import type { Plant } from '../../src/types';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const plants = await allQuery<any>(`
      SELECT 
        id, 
        name, 
        scientific_name as scientificName,
        image,
        description,
        light,
        water,
        temperature,
        soil,
        location,
        added_at as addedAt
      FROM plants 
      ORDER BY added_at DESC
    `);

    res.json({
      success: true,
      plants,
    });
  } catch (error) {
    console.error('Get plants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get plants',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const plant = await getQuery<any>(`
      SELECT 
        id, 
        name, 
        scientific_name as scientificName,
        image,
        description,
        light,
        water,
        temperature,
        soil,
        location,
        added_at as addedAt
      FROM plants 
      WHERE id = ?
    `, [id]);

    if (!plant) {
      return res.status(404).json({
        success: false,
        error: 'Plant not found',
      });
    }

    res.json({
      success: true,
      plant,
    });
  } catch (error) {
    console.error('Get plant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get plant',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { plantId, name, scientificName, image, description, light, water, temperature, soil, location } = req.body;

    let plantData = {
      id: uuidv4(),
      name,
      scientificName,
      image,
      description,
      light,
      water,
      temperature,
      soil,
      location: location || '客厅',
    };

    if (plantId && !name) {
      const templatePlant = getPlantById(plantId);
      if (templatePlant) {
        plantData = {
          ...plantData,
          name: templatePlant.name,
          scientificName: templatePlant.scientificName,
          image: templatePlant.image,
          description: templatePlant.description,
          light: templatePlant.light,
          water: templatePlant.water,
          temperature: templatePlant.temperature,
          soil: templatePlant.soil,
        };
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid plant template ID',
        });
      }
    }

    await runQuery(`
      INSERT INTO plants (id, name, scientific_name, image, description, light, water, temperature, soil, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      plantData.id,
      plantData.name,
      plantData.scientificName,
      plantData.image,
      plantData.description,
      plantData.light,
      plantData.water,
      plantData.temperature,
      plantData.soil,
      plantData.location,
    ]);

    res.json({
      success: true,
      plant: plantData,
    });
  } catch (error) {
    console.error('Add plant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add plant',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, scientificName, image, description, light, water, temperature, soil, location } = req.body;

    const existing = await getQuery<any>('SELECT id FROM plants WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Plant not found',
      });
    }

    await runQuery(`
      UPDATE plants 
      SET name = ?, scientific_name = ?, image = ?, description = ?, 
          light = ?, water = ?, temperature = ?, soil = ?, location = ?
      WHERE id = ?
    `, [name, scientificName, image, description, light, water, temperature, soil, location, id]);

    res.json({
      success: true,
      message: 'Plant updated successfully',
    });
  } catch (error) {
    console.error('Update plant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plant',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await runQuery('DELETE FROM plants WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Plant deleted successfully',
    });
  } catch (error) {
    console.error('Delete plant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete plant',
    });
  }
});

export default router;
