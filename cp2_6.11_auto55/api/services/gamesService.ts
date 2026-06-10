import type { Game, Comment, Rating, SortBy, AddCommentData } from '../types/index.js';
import {
  getGames as storeGetGames,
  getGamesPaginated as storeGetGamesPaginated,
  getGameById as storeGetGameById,
  updateGame as storeUpdateGame,
  getComments as storeGetComments,
  addComment as storeAddComment,
  addOrUpdateRating as storeAddOrUpdateRating,
  toggleLike as storeToggleLike,
} from '../store/memoryStore.js';

export const calculateHeat = (game: Game): number => {
  return game.likeCount * 2 + game.commentsCount * 3 + game.ratingsCount * 1;
};

export const getGames = (
  sortBy: SortBy = 'heat',
  page: number = 1,
  limit: number = 20,
): { games: Game[]; total: number; page: number; limit: number } => {
  const { games, total } = storeGetGamesPaginated(page, limit);
  const sorted = [...games];

  if (sortBy === 'heat') {
    sorted.sort((a, b) => b.heat - a.heat);
  } else if (sortBy === 'rating') {
    sorted.sort((a, b) => b.averageRating - a.averageRating);
  }

  return { games: sorted, total, page, limit };
};

export const getGameById = (id: string): Game | undefined => {
  return storeGetGameById(id);
};

export const rateGame = (
  id: string,
  userId: string,
  score: number,
): { game: Game; ratings: Rating[] } | undefined => {
  const game = storeGetGameById(id);
  if (!game) return undefined;

  if (score < 1 || score > 5) {
    throw new Error('评分必须在1-5之间');
  }

  const ratings = storeAddOrUpdateRating(id, userId, score);
  const updatedGame = storeGetGameById(id);

  return { game: updatedGame!, ratings };
};

export const toggleLike = (id: string, userId: string): { game: Game; liked: boolean } | undefined => {
  const game = storeGetGameById(id);
  if (!game) return undefined;

  const liked = storeToggleLike(id, userId);
  const updatedGame = storeGetGameById(id);

  return { game: updatedGame!, liked };
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
