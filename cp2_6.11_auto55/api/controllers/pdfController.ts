import type { Request, Response } from 'express';
import * as gamesService from '../services/gamesService.js';
import * as pdfService from '../services/pdfService.js';

export const downloadGamePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const game = gamesService.getGameById(id);
    if (!game) {
      res.status(404).json({
        success: false,
        data: null,
        message: '游戏不存在',
      });
      return;
    }

    const pdfBuffer = await pdfService.generatePdf(game);
    const fileName = encodeURIComponent(`${game.name}-规则书.pdf`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${fileName}`,
    );
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    res.status(200).send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '生成PDF失败',
    });
  }
};

export default {
  downloadGamePdf,
};
