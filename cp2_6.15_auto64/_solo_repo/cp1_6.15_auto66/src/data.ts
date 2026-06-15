import { v4 as uuidv4 } from 'uuid';

export interface Track {
  id: string;
  name: string;
  duration: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  year: number;
  primaryColor: string;
  gradientColors: [string, string];
  tracks: Track[];
}

const createTracks = (names: string[], durations: number[]): Track[] =>
  names.map((name, idx) => ({
    id: uuidv4(),
    name,
    duration: durations[idx]
  }));

export const albums: Album[] = [
  {
    id: uuidv4(),
    name: 'Midnight Echoes',
    artist: 'Lunar Drift',
    year: 2024,
    primaryColor: '#1A1A2E',
    gradientColors: ['#1A1A2E', '#16213E'],
    tracks: createTracks(
      ['Velvet Night', 'Starlight Serenade', 'Moonfall', 'Eclipse of Souls', 'Nocturnal Whispers', 'Dawn of Silence'],
      [245, 312, 278, 198, 356, 289]
    )
  },
  {
    id: uuidv4(),
    name: 'Neon Horizons',
    artist: 'Synthwave Collective',
    year: 2023,
    primaryColor: '#2E1A3E',
    gradientColors: ['#2E1A3E', '#4A1A5E'],
    tracks: createTracks(
      ['Cyber Sunset', 'Digital Dreams', 'Chrome Hearts', 'Laser Boulevard', 'Retro Future', 'Electric Pulse', 'Neon Rain'],
      [223, 298, 267, 341, 276, 302, 245]
    )
  },
  {
    id: uuidv4(),
    name: 'Ocean Depths',
    artist: 'Blue Abyss',
    year: 2024,
    primaryColor: '#1A3E4E',
    gradientColors: ['#1A3E4E', '#1A4E6E'],
    tracks: createTracks(
      ['Tidal Wave', 'Coral Garden', 'Deep Blue', 'Whale Song', 'Sunken City', 'Bioluminescence', 'Surface Tension', 'Undertow'],
      [312, 278, 345, 223, 298, 267, 301, 256]
    )
  },
  {
    id: uuidv4(),
    name: 'Desert Wind',
    artist: 'Sand Walker',
    year: 2022,
    primaryColor: '#3E2E1A',
    gradientColors: ['#3E2E1A', '#5E3E1A'],
    tracks: createTracks(
      ['Sandstorm', 'Oasis', 'Nomad Trail', 'Dune Rider', 'Ancient Ruins', 'Mirage', 'Golden Hour'],
      [287, 234, 321, 276, 309, 256, 298]
    )
  },
  {
    id: uuidv4(),
    name: 'Forest Whispers',
    artist: 'Green Canopy',
    year: 2023,
    primaryColor: '#1A3E2E',
    gradientColors: ['#1A3E2E', '#1A5E3E'],
    tracks: createTracks(
      ['Mossy Path', 'Canopy Light', 'Stream Song', 'Wildflower', 'Mushroom Circle', 'Bird Call', 'Tree Spirit', 'Morning Dew'],
      [267, 234, 298, 256, 312, 278, 301, 245]
    )
  },
  {
    id: uuidv4(),
    name: 'Urban Frequencies',
    artist: 'City Pulse',
    year: 2024,
    primaryColor: '#3E1A2E',
    gradientColors: ['#3E1A2E', '#5E1A3E'],
    tracks: createTracks(
      ['Subway Rhythm', 'Skyscraper', 'Neon Alley', 'Rooftop View', 'Midnight Taxi', 'Street Art', 'Factory Beat', 'City Lights'],
      [245, 298, 276, 321, 234, 287, 309, 267]
    )
  }
];

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
