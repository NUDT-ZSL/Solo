import { Router } from 'express';
import * as pdfController from '../controllers/pdfController.js';

const router = Router();

router.get('/games/:id', pdfController.downloadGamePdf);

export default router;
