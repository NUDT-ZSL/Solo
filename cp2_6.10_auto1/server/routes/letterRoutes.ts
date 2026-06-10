import { Router } from 'express'
import * as letterController from '../controllers/letterController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/', authMiddleware, letterController.createLetter)
router.get('/:id', authMiddleware, letterController.getLetter)
router.get('/', authMiddleware, letterController.listLetters)
router.delete('/:id', authMiddleware, letterController.deleteLetter)
router.get('/time/server', letterController.serverTime)

export default router
