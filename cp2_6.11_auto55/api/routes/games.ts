import { Router } from 'express';
import * as gamesController from '../controllers/gamesController.js';
import * as pdfController from '../controllers/pdfController.js';

const router = Router();

router.get('/', gamesController.getGames);
router.get('/:id', gamesController.getGameById);
router.post('/:id/rating', gamesController.rateGame);
router.post('/:id/like', gamesController.toggleLike);
router.get('/:gameId/comments', gamesController.getComments);
router.post('/:gameId/comments', gamesController.addComment);
router.get('/:id/pdf', pdfController.downloadGamePdf);

export default router;
