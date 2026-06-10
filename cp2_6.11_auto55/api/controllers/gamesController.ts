import type { Request, Response } from 'express';
import type { ApiResponse, AddCommentData } from '../types/index.js';
import * as gamesService from '../services/gamesService.js';

export const getGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const sortBy = (req.query.sortBy as 'heat' | 'rating') || 'heat';
    const games = gamesService.getGames(sortBy);

    const response: ApiResponse<typeof games> = {
      success: true,
      data: games,
      message: '获取游戏列表成功',
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '获取游戏列表失败',
    };
    res.status(500).json(response);
  }
};

export const getGameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const game = gamesService.getGameById(id);

    if (!game) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '游戏不存在',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<typeof game> = {
      success: true,
      data: game,
      message: '获取游戏详情成功',
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '获取游戏详情失败',
    };
    res.status(500).json(response);
  }
};

export const rateGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, score } = req.body as { userId: string; score: number };

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '缺少用户ID',
      };
      res.status(400).json(response);
      return;
    }

    if (typeof score !== 'number' || score < 1 || score > 5) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '评分必须在1-5之间',
      };
      res.status(400).json(response);
      return;
    }

    const game = gamesService.rateGame(id, userId, score);

    if (!game) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '游戏不存在',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<typeof game> = {
      success: true,
      data: game,
      message: '评分成功',
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '评分失败',
    };
    res.status(500).json(response);
  }
};

export const toggleLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '缺少用户ID',
      };
      res.status(400).json(response);
      return;
    }

    const result = gamesService.toggleLike(id, userId);

    if (!result) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '游戏不存在',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ game: typeof result.game; liked: boolean }> = {
      success: true,
      data: result,
      message: result.liked ? '点赞成功' : '取消点赞成功',
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '操作失败',
    };
    res.status(500).json(response);
  }
};

export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;

    const game = gamesService.getGameById(gameId);
    if (!game) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '游戏不存在',
      };
      res.status(404).json(response);
      return;
    }

    const comments = gamesService.getComments(gameId);

    const response: ApiResponse<typeof comments> = {
      success: true,
      data: comments,
      message: '获取评论成功',
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '获取评论失败',
    };
    res.status(500).json(response);
  }
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const data = req.body as AddCommentData;

    if (!data.userId || !data.userName || !data.content) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '缺少必要字段',
      };
      res.status(400).json(response);
      return;
    }

    const game = gamesService.getGameById(gameId);
    if (!game) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '游戏不存在',
      };
      res.status(404).json(response);
      return;
    }

    const comment = gamesService.addComment(gameId, data);

    if (!comment) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '添加评论失败',
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<typeof comment> = {
      success: true,
      data: comment,
      message: '评论成功',
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : '评论失败',
    };
    res.status(500).json(response);
  }
};

export default {
  getGames,
  getGameById,
  rateGame,
  toggleLike,
  getComments,
  addComment,
};
