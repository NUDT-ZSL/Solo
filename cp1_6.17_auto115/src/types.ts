export interface Brand {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  headingFont: string;
  bodyFont: string;
  spacingUnit: number;
  createdAt: number;
  updatedAt: number;
}

export const HEADING_FONTS: string[] = [
  'Playfair Display',
  'Roboto',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Poppins',
  'Merriweather',
  'Oswald'
];

export const SPACING_OPTIONS: number[] = [4, 8, 16];
