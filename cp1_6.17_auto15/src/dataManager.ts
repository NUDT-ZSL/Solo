/**
 * ============================================================
 *  数据管理器模块
 * ============================================================
 *
 * 【职责】
 *   - 生成模拟股票历史数据 (30只股票 × 60个交易日 = 1800个数据点)
 *   - 提供数据查询、过滤、统计接口
 *   - 提供价格相关性计算 (供力场模块调用)
 *
 * 【数据规模】
 *   - 股票数量:       30 只
 *   - 每只交易日数:   60 天
 *   - 总数据点数:     1800 个
 *   - 数据维度:       时间戳 / 价格 / 成交量 / 股票索引 / 交易日索引
 *
 * 【对外接口】
 *   - getStocks()           获取全部股票对象
 *   - getStock(index)       获取单只股票详情
 *   - getAllDataPoints()    获取全部1800个数据点 (供粒子系统调用)
 *   - getFilteredData(opts) 按价格/成交量/股票索引过滤数据
 *   - getStockData(idx)     获取单只股票的60天数据
 *   - getPriceRange()       价格范围 (供粒子系统坐标映射)
 *   - getVolumeRange()      成交量范围 (供粒子系统坐标映射)
 *   - computeCorrelation(a, b)  计算两只股票价格皮尔逊相关系数 (供力场模块调用)
 *   - getMarketTrend()      市场整体趋势判断
 *
 * 【被依赖】
 *   - particleSystem.ts → 读取数据点、价格/成交量范围
 *   - forceField.ts    → 计算价格相关性
 *   - main.ts          → 股票详情、趋势判断
 * ============================================================
 */

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
