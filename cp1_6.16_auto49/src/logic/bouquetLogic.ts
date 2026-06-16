import type {
  SelectedFlower,
  PriceBreakdown,
  OrderData,
  ValidationResult,
} from '../types';
import { WRAPPING_OPTIONS } from '../types';

export function validateColorHarmony(flowers: SelectedFlower[]): ValidationResult {
  const redCount = flowers.filter(
    (f) => f.color === 'red' && f.quantity > 0
  ).length;
  const greenCount = flowers.filter(
    (f) => f.color === 'green' && f.quantity > 0
  ).length;

  if (redCount > 0 && greenCount > 0 && redCount + greenCount > 3) {
    return {
      valid: false,
      message: '红绿搭配超过3种花材，建议减少搭配以保持协调',
    };
  }

  return { valid: true, message: '' };
}

export function calculatePrice(
  flowers: SelectedFlower[],
  wrappingColor: string
): PriceBreakdown {
  const flowerTotal = flowers.reduce(
    (sum, f) => sum + f.price * f.quantity,
    0
  );

  const wrapping = WRAPPING_OPTIONS.find((w) => w.color === wrappingColor);
  const wrappingFee = wrapping ? wrapping.price : 0;

  return {
    flowerTotal,
    wrappingFee,
    total: flowerTotal + wrappingFee,
  };
}

export function assembleOrder(
  flowers: SelectedFlower[],
  screenshot: string,
  wrappingColor: string,
  message: string
): OrderData {
  const priceBreakdown = calculatePrice(flowers, wrappingColor);

  return {
    flowers: flowers.map((f) => ({
      id: f.id,
      name: f.name,
      price: f.price,
      quantity: f.quantity,
    })),
    screenshot,
    totalPrice: priceBreakdown.total,
    message,
    wrappingColor,
  };
}

export function generateDefaultLayout(
  flowers: SelectedFlower[],
  canvasWidth: number,
  canvasHeight: number
): SelectedFlower[] {
  const centerX = canvasWidth / 2;
  const bottomY = canvasHeight - 40;
  const spacing = Math.min(80, canvasWidth / (flowers.length + 1));

  return flowers.map((f, i) => {
    const offset = (i - (flowers.length - 1) / 2) * spacing;
    return {
      ...f,
      layoutX: centerX + offset + (Math.random() - 0.5) * 15,
      layoutY: bottomY - 80 - Math.random() * 60,
      rotation: (Math.random() - 0.5) * 0.4,
    };
  });
}
