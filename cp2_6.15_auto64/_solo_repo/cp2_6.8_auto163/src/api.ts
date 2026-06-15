import axios from 'axios';
import { EditParams } from './types';

const api = axios.create({
  baseURL: '/api',
});

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.image_id;
};

export const processPreview = async (
  imageId: string,
  params: EditParams
): Promise<string> => {
  const response = await api.post('/process', {
    image_id: imageId,
    params: {
      filter_strength: params.filterStrength,
      crop_ratio: params.cropRatio,
      brightness: params.brightness,
      contrast: params.contrast,
    },
  }, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};

export const downloadBatch = async (
  imageParamsList: { image_id: string; filename: string; params: EditParams }[]
): Promise<Blob> => {
  const response = await api.post('/export', {
    images: imageParamsList.map(item => ({
      image_id: item.image_id,
      filename: item.filename,
      params: {
        filter_strength: item.params.filterStrength,
        crop_ratio: item.params.cropRatio,
        brightness: item.params.brightness,
        contrast: item.params.contrast,
      },
    })),
  }, {
    responseType: 'blob',
  });
  return response.data;
};

export default api;
