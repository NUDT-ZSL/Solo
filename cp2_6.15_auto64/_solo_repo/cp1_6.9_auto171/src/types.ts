export interface PlanetData {
  name: string;
  nameCN: string;
  radiusRatio: number;
  orbitRadiusRatio: number;
  orbitPeriodRatio: number;
  rotationPeriodRatio: number;
  color: string;
  initialAngle: number;
  isSun?: boolean;
  rotationPeriodDays: number;
  orbitPeriodYears: number;
}

export interface OrbitProps {
  orbitRadius: number;
  color: string;
  highlighted: boolean;
}

export interface PlanetProps {
  data: PlanetData;
  onClick: (data: PlanetData) => void;
  isFocused: boolean;
  isHovered: boolean;
  setHovered: (name: string | null) => void;
}

export interface InfoPanelProps {
  planet: PlanetData | null;
}
