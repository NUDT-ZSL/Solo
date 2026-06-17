export interface ValidateImageResult {
  valid: boolean;
  error?: string;
}

export function validateImage(file: File): ValidateImageResult {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '仅支持 JPG/PNG 格式的图片',
    };
  }

  const maxSize = 3 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: '图片大小不能超过 3MB',
    };
  }

  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export function compressImage(file: File, maxWidth: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let { width, height } = img;

              if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);

              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              resolve(base64);
            } catch (error) {
              reject(new Error('Failed to process image: ' + (error as Error).message));
            }
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        } catch (error) {
          reject(new Error('Failed to create image: ' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    } catch (error) {
      reject(new Error('Compression failed: ' + (error as Error).message));
    }
  });
}
