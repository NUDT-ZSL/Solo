export interface Icon {
  id: string;
  name: string;
  paths: string[];
  viewBox: string;
}

export interface GenerateResponse {
  icons: Icon[];
}
