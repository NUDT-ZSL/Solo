export interface Hall {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  wallColor: string;
  floorTexture: string;
  connections: HallConnection[];
  artworks: Artwork[];
}

export interface HallConnection {
  targetHallId: string;
  direction: 'north' | 'south' | 'east' | 'west';
  corridorLength: number;
}

export interface Artwork {
  id: string;
  hallId: string;
  title: string;
  artist: string;
  year: number;
  description: string;
  imageUrl: string;
  wall: 'north' | 'south' | 'east' | 'west';
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}
