import type {
  Plant,
  PlantLog,
  ScheduleItem,
  CareAdvice,
  PlantFormData,
  LogFormData,
  ApiResponse
} from './types';

class PlantManager {
  private baseUrl = '/api';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPlants(): Promise<Plant[]> {
    const response = await this.request<Plant[]>('/plants');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  async getPlant(id: number): Promise<Plant | null> {
    const response = await this.request<Plant>(`/plants/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async createPlant(data: PlantFormData): Promise<Plant | null> {
    const response = await this.request<Plant>('/plants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async updatePlant(id: number, data: PlantFormData): Promise<Plant | null> {
    const response = await this.request<Plant>(`/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async deletePlant(id: number): Promise<boolean> {
    const response = await this.request<{ deleted: boolean }>(`/plants/${id}`, {
      method: 'DELETE',
    });
    return response.success === true;
  }

  async getPlantLogs(plantId: number, days: number = 30): Promise<PlantLog[]> {
    const response = await this.request<PlantLog[]>(
      `/plants/${plantId}/logs?days=${days}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  async recordLog(plantId: number, data: LogFormData): Promise<PlantLog | null> {
    const response = await this.request<PlantLog>(`/plants/${plantId}/logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async getSchedule(plantId?: number): Promise<ScheduleItem[]> {
    const endpoint = plantId ? `/plants/${plantId}/schedule` : '/schedule';
    const response = await this.request<ScheduleItem[]>(endpoint);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  async getCareAdvice(plantId: number): Promise<CareAdvice | null> {
    const response = await this.request<CareAdvice>(`/plants/${plantId}/advice`);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  getLastWateredDays(logs: PlantLog[]): number {
    const wateredLogs = logs.filter(log => log.watered);
    if (wateredLogs.length === 0) return -1;
    
    const todayStr = this.getTodayDate();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    
    const lastWaterStr = wateredLogs[0].date;
    const [ly, lm, ld] = lastWaterStr.split('-').map(Number);
    const lastWaterDate = new Date(ly, lm - 1, ld);
    
    const diffTime = todayDate.getTime() - lastWaterDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getWaterStatusColor(days: number): string {
    if (days < 0 || days === 0) return '#4caf50';
    if (days <= 3) return '#ff9800';
    return '#f44336';
  }

  private getLocalDateParts(date: Date): { year: number; month: number; day: number; weekday: number } {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    });
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    parts.forEach(p => { partMap[p.type] = p.value; });
    const weekdayMap: Record<string, number> = {
      '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0
    };
    return {
      year: parseInt(partMap.year, 10),
      month: parseInt(partMap.month, 10) - 1,
      day: parseInt(partMap.day, 10),
      weekday: weekdayMap[partMap.weekday || '周日'] ?? 0
    };
  }

  formatDate(date: Date): string {
    const { year, month, day } = this.getLocalDateParts(date);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  getTodayDate(): string {
    return this.formatDate(new Date());
  }

  getNextNDays(n: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(this.formatDate(date));
    }
    return dates;
  }

  getDateLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const { weekday } = this.getLocalDateParts(date);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return `周${days[weekday]} ${m}/${d}`;
  }

  isWeekend(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const { weekday } = this.getLocalDateParts(date);
    return weekday === 0 || weekday === 6;
  }

  isToday(dateStr: string): boolean {
    return dateStr === this.getTodayDate();
  }
}

export const plantManager = new PlantManager();
export default PlantManager;
