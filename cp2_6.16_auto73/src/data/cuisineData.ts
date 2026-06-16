export interface Dish {
  id: string;
  name: string;
  description: string;
  gradient: { from: string; to: string };
  origin: string;
  drinkPairing: string;
  sideDish: string;
}

export interface Region {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  position: { x: number; y: number };
  dishes: Dish[];
}

export interface Pairing {
  id: string;
  items: string[];
  description: string;
}

export const regions: Region[] = [
  {
    id: 'italy',
    name: '意大利',
    nameEn: 'Italy',
    color: '#e63946',
    position: { x: 48, y: 35 },
    dishes: [
      {
        id: 'italy-1',
        name: '玛格丽特