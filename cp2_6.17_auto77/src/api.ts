import type {
  Activity,
  ActivityCreateData,
  Photo,
  Registration,
  RegistrationFormData,
  SearchActivityParams,
  UploadProgress,
  UploadProgressCallback,
} from './types';

const BASE_URL = '/api';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `请求失败：${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData && typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      } catch {
        // 忽略文本解析错误
      }
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const result = (await response.json()) as ApiResponse<T>;
    if (result.code !== undefined && result.code !== 0) {
      throw new Error(result.message || '请求失败');
    }
    return result.data;
  }
  return undefined as unknown as T;
}

export async function createActivity(
  data: ActivityCreateData,
  coverImageFile: File
): Promise<Activity> {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('dateTime', data.dateTime);
  formData.append('location', data.location);
  formData.append('ageGroups', JSON.stringify(data.ageGroups));
  formData.append('capacity', String(data.capacity));
  formData.append('description', data.description);
  formData.append('activityCover', coverImageFile);

  const response = await fetch(`${BASE_URL}/activities`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<Activity>(response);
}

export async function getActivities(): Promise<Activity[]> {
  const response = await fetch(`${BASE_URL}/activities`, {
    method: 'GET',
  });

  return handleResponse<Activity[]>(response);
}

export async function getActivity(id: string): Promise<Activity> {
  const response = await fetch(`${BASE_URL}/activities/${id}`, {
    method: 'GET',
  });

  return handleResponse<Activity>(response);
}

export async function registerActivity(
  activityId: string,
  data: RegistrationFormData
): Promise<Registration> {
  const response = await fetch(`${BASE_URL}/activities/${activityId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Registration>(response);
}

export async function getRegistrations(activityId: string): Promise<Registration[]> {
  const response = await fetch(`${BASE_URL}/activities/${activityId}/registrations`, {
    method: 'GET',
  });

  return handleResponse<Registration[]>(response);
}

export async function exportRegistrationsCSV(activityId: string): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/activities/${activityId}/registrations?format=csv`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    let errorMessage = `导出失败：${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      }
    } catch {
      // 忽略解析错误
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const contentDisposition = response.headers.get('content-disposition');
  let filename = `registrations-${activityId}.csv`;
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
    if (utf8Match && utf8Match[1]) {
      filename = decodeURIComponent(utf8Match[1]);
    } else {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
  }
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function toggleCheckIn(
  activityId: string,
  registrationId: string
): Promise<Registration> {
  const response = await fetch(`${BASE_URL}/activities/${activityId}/checkin`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ registrationId }),
  });

  return handleResponse<Registration>(response);
}

export function uploadPhotos(
  activityId: string,
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<Photo[]> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/activities/${activityId}/photos`);

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        };
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const contentType = xhr.getResponseHeader('content-type');
          if (contentType && contentType.includes('application/json')) {
            const result = JSON.parse(xhr.responseText) as ApiResponse<Photo[]>;
            if (result.code !== undefined && result.code !== 0) {
              reject(new Error(result.message || '上传失败'));
              return;
            }
            resolve(result.data);
          } else {
            resolve([] as Photo[]);
          }
        } catch (error) {
          reject(new Error('响应解析失败'));
        }
      } else {
        let errorMessage = `上传失败：${xhr.status} ${xhr.statusText}`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          if (errorData && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          if (xhr.responseText) {
            errorMessage = xhr.responseText;
          }
        }
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('网络错误，上传失败'));
    };

    xhr.onabort = () => {
      reject(new Error('上传已取消'));
    };

    xhr.send(formData);
  });
}

export async function getPhotos(activityId: string): Promise<Photo[]> {
  const response = await fetch(`${BASE_URL}/activities/${activityId}/photos`, {
    method: 'GET',
  });

  return handleResponse<Photo[]>(response);
}

export async function togglePhotoFavorite(
  activityId: string,
  photoId: string
): Promise<Photo> {
  const response = await fetch(
    `${BASE_URL}/activities/${activityId}/photos/${photoId}/favorite`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return handleResponse<Photo>(response);
}

export async function searchActivities(
  params: SearchActivityParams
): Promise<Activity[]> {
  const queryParams = new URLSearchParams();
  if (params.keyword !== undefined && params.keyword !== null && params.keyword !== '') {
    queryParams.append('keyword', params.keyword);
  }
  if (params.startDate !== undefined && params.startDate !== null && params.startDate !== '') {
    queryParams.append('startDate', params.startDate);
  }
  if (params.endDate !== undefined && params.endDate !== null && params.endDate !== '') {
    queryParams.append('endDate', params.endDate);
  }
  if (params.ageGroup !== undefined && params.ageGroup !== null && params.ageGroup !== '') {
    queryParams.append('ageGroup', params.ageGroup);
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${BASE_URL}/activities/search?${queryString}`
    : `${BASE_URL}/activities/search`;

  const response = await fetch(url, {
    method: 'GET',
  });

  return handleResponse<Activity[]>(response);
}
