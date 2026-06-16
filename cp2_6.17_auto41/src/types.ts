export interface Score {
  id: string;
  title: string;
  composer: string;
  year?: number;
  pages?: number;
  price: number;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  scoreId: string;
  createdAt: string;
}
