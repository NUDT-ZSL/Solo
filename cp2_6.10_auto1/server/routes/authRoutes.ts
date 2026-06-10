import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/me', authMiddleware, authController.me)
router.post('/logout', authMiddleware, authController.logout)
router.get('/time', authController.serverTime)

export default router
