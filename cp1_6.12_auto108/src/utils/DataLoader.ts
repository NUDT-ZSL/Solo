import axios from 'axios';
import type { LayoutData, LayoutResponse, LightingResult, LightingResponse, LightFixture, TimePreset } from '../types';

const API_BASE = '/api';

export async function fetchLayout(layoutId: string = 'living_40'): Promise<LayoutData> {
  try {
    const response = await axios.get<LayoutResponse>(`${API_BASE}/layout`, {
      params: { id: layoutId }
    });
    
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch layout');
  } catch (error) {
    console.error('Error fetching layout:', error);
    throw error;
  }
}

export async function fetchAvailableLayouts(): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await axios.get<LayoutResponse>(`${API_BASE}/layout`);
    if (response.data.success) {
      return response.data.available_layouts;
    }
    return [];
  } catch (error) {
    console.error('Error fetching layouts:', error);
    return [];
  }
}

export async function calculateLighting(
  lights: LightFixture[],
  layoutId: string,
  timePreset: TimePreset
): Promise<LightingResult> {
  try {
    const response = await axios.post<LightingResponse>(`${API_BASE}/calculate-lighting`, {
      lights,
      layout_id: layoutId,
      time_preset: timePreset
    });
    
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to calculate lighting');
  } catch (error) {
    console.error('Error calculating lighting:', error);
    throw error;
  }
}

export const DataLoader = {
  fetchLayout,
  fetchAvailableLayouts,
  calculateLighting
};

export default DataLoader;
