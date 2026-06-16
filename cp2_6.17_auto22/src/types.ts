export interface Artist {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  genre: string[];
}

export interface Song {
  id: string;
  artistId: string;
  title: string;
  lyrics: string;
  genre: string[];
  createdAt: string;
}

export interface TourCity {
  id: string;
  artistId: string;
  name: string;
  lat: number;
  lng: number;
  popularity: number;
  date: string;
}

export interface Favorite {
  id: string;
  artistId: string;
  createdAt: string;
}

export interface City {
  name: string;
  lat: number;
  lng: number;
}

export interface Database {
  artists: Artist[];
  songs: Song[];
  tourCities: TourCity[];
  favorites: Favorite[];
  cities: City[];
}

export interface SearchResult {
  type: 'artist' | 'song';
  id: string;
  name: string;
  extra?: string;
}
