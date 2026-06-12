import axios from 'axios';

export interface Material {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  favorited: boolean