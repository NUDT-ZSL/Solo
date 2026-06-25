export interface Work {
  id: string;
  title: string;
  image: string;
  tags: string[];
  clicks: number;
  totalDuration: number;
  viewCount: number;
  createdAt: number;
}

export interface BarDataItem {
  id: string;
  title: string;
  clicks: number;
  avgDuration: number;
  totalDuration: number;
  tags: string[];
}

export interface LineData {
  labels: string[];
  data: number[];
}

export interface PieData {
  labels: string[];
  data: number[];
}

export interface StatsResponse {
  totalWorks: number;
  totalClicks: number;
  avgDuration: number;
  barData: BarDataItem[];
  lineData: LineData;
  pieData: PieData;
  works: Work[];
}
