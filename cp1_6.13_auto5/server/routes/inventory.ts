import { Router } from 'express'
import { inventoryDb, type Ingredient } from '../database.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const inventory = await inventoryDb.find<Ingredient>({}).sort({ name: 1 })
    res.json(inventory)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { quantity }: { quantity: number } = req.body

    const existing = await inventoryDb.findOne<Ingredient>({ id })
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' })
    }

    const newQuantity = Math.max(0, quantity)
    const updated = await inventoryDb.update<Ingredient>(
      { id },
      { $set: { quantity: newQuantity } },
      { returnUpdatedDocs: true }
    )

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inventory' })
  }
})

export default router
