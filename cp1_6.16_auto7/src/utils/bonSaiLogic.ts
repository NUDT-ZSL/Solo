export interface PotMaterial {
  type: 'ceramic' | 'glass' | 'plastic';
  color: string;
  colorName: string;
  gradientStart: string;
  gradientEnd: string;
  width: number;
  height: number;
}

export interface Plant {
  type: string;
  name: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  height: number;
  width: number;
}

export interface Decoration {
  id: string;
  type: 'stone' | 'moss' | 'doll';
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BonsaiState {
  pot: PotMaterial | null;
  plant: Plant | null;
  decorations: Decoration[];
}

export interface CardData {
  potInfo: {
    name: string;
    color: string;
    colorCode: string;
    size: string;
    widthCm: string;
    heightCm: string;
  } | null;
  plantInfo: {
    name: string;
    color: string;
    colorCode: string;
    size: string;
    widthCm: string;
    heightCm: string;
  } | null;
  decorations: {
    name: string;
    color: string;
    colorCode: string;
    size: string;
    widthCm: string;
    heightCm: string;
  }[];
  totalSize: string;
}

export function formatColorCode(color: string): string {
  return color.toUpperCase();
}

export function calculatePotDimensions(pot: PotMaterial): { widthCm: string; heightCm: string } {
  const widthCm = (pot.width / 10).toFixed(1);
  const heightCm = (pot.height / 10).toFixed(1);
  return { widthCm, heightCm };
}

export function calculatePlantDimensions(plant: Plant): { heightCm: string; widthCm: string } {
  const heightCm = (plant.height / 10).toFixed(1);
  const widthCm = (plant.width / 10).toFixed(1);
  return { heightCm, widthCm };
}

export function getPotMaterialName(type: string): string {
  const names: Record<string, string> = {
    ceramic: '陶瓷花盆',
    glass: '玻璃花盆',
    plastic: '塑料花盆'
  };
  return names[type] || type;
}

export function generateCardData(state: BonsaiState): CardData {
  let totalHeight = 0;
  let totalWidth = 0;

  const potDims = state.pot ? calculatePotDimensions(state.pot) : null;
  const potInfo = state.pot ? {
    name: getPotMaterialName(state.pot.type),
    color: state.pot.colorName,
    colorCode: formatColorCode(state.pot.color),
    size: `${potDims!.widthCm} × ${potDims!.heightCm} cm`,
    widthCm: `${potDims!.widthCm} cm`,
    heightCm: `${potDims!.heightCm} cm`
  } : null;

  if (state.pot) {
    totalWidth = state.pot.width;
    totalHeight = state.pot.height;
  }

  const plantDims = state.plant ? calculatePlantDimensions(state.plant) : null;
  const plantInfo = state.plant ? {
    name: state.plant.name,
    color: '自然绿',
    colorCode: formatColorCode(state.plant.color),
    size: `${plantDims!.widthCm} × ${plantDims!.heightCm} cm`,
    widthCm: `${plantDims!.widthCm} cm`,
    heightCm: `${plantDims!.heightCm} cm`
  } : null;

  if (state.plant) {
    totalHeight += state.plant.height * 0.7;
    totalWidth = Math.max(totalWidth, state.plant.width);
  }

  const decorations = state.decorations.map(dec => ({
    name: dec.name,
    color: dec.color,
    colorCode: formatColorCode(dec.color),
    size: `${(dec.width / 10).toFixed(1)} × ${(dec.height / 10).toFixed(1)} cm`,
    widthCm: `${(dec.width / 10).toFixed(1)} cm`,
    heightCm: `${(dec.height / 10).toFixed(1)} cm`
  }));

  const totalSize = `${(totalWidth / 10).toFixed(1)} × ${(totalHeight / 10).toFixed(1)} cm`;

  return { potInfo, plantInfo, decorations, totalSize };
}

export function cloneState(state: BonsaiState): BonsaiState {
  return {
    pot: state.pot ? { ...state.pot } : null,
    plant: state.plant ? { ...state.plant } : null,
    decorations: state.decorations.map(d => ({ ...d }))
  };
}

export function statesEqual(a: BonsaiState, b: BonsaiState): boolean {
  if ((a.pot === null) !== (b.pot === null)) return false;
  if (a.pot && b.pot && (a.pot.type !== b.pot.type || a.pot.color !== b.pot.color)) return false;
  
  if ((a.plant === null) !== (b.plant === null)) return false;
  if (a.plant && b.plant && a.plant.type !== b.plant.type) return false;
  
  if (a.decorations.length !== b.decorations.length) return false;
  
  for (let i = 0; i < a.decorations.length; i++) {
    const decA = a.decorations[i];
    const decB = b.decorations[i];
    if (decA.id !== decB.id || 
        decA.type !== decB.type || 
        decA.x !== decB.x || 
        decA.y !== decB.y) {
      return false;
    }
  }
  
  return true;
}
