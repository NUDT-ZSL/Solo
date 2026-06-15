import { useMemo } from 'react';
import {
  useParamStore,
  FOCAL_MIN,
  FOCAL_MAX,
  APERTURE_MIN,
  APERTURE_MAX,
  APERTURE_DEFAULT,
} from '../../store/paramStore';

export interface RenderData {
  blurRadius: number;
  sceneScale: number;
  fieldOfView: number;
  cameraOffset: { x: number; y: number };
  foregroundScale: number;
  backgroundScale: number;
  exposureMultiplier: number;
}

export const useSceneRenderer = (): RenderData => {
  const aperture = useParamStore((state) => state.aperture);
  const focalLength = useParamStore((state) => state.focalLength);
  const shutter = useParamStore((state) => state.shutter);

  return useMemo(() => {
    const focalRatio = (focalLength - FOCAL_MIN) / (FOCAL_MAX - FOCAL_MIN);
    const focalT = Math.max(0, Math.min(1, focalRatio));

    const apertureRatio = (APERTURE_MAX - aperture) / (APERTURE_MAX - APERTURE_MIN);
    const apertureT = Math.max(0, Math.min(1, apertureRatio));

    const blurRadius = Math.pow(apertureT, 1.8) * 14;

    const baseScale = 1;
    const maxZoom = 2.4;
    const sceneScale = baseScale + (maxZoom - baseScale) * focalT;

    const minFov = 12;
    const maxFov = 75;
    const fieldOfView = maxFov - (maxFov - minFov) * focalT;

    const maxOffsetX = 45;
    const maxOffsetY = 30;
    const cameraOffset = {
      x: (focalT - 0.5) * -maxOffsetX * 0.6,
      y: (focalT - 0.5) * -maxOffsetY * 0.4,
    };

    const foregroundScale = 1 + focalT * 0.55;
    const backgroundScale = 1 - focalT * 0.3;

    const shutterValues: Record<string, number> = {
      '1/1000s': 0.5,
      '1/500s': 0.6,
      '1/250s': 0.72,
      '1/125s': 0.86,
      '1/60s': 1.0,
      '1/30s': 1.18,
      '1/15s': 1.38,
      '1/8s': 1.62,
      '1/4s': 1.88,
      '1/2s': 2.18,
      '1s': 2.5,
    };
    const baseExposure = shutterValues[shutter] ?? 1;

    const apertureEv = Math.log2(aperture / APERTURE_DEFAULT);
    const exposureMultiplier = Math.max(0.4, Math.min(2.2, baseExposure * (1 + apertureEv * 0.35)));

    return {
      blurRadius,
      sceneScale,
      fieldOfView,
      cameraOffset,
      foregroundScale,
      backgroundScale,
      exposureMultiplier,
    };
  }, [aperture, focalLength, shutter]);
};
