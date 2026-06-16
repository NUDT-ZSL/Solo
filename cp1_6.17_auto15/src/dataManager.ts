export interface StockDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  stockIndex: number;
  dayIndex: number;
}

export interface Stock {
  code: string;
  name: string;
  data: StockDataPoint[];
  initialPrice: number;
  latestPrice: number;
  highPrice: number;
  lowPrice: number;
  avgVolume: number;
  changePercent: number;
  changeAmount: number;
}

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  maxVolume?: number;
  stockIndices?: number[];
}

export class DataManager {
  private stocks: Stock[] = [];
  private allDataPoints: StockDataPoint[] = [];
  private stockCount: number;
  private daysCount: number;

  constructor(stockCount: number = 30, daysCount: number = 60) {
    this.stockCount = stockCount;
    this.daysCount = daysCount;
    this.generateMockData();
  }

  private generateMockData(): void {
    this.stocks = [];
    this.allDataPoints = [];

    const stockPrefixes = ['SH', 'SZ', 'HK'];
    const industryNames = ['科技', '金融', '医疗', '能源', '消费', '制造', '地产', '通信'];

    for (let i = 0; i < this.stockCount; i++) {
      const prefix = stockPrefixes[i % stockPrefixes.length];
      const code = `${prefix}${String(600000 + i * 3 + Math.floor(Math.random() * 100)).padStart(6, '0')}`;
      const name = industryNames[i % industryNames.length] + `股份${i + 1}`;

      const initialPrice = 10 + Math.random() * 90;
      let currentPrice = initialPrice;
      let highPrice = initialPrice;
      let lowPrice = initialPrice;
      let totalVolume = 0;

      const data: StockDataPoint[] = [];
      const trend = (Math.random() - 0.5) * 0.015;
      const volatility = 0.015 + Math.random() * 0.03;

      for (let d = 0; d < this.daysCount; d++) {
        const dailyDrift = trend + (Math.random() - 0.5) * volatility;
        currentPrice = currentPrice * (1 + dailyDrift);
        currentPrice = Math.max(1, currentPrice);

        highPrice = Math.max(highPrice, currentPrice);
        lowPrice = Math.min(lowPrice, currentPrice);

        const baseVolume = 1000000 + Math.random() * 9000000;
        const volumeMultiplier = 0.6 + Math.random() * 1.2 + Math.abs(dailyDrift) * 20;
        const volume = Math.round(baseVolume * volumeMultiplier);
        totalVolume += volume;

        const point: StockDataPoint = {
          timestamp: Date.now() - (this.daysCount - d) * 24 * 60 * 60 * 1000,
          price: parseFloat(currentPrice.toFixed(2)),
          volume,
          stockIndex: i,
          dayIndex: d
        };

        data.push(point);
        this.allDataPoints.push(point);
      }

      const latestPrice = data[data.length - 1].price;
      const changeAmount = latestPrice - initialPrice;
      const changePercent = (changeAmount / initialPrice) * 100;

      this.stocks.push({
        code,
        name,
        data,
        initialPrice: parseFloat(initialPrice.toFixed(2)),
        latestPrice: parseFloat(latestPrice.toFixed(2)),
        highPrice: parseFloat(highPrice.toFixed(2)),
        lowPrice: parseFloat(lowPrice.toFixed(2)),
        avgVolume: Math.round(totalVolume / this.daysCount),
        changePercent: parseFloat(changePercent.toFixed(2)),
        changeAmount: parseFloat(changeAmount.toFixed(2))
      });
    }
  }

  getStocks(): Stock[] {
    return this.stocks;
  }

  getStock(index: number): Stock | undefined {
    return this.stocks[index];
  }

  getAllDataPoints(): StockDataPoint[] {
    return this.allDataPoints;
  }

  getStockCount(): number {
    return this.stockCount;
  }

  getDaysCount(): number {
    return this.daysCount;
  }

  getFilteredData(options: FilterOptions): StockDataPoint[] {
    return this.allDataPoints.filter(point => {
      if (options.minPrice !== undefined && point.price < options.minPrice) return false;
      if (options.maxPrice !== undefined && point.price > options.maxPrice) return false;
      if (options.minVolume !== undefined && point.volume < options.minVolume) return false;
      if (options.maxVolume !== undefined && point.volume > options.maxVolume) return false;
      if (options.stockIndices !== undefined && !options.stockIndices.includes(point.stockIndex)) return false;
      return true;
    });
  }

  getStockData(stockIndex: number): StockDataPoint[] {
    return this.stocks[stockIndex]?.data || [];
  }

  getPriceRange(): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    for (const point of this.allDataPoints) {
      min = Math.min(min, point.price);
      max = Math.max(max, point.price);
    }
    return { min, max };
  }

  getVolumeRange(): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    for (const point of this.allDataPoints) {
      min = Math.min(min, point.volume);
      max = Math.max(max, point.volume);
    }
    return { min, max };
  }

  computeCorrelation(stockIdxA: number, stockIdxB: number): number {
    const dataA = this.stocks[stockIdxA]?.data;
    const dataB = this.stocks[stockIdxB]?.data;
    if (!dataA || !dataB || dataA.length !== dataB.length) return 0;

    const n = dataA.length;
    let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;

    for (let i = 0; i < n; i++) {
      const a = dataA[i].price;
      const b = dataB[i].price;
      sumA += a;
      sumB += b;
      sumAB += a * b;
      sumA2 += a * a;
      sumB2 += b * b;
    }

    const numerator = n * sumAB - sumA * sumB;
    const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  getMarketTrend(): 'bullish' | 'bearish' | 'neutral' {
    let totalChange = 0;
    for (const stock of this.stocks) {
      totalChange += stock.changePercent;
    }
    const avgChange = totalChange / this.stocks.length;
    if (avgChange > 2) return 'bullish';
    if (avgChange < -2) return 'bearish';
    return 'neutral';
  }
}
