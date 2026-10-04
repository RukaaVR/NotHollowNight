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
    palette: { sky0: '#0b0d14', sky1: '#1c2230', far: '#232a3a', mid: '#2c3446', near: '#151a24', tile: '#3a4152', tileHi: '#8a93a8', tileDark: '#12151d', accent: '#c9d4e8', fog: 'rgba(150,170,200,0.10)', ambient: '#8fa2c8', darkness: 0.55 },
    weather: 'snow', style: 'stone', bg: 'ruins', ambience: 'wind', mapColor: '#8a93a8',
    music: { root: 50, scale: MINOR, bpm: 62, prog: [0, 5, 3, 4], lead: 'piano', pad: 'strings', perc: 0, density: 0.35 },
  },
  {
    id: 'lw', name: 'Lanternwake', sub: 'The last village that remembers',
    palette: { sky0: '#100c10', sky1: '#2a1d1a', far: '#2e2420', mid: '#3a2d26', near: '#181210', tile: '#4a3a30', tileHi: '#c9a27a', tileDark: '#1a120e', accent: '#ffcf7a', fog: 'rgba(255,190,120,0.07)', ambient: '#ffcf9a', darkness: 0.5 },
    weather: 'motes', style: 'wood', bg: 'village', ambience: 'fire', mapColor: '#d8a86a',
    music: { root: 53, scale: MAJOR, bpm: 70, prog: [0, 3, 5, 4], lead: 'harp', pad: 'strings', perc: 0, density: 0.45 },
  },
  {
    id: 'mg', name: 'Mourning Grove', sub: 'A forest that grew downward to grieve',
    palette: { sky0: '#0b0f0c', sky1: '#1d2a20', far: '#1f2b22', mid: '#27382b', near: '#0f1611', tile: '#2f3a2c', tileHi: '#8fa878', tileDark: '#0e130d', accent: '#d7e8a0', fog: 'rgba(160,200,150,0.09)', ambient: '#a8d0a0', darkness: 0.58 },
    weather: 'leaves', style: 'root', bg: 'forest', ambience: 'leaves', mapColor: '#7fa06a',
    music: { root: 52, scale: DORIAN, bpm: 66, prog: [0, 3, 6, 4], lead: 'flute', pad: 'strings', perc: 0, density: 0.4 },
  },
  {
    id: 'gs', name: 'Gloamspore Warrens', sub: 'The fungus dreams for those who cannot',
    palette: { sky0: '#0d0a12', sky1: '#24162e', far: '#2a1b33', mid: '#341f3d', near: '#140c19', tile: '#3b2a44', tileHi: '#c48fd6', tileDark: '#140b18', accent: '#ffb3e6', fog: 'rgba(220,150,230,0.09)', ambient: '#d6a0e8', darkness: 0.62 },
    weather: 'spores', style: 'fungal', bg: 'fungal', ambience: 'drip', mapColor: '#b07ac8',
    music: { root: 51, scale: PHRYGIAN, bpm: 74, prog: [0, 1, 5, 4], lead: 'glass', pad: 'drone', perc: 1, density: 0.5 },
  },
  {
    id: 'dc', name: 'The Drowned City', sub: 'Every clock stopped at the same hour',
    palette: { sky0: '#06101a', sky1: '#0f2a3a', far: '#123040', mid: '#17384a', near: '#08141c', tile: '#24404f', tileHi: '#7fb8c8', tileDark: '#0a1820', accent: '#9fe8ff', fog: 'rgba(120,200,230,0.10)', ambient: '#80c8e0', darkness: 0.6 },
    weather: 'rain', style: 'brick', bg: 'city', ambience: 'water', mapColor: '#5fa8c0',
    music: { root: 48, scale: MINOR, bpm: 58, prog: [0, 5, 2, 6], lead: 'bell', pad: 'choir', perc: 0, density: 0.3 },
  },
  {
    id: 'lc', name: 'Lumen Caverns', sub: 'Light grows here like moss',
    palette: { sky0: '#060a12', sky1: '#101c30', far: '#14223a', mid: '#192a46', near: '#080e18', tile: '#22304a', tileHi: '#9ad8ff', tileDark: '#090f1a', accent: '#b8f0ff', fog: 'rgba(150,220,255,0.08)', ambient: '#a0d8ff', darkness: 0.78 },
    weather: 'motes', style: 'crystal', bg: 'crystal', ambience: 'hum', mapColor: '#7ac8f0',
    music: { root: 55, scale: LYDIAN, bpm: 64, prog: [0, 1, 4, 3], lead: 'glass', pad: 'glass', perc: 0, density: 0.35 },
  },
  {
    id: 'af', name: 'Ashen Foundry', sub: 'The fires were never told to stop',
    palette: { sky0: '#140806', sky1: '#3a1610', far: '#3a1a12', mid: '#4a2014', near: '#1a0a06', tile: '#3e2a24', tileHi: '#e08a5a', tileDark: '#150a08', accent: '#ffb070', fog: 'rgba(255,120,60,0.10)', ambient: '#ff9a6a', darkness: 0.5 },
    weather: 'embers', style: 'metal', bg: 'foundry', ambience: 'machinery', mapColor: '#d8704a',
    music: { root: 45, scale: HARM_MINOR, bpm: 96, prog: [0, 5, 4, 4], lead: 'organ', pad: 'drone', perc: 2, density: 0.55 },
  },
  {
    id: 'sa', name: 'The Sunken Archive', sub: 'Every word ever written, slowly drowning',
    palette: { sky0: '#0e0c08', sky1: '#2a2416', far: '#2c2618', mid: '#3a3220', near: '#14100a', tile: '#3e3524', tileHi: '#d8c48a', tileDark: '#14110a', accent: '#ffeab0', fog: 'rgba(230,210,150,0.08)', ambient: '#e8d6a0', darkness: 0.62 },
    weather: 'pages', style: 'book', bg: 'library', ambience: 'drip', mapColor: '#c8b070',
    music: { root: 50, scale: DORIAN, bpm: 60, prog: [0, 4, 5, 3], lead: 'piano', pad: 'strings', perc: 0, density: 0.42 },
  },
  {
    id: 'tc', name: 'Thorn Chapel', sub: 'They prayed until the thorns answered',
    palette: { sky0: '#120608', sky1: '#2e1018', far: '#30121a', mid: '#3c1620', near: '#16070a', tile: '#3a2228', tileHi: '#d07a8a', tileDark: '#14080a', accent: '#ff9aa8', fog: 'rgba(230,120,140,0.09)', ambient: '#e8a0b0', darkness: 0.6 },
    weather: 'ash', style: 'thorn', bg: 'chapel', ambience: 'choir', mapColor: '#c05a70',
    music: { root: 49, scale: HARM_MINOR, bpm: 68, prog: [0, 3, 4, 0], lead: 'choir', pad: 'organ', perc: 0, density: 0.4 },
  },
  {
    id: 'br', name: 'The Black Reservoir', sub: 'A sea that never saw a sky',
    palette: { sky0: '#03070c', sky1: '#08141e', far: '#0a1822', mid: '#0e202c', near: '#040a0e', tile: '#16242c', tileHi: '#5a9aa8', tileDark: '#050b0f', accent: '#70e0d0', fog: 'rgba(80,160,170,0.10)', ambient: '#60b0b8', darkness: 0.72 },
    weather: 'mist', style: 'coral', bg: 'sea', ambience: 'water', mapColor: '#3a8090',
    music: { root: 43, scale: PENTA_MINOR, bpm: 52, prog: [0, 3, 2, 4], lead: 'harp', pad: 'drone', perc: 0, density: 0.25 },
  },
  {
    id: 'so', name: 'Starwell Observatory', sub: 'They watched a sky they could no longer see',
    palette: { sky0: '#05060f', sky1: '#141a3a', far: '#18204a', mid: '#1e2856', near: '#080a18', tile: '#2a3058', tileHi: '#b8c0ff', tileDark: '#0a0c1a', accent: '#e0e4ff', fog: 'rgba(170,180,255,0.08)', ambient: '#b0b8ff', darkness: 0.55 },
    weather: 'stars', style: 'marble', bg: 'observatory', ambience: 'wind', mapColor: '#9aa4f0',
    music: { root: 57, scale: LYDIAN, bpm: 72, prog: [0, 4, 1, 5], lead: 'bell', pad: 'choir', perc: 0, density: 0.45 },
  },
  {
    id: 'vg', name: 'The Veiled Garden', sub: 'Beautiful, because someone refused to let it die',
    palette: { sky0: '#0a0e0c', sky1: '#1e3028', far: '#21362c', mid: '#2a4436', near: '#0c1510', tile: '#2e4436', tileHi: '#f0d0e8', tileDark: '#0c1410', accent: '#ffd8f0', fog: 'rgba(240,200,230,0.09)', ambient: '#f0c8e0', darkness: 0.5 },
    weather: 'petals', style: 'garden', bg: 'garden', ambience: 'leaves', mapColor: '#e0a8c8',
    music: { root: 54, scale: MAJOR, bpm: 66, prog: [0, 5, 3, 4], lead: 'strings', pad: 'choir', perc: 0, density: 0.45 },
  },
  {
    id: 'he', name: 'The Hollow Engine', sub: 'The heart that kept the dream turning',
    palette: { sky0: '#08080a', sky1: '#1e1c22', far: '#22202a', mid: '#2a2834', near: '#0c0b10', tile: '#34303e', tileHi: '#c0b090', tileDark: '#0e0d12', accent: '#ffd890', fog: 'rgba(220,200,160,0.07)', ambient: '#d8c8a0', darkness: 0.66 },
    weather: 'embers', style: 'engine', bg: 'engine', ambience: 'machinery', mapColor: '#b0a080',
    music: { root: 46, scale: WHOLE, bpm: 84, prog: [0, 2, 1, 3], lead: 'organ', pad: 'drone', perc: 2, density: 0.5 },
  },
  {
    id: 'ab', name: 'The Abyss', sub: 'Where the dreamer sleeps',
    palette: { sky0: '#020103', sky1: '#0c0612', far: '#120a1a', mid: '#180c22', near: '#050208', tile: '#1a1222', tileHi: '#8a6ab8', tileDark: '#050308', accent: '#c8a0ff', fog: 'rgba(150,100,220,0.10)', ambient: '#9a78d0', darkness: 0.85 },
    weather: 'void', style: 'void', bg: 'abyss', ambience: 'void', mapColor: '#7a5aa8',
    music: { root: 41, scale: PHRYGIAN, bpm: 50, prog: [0, 1, 0, 6], lead: 'choir', pad: 'drone', perc: 0, density: 0.25 },
  },
  {
    id: 'eh', name: 'Hall of Echoes', sub: 'Memories that refuse to stay defeated',
    palette: { sky0: '#06060a', sky1: '#1a1626', far: '#1e1a2c', mid: '#262036', near: '#0a0810', tile: '#2c2840', tileHi: '#d0c0ff', tileDark: '#0a0912', accent: '#e8dcff', fog: 'rgba(200,180,255,0.08)', ambient: '#c8b8f0', darkness: 0.5 },
    weather: 'motes', style: 'marble', bg: 'observatory', ambience: 'choir', mapColor: '#c0b0e8',
    music: { root: 52, scale: HARM_MINOR, bpm: 80, prog: [0, 5, 3, 4], lead: 'strings', pad: 'choir', perc: 1, density: 0.5 },
  },
];

export const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));

export function region(id: string): RegionDef {
  return REGION_BY_ID.get(id) ?? REGIONS[0];
}
