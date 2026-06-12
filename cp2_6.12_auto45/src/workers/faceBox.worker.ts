export interface FaceBoxDrawData {
  photoWidth: number;
  photoHeight: number;
  faceBox: { x: number; y: number; width: number; height: number };
  score: number;
  clientWidth: number;
  clientHeight: number;
}

export interface DrawResult {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

self.onmessage = (e: MessageEvent<FaceBoxDrawData>) => {
  const { photoWidth, photoHeight, faceBox, score, clientWidth, clientHeight } = e.data;

  const scaleX = clientWidth / photoWidth;
  const scaleY = clientHeight / photoHeight;

  const result: DrawResult = {
    x: faceBox.x * scaleX,
    y: faceBox.y * scaleY,
    width: faceBox.width * scaleX,
    height: faceBox.height * scaleY,
    score,
  };

  self.postMessage(result);
};

export {};
