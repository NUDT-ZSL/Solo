import type { CoffeeBean, RoastBatch, RoastLevel, FilterOptions, InventoryAlert, CreateBatchRequest } from '../types';

export class BeanManager {
  private static readonly INVENTORY_THRESHOLD = 10;

  static calculateRoastScore(
    inputTemp: number,
    outputTemp: number,
    roastLevel: RoastLevel,
    roastDuration: number
  ): number {
    const tempDiff = inputTemp - outputTemp;
    let tempDiffScore = 0;
    if (tempDiff >= 60 && tempDiff <= 100) {
      tempDiffScore = 4;
    } else if (tempDiff >= 40 && tempDiff < 60) {
      tempDiffScore = 3;
    } else if (tempDiff >= 100 && tempDiff <= 120) {
      tempDiffScore = 3;
    } else {
      tempDiffScore = 2;
    }

    let tempRangeScore = 0;
    if (inputTemp >= 180 && inputTemp <= 240 && outputTemp >= 100 && outputTemp <= 140) {
      tempRangeScore = 3;
    } else if (inputTemp >= 160 && inputTemp <= 260 && outputTemp >= 90 && outputTemp <= 150) {
      tempRangeScore = 2;
    } else {
      tempRangeScore = 1;
    }

    let levelMatchScore = 0;
    const optimalDiffs: Record<RoastLevel, [number, number]> = {
      light: [50, 70],
      medium: [70, 90],
      dark: [90, 110],
    };
    const [minOpt, maxOpt] = optimalDiffs[roastLevel];
    if (tempDiff >= minOpt && tempDiff <= maxOpt) {
      levelMatchScore = 3;
    } else if (tempDiff >= minOpt - 10 && tempDiff <= maxOpt + 10) {
      levelMatchScore = 2;
    } else {
      levelMatchScore = 1;
    }

    const totalScore = Math.min(10, Math.max(0, tempDiffScore + tempRangeScore + levelMatchScore));
    return Math.round(totalScore);
  }

  static filterBatches(
    batches: RoastBatch[],
    filters: FilterOptions
  ): RoastBatch[] {
    const startTime = performance.now();
    let result = [...batches];

    if (filters.roastLevels.length > 0) {
      result = result.filter(b => filters.roastLevels.includes(b.roastLevel));
    }

    if (filters.startDate) {
      result = result.filter(b => b.roastDate >= filters.startDate!);
    }

    if (filters.endDate) {
      result = result.filter(b => b.roastDate <= filters.endDate!);
    }

    if (filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase().trim();
      result = result.filter(b =>
        b.beanName.toLowerCase().includes(term) ||
        b.flavorNotes.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => new Date(b.roastDate).getTime() - new Date(a.roastDate).getTime());

    const endTime = performance.now();
    console.log(`Filter completed in ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }

  static getInventoryAlerts(beans: CoffeeBean[]): InventoryAlert[] {
    return beans
      .filter(bean => bean.stockKg < this.INVENTORY_THRESHOLD)
      .map(bean => ({
        beanId: bean.id,
        beanName: bean.name,
        currentStock: bean.stockKg,
        threshold: this.INVENTORY_THRESHOLD,
      }));
  }

  static checkInventory(beans: CoffeeBean[]): Array<{
    beanId: string;
    beanName: string;
    currentStock: number;
    threshold: number;
    message: string;
  }> {
    const alerts: Array<{
      beanId: string;
      beanName: string;
      currentStock: number;
      threshold: number;
      message: string;
    }> = [];

    for (const bean of beans) {
      if (bean.stockKg < this.INVENTORY_THRESHOLD) {
        alerts.push({
          beanId: bean.id,
          beanName: bean.name,
          currentStock: bean.stockKg,
          threshold: this.INVENTORY_THRESHOLD,
          message: `库存不足：${bean.name}（剩余 ${bean.stockKg.toFixed(1)}kg，低于 ${this.INVENTORY_THRESHOLD}kg 预警阈值）`,
        });
      }
    }

    return alerts;
  }

  static matchBeanById(beans: CoffeeBean[], beanId: string): CoffeeBean | undefined {
    return beans.find(bean => bean.id === beanId);
  }

  static deductStock(beans: CoffeeBean[], beanId: string, amount: number): CoffeeBean[] {
    return beans.map(bean =>
      bean.id === beanId
        ? { ...bean, stockKg: Math.max(0, bean.stockKg - amount) }
        : bean
    );
  }

  static prepareBatchRequest(data: Omit<CreateBatchRequest, 'roastDuration'> & { roastDuration?: number }): CreateBatchRequest {
    return {
      ...data,
      roastDuration: data.roastDuration || Math.floor(Math.random() * 300) + 600,
    };
  }

  static getRoastLevelLabel(level: RoastLevel): string {
    const labels: Record<RoastLevel, string> = {
      light: '浅烘',
      medium: '中烘',
      dark: '深烘',
    };
    return labels[level];
  }
}
