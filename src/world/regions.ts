export type Weather = 'none' | 'rain' | 'ash' | 'snow' | 'spores' | 'mist' | 'leaves' | 'motes' | 'bubbles' | 'embers' | 'petals' | 'pages' | 'stars' | 'void';
export type TileStyle = 'stone' | 'root' | 'fungal' | 'brick' | 'crystal' | 'metal' | 'book' | 'thorn' | 'coral' | 'marble' | 'garden' | 'engine' | 'void' | 'wood';
export type Ambience = 'wind' | 'drip' | 'machinery' | 'water' | 'choir' | 'hum' | 'fire' | 'leaves' | 'void';

export interface RegionPalette {
  sky0: string;
  sky1: string;
  far: string;
  mid: string;
  near: string;
  tile: string;
  tileHi: string;
  tileDark: string;
  accent: string;
  fog: string;
  ambient: string;
  /** 0..1 how dark the lightmap is when no lights are present. */
  darkness: number;
}

export interface MusicTheme {
  /** MIDI root note. */
  root: number;
  scale: number[];
  bpm: number;
  /** Chord degrees progression (scale indices). */
  prog: number[];
  lead: 'piano' | 'strings' | 'bell' | 'flute' | 'choir' | 'harp' | 'glass' | 'organ';
  pad: 'strings' | 'choir' | 'organ' | 'drone' | 'glass';
  perc: 0 | 1 | 2;
  /** Melodic density 0..1 */
  density: number;
}

export interface RegionDef {
  id: string;
  name: string;
  sub: string;
  palette: RegionPalette;
  weather: Weather;
  style: TileStyle;
  bg: string;
  ambience: Ambience;
  music: MusicTheme;
  /** Map tint. */
  mapColor: string;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const HARM_MINOR = [0, 2, 3, 5, 7, 8, 11];
const WHOLE = [0, 2, 4, 6, 8, 10];
const PENTA_MINOR = [0, 3, 5, 7, 10];

export const REGIONS: RegionDef[] = [
  {
    id: 'th', name: 'The Threshold', sub: 'Where the surface forgets itself',
    palette: { sky0: '#141d2c', sky1: '#5d7697', far: '#4b6282', mid: '#33445e', near: '#1a2436', tile: '#3d4b62', tileHi: '#d4deef', tileDark: '#0a0e16', accent: '#eef4ff', fog: 'rgba(170,195,230,0.16)', ambient: '#a8bede', darkness: 0.16 },
    weather: 'snow', style: 'stone', bg: 'ruins', ambience: 'wind', mapColor: '#8a93a8',
    music: { root: 50, scale: MINOR, bpm: 62, prog: [0, 5, 3, 4], lead: 'piano', pad: 'strings', perc: 0, density: 0.35 },
  },
  {
    id: 'lw', name: 'Lanternwake', sub: 'The last village that remembers',
    palette: { sky0: '#24160f', sky1: '#8e5c38', far: '#714b33', mid: '#4c3324', near: '#22150d', tile: '#4c3a2e', tileHi: '#f4cc92', tileDark: '#0f0905', accent: '#ffd890', fog: 'rgba(255,200,130,0.14)', ambient: '#ffd6a0', darkness: 0.12 },
    weather: 'motes', style: 'wood', bg: 'village', ambience: 'fire', mapColor: '#d8a86a',
    music: { root: 53, scale: MAJOR, bpm: 70, prog: [0, 3, 5, 4], lead: 'harp', pad: 'strings', perc: 0, density: 0.45 },
  },
  {
    id: 'mg', name: 'Mourning Grove', sub: 'A forest that grew downward to grieve',
    palette: { sky0: '#0b2622', sky1: '#3c9c86', far: '#2f7e6e', mid: '#1f5a4e', near: '#0c2a24', tile: '#2a4a3e', tileHi: '#b4ecc0', tileDark: '#04100c', accent: '#d2ffb8', fog: 'rgba(150,240,200,0.16)', ambient: '#a8f0c8', darkness: 0.1 },
    weather: 'leaves', style: 'root', bg: 'forest', ambience: 'leaves', mapColor: '#7fa06a',
    music: { root: 52, scale: DORIAN, bpm: 66, prog: [0, 3, 6, 4], lead: 'flute', pad: 'strings', perc: 0, density: 0.4 },
  },
  {
    id: 'gs', name: 'Gloamspore Warrens', sub: 'The fungus dreams for those who cannot',
    palette: { sky0: '#1e122a', sky1: '#8a5aa2', far: '#6c4886', mid: '#4a305e', near: '#22142e', tile: '#3e2a4c', tileHi: '#f4c0ff', tileDark: '#0e0618', accent: '#ffc6f2', fog: 'rgba(240,170,255,0.15)', ambient: '#e8b8f8', darkness: 0.18 },
    weather: 'spores', style: 'fungal', bg: 'fungal', ambience: 'drip', mapColor: '#b07ac8',
    music: { root: 51, scale: PHRYGIAN, bpm: 74, prog: [0, 1, 5, 4], lead: 'glass', pad: 'drone', perc: 1, density: 0.5 },
  },
  {
    id: 'dc', name: 'The Drowned City', sub: 'Every clock stopped at the same hour',
    palette: { sky0: '#0c1a34', sky1: '#4f80bf', far: '#3c68a4', mid: '#294a7c', near: '#101c38', tile: '#2c4064', tileHi: '#c4e0ff', tileDark: '#060c1a', accent: '#dcf0ff', fog: 'rgba(150,200,255,0.16)', ambient: '#a8d0ff', darkness: 0.12 },
    weather: 'rain', style: 'brick', bg: 'city', ambience: 'water', mapColor: '#5fa8c0',
    music: { root: 48, scale: MINOR, bpm: 58, prog: [0, 5, 2, 6], lead: 'bell', pad: 'choir', perc: 0, density: 0.3 },
  },
  {
    id: 'lc', name: 'Lumen Caverns', sub: 'Light grows here like moss',
    palette: { sky0: '#081226', sky1: '#3a6ca4', far: '#2c568a', mid: '#1e3c64', near: '#0a162e', tile: '#22364e', tileHi: '#b8ecff', tileDark: '#040a16', accent: '#ccf8ff', fog: 'rgba(150,220,255,0.14)', ambient: '#a8e0ff', darkness: 0.36 },
    weather: 'motes', style: 'crystal', bg: 'crystal', ambience: 'hum', mapColor: '#7ac8f0',
    music: { root: 55, scale: LYDIAN, bpm: 64, prog: [0, 1, 4, 3], lead: 'glass', pad: 'glass', perc: 0, density: 0.35 },
  },
  {
    id: 'af', name: 'Ashen Foundry', sub: 'The fires were never told to stop',
    palette: { sky0: '#260c06', sky1: '#a64c2a', far: '#7c3c24', mid: '#54271a', near: '#240f08', tile: '#443028', tileHi: '#ffb888', tileDark: '#100604', accent: '#ffc888', fog: 'rgba(255,140,80,0.16)', ambient: '#ffaa7a', darkness: 0.16 },
    weather: 'embers', style: 'metal', bg: 'foundry', ambience: 'machinery', mapColor: '#d8704a',
    music: { root: 45, scale: HARM_MINOR, bpm: 96, prog: [0, 5, 4, 4], lead: 'organ', pad: 'drone', perc: 2, density: 0.55 },
  },
  {
    id: 'sa', name: 'The Sunken Archive', sub: 'Every word ever written, slowly drowning',
    palette: { sky0: '#201a10', sky1: '#8c7c52', far: '#6e6040', mid: '#4a3e2a', near: '#201a10', tile: '#42382a', tileHi: '#f4e0a8', tileDark: '#0e0a05', accent: '#fff2c4', fog: 'rgba(240,220,160,0.14)', ambient: '#f0dca8', darkness: 0.2 },
    weather: 'pages', style: 'book', bg: 'library', ambience: 'drip', mapColor: '#c8b070',
    music: { root: 50, scale: DORIAN, bpm: 60, prog: [0, 4, 5, 3], lead: 'piano', pad: 'strings', perc: 0, density: 0.42 },
  },
  {
    id: 'tc', name: 'Thorn Chapel', sub: 'They prayed until the thorns answered',
    palette: { sky0: '#260a12', sky1: '#a44c5c', far: '#823a4a', mid: '#5a2634', near: '#280e16', tile: '#44262e', tileHi: '#ffb8c6', tileDark: '#100408', accent: '#ffc6ce', fog: 'rgba(255,150,170,0.14)', ambient: '#f8b0c0', darkness: 0.18 },
    weather: 'ash', style: 'thorn', bg: 'chapel', ambience: 'choir', mapColor: '#c05a70',
    music: { root: 49, scale: HARM_MINOR, bpm: 68, prog: [0, 3, 4, 0], lead: 'choir', pad: 'organ', perc: 0, density: 0.4 },
  },
  {
    id: 'br', name: 'The Black Reservoir', sub: 'A sea that never saw a sky',
    palette: { sky0: '#03101a', sky1: '#2c6c7a', far: '#215664', mid: '#163e4a', near: '#061820', tile: '#1a2e38', tileHi: '#98e8e6', tileDark: '#020a0e', accent: '#88fff2', fog: 'rgba(110,210,220,0.15)', ambient: '#80d8dc', darkness: 0.3 },
    weather: 'mist', style: 'coral', bg: 'sea', ambience: 'water', mapColor: '#3a8090',
    music: { root: 43, scale: PENTA_MINOR, bpm: 52, prog: [0, 3, 2, 4], lead: 'harp', pad: 'drone', perc: 0, density: 0.25 },
  },
  {
    id: 'so', name: 'Starwell Observatory', sub: 'They watched a sky they could no longer see',
    palette: { sky0: '#080c24', sky1: '#4c5cac', far: '#3c4a92', mid: '#2a3468', near: '#0e1438', tile: '#2e3462', tileHi: '#d8deff', tileDark: '#06081a', accent: '#f4f6ff', fog: 'rgba(180,190,255,0.14)', ambient: '#b8c2ff', darkness: 0.12 },
    weather: 'stars', style: 'marble', bg: 'observatory', ambience: 'wind', mapColor: '#9aa4f0',
    music: { root: 57, scale: LYDIAN, bpm: 72, prog: [0, 4, 1, 5], lead: 'bell', pad: 'choir', perc: 0, density: 0.45 },
  },
  {
    id: 'vg', name: 'The Veiled Garden', sub: 'Beautiful, because someone refused to let it die',
    palette: { sky0: '#0e241c', sky1: '#6aaa92', far: '#548c78', mid: '#3a6656', near: '#142e22', tile: '#2e4a3e', tileHi: '#ffe4f2', tileDark: '#06120c', accent: '#ffe4f6', fog: 'rgba(250,210,235,0.15)', ambient: '#f4d0e6', darkness: 0.1 },
    weather: 'petals', style: 'garden', bg: 'garden', ambience: 'leaves', mapColor: '#e0a8c8',
    music: { root: 54, scale: MAJOR, bpm: 66, prog: [0, 5, 3, 4], lead: 'strings', pad: 'choir', perc: 0, density: 0.45 },
  },
  {
    id: 'he', name: 'The Silent Engine', sub: 'The heart that kept the dream turning',
    palette: { sky0: '#141218', sky1: '#6c6272', far: '#56525e', mid: '#3a3844', near: '#16141a', tile: '#3c3846', tileHi: '#eedcb4', tileDark: '#08070a', accent: '#ffe4a8', fog: 'rgba(230,210,170,0.13)', ambient: '#e0d0aa', darkness: 0.22 },
    weather: 'embers', style: 'engine', bg: 'engine', ambience: 'machinery', mapColor: '#b0a080',
    music: { root: 46, scale: WHOLE, bpm: 84, prog: [0, 2, 1, 3], lead: 'organ', pad: 'drone', perc: 2, density: 0.5 },
  },
  {
    id: 'ab', name: 'The Abyss', sub: 'Where the dreamer sleeps',
    palette: { sky0: '#040208', sky1: '#2c1c44', far: '#251838', mid: '#190f28', near: '#07040e', tile: '#1e162c', tileHi: '#b898ee', tileDark: '#020104', accent: '#dcbcff', fog: 'rgba(170,120,240,0.14)', ambient: '#b090e0', darkness: 0.46 },
    weather: 'void', style: 'void', bg: 'abyss', ambience: 'void', mapColor: '#7a5aa8',
    music: { root: 41, scale: PHRYGIAN, bpm: 50, prog: [0, 1, 0, 6], lead: 'choir', pad: 'drone', perc: 0, density: 0.25 },
  },
  {
    id: 'eh', name: 'Hall of Echoes', sub: 'Memories that refuse to stay defeated',
    palette: { sky0: '#120e24', sky1: '#6c5c9e', far: '#584c82', mid: '#3a325c', near: '#16122c', tile: '#302c4a', tileHi: '#ece0ff', tileDark: '#06050e', accent: '#f4ecff', fog: 'rgba(210,190,255,0.14)', ambient: '#d0c0f4', darkness: 0.12 },
    weather: 'motes', style: 'marble', bg: 'observatory', ambience: 'choir', mapColor: '#c0b0e8',
    music: { root: 52, scale: HARM_MINOR, bpm: 80, prog: [0, 5, 3, 4], lead: 'strings', pad: 'choir', perc: 1, density: 0.5 },
  },
];

export const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));

export function region(id: string): RegionDef {
  return REGION_BY_ID.get(id) ?? REGIONS[0];
}
