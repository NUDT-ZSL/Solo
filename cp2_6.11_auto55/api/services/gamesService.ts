import type { Game, Comment, Rating, SortBy, AddCommentData } from '../types/index.js';
import {
  getGames as storeGetGames,
  getGameById as storeGetGameById,
  updateGame as storeUpdateGame,
  getComments as storeGetComments,
  addComment as storeAddComment,
} from '../store/memoryStore.js';

export const calculateHeat = (game: Game): number => {
  return game.likeCount * 2 + game.commentsCount * 3 + game.ratingsCount * 1;
};

export const getGames = (sortBy: SortBy = 'heat'): Game[] => {
  const games = storeGetGames();
  const sorted = [...games];

  if (sortBy === 'heat') {
    sorted.sort((a, b) => b.heat - a.heat);
  } else if (sortBy === 'rating') {
    sorted.sort((a, b) => b.averageRating - a.averageRating);
  }

  return sorted;
};

export const getGameById = (id: string): Game | undefined => {
  return storeGetGameById(id);
};

export const rateGame = (id: string, userId: string, score: number): Game | undefined => {
  const game = storeGetGameById(id);
  if (!game) return undefined;

  if (score < 1 || score > 5) {
    throw new Error('评分必须在1-5之间');
  }

  const existingIndex = game.ratings.findIndex((r) => r.userId === userId);
  const newRating: Rating = {
    userId,
    score,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    game.ratings[existingIndex] = newRating;
  } else {
    game.ratings.push(newRating);
  }

  game.ratingsCount = game.ratings.length;
  const total = game.ratings.reduce((sum, r) => sum + r.score, 0);
  game.averageRating = Number((total / game.ratings.length).toFixed(1));
  game.heat = calculateHeat(game);

  return storeUpdateGame(id, game);
};

export const toggleLike = (id: string, userId: string): { game: Game; liked: boolean } | undefined => {
  const game = storeGetGameById(id);
  if (!game) return undefined;

  const index = game.likedBy.indexOf(userId);
  let liked: boolean;

  if (index >= 0) {
    game.likedBy.splice(index, 1);
    liked = false;
  } else {
    game.likedBy.push(userId);
    liked = true;
  }

  game.likeCount = game.likedBy.length;
  game.heat = calculateHeat(game);

  const updated = storeUpdateGame(id, game);
  if (!updated) return undefined;

  return { game: updated, liked };
};

export const getComments = (gameId: string): Comment[] => {
  return storeGetComments(gameId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const addComment = (gameId: string, data: AddCommentData): Comment | undefined => {
  const game = storeGetGameById(gameId);
  if (!game) return undefined;

  const comment = storeAddComment(gameId, {
    userId: data.userId,
    userName: data.userName,
    avatar: data.avatar,
    content: data.content,
  });

  return comment;
};

export default {
  calculateHeat,
  getGames,
  getGameById,
  rateGame,
  toggleLike,
  getComments,
  addComment,
};
