import { useState, useCallback } from 'react';

export function useBlurUp(thumbnailUrl: string) {
  const blurUrl = thumbnailUrl.replace(/w=\d+/, 'w=20').replace(/h=\d+/, 'h=20');
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);
  return { blurUrl, loaded, onLoad };
}
