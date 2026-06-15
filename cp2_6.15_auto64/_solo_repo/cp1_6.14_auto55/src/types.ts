export interface DataPoint {
  time: Date;
  value: number;
  label?: string;
}

export interface Dataset {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  data: DataPoint[];
}
