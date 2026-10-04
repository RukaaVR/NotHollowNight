export interface AbilityDef {
  id: string;
  name: string;
  short: string;
  howTo: string;
  lore: string;
  color: string;
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'dash', name: 'Veil Dash', short: 'A swift horizontal burst through the air or along the ground.',
    howTo: 'Press DASH to surge forward. Resets when you land, cling to a wall, or strike a foe in the air.',
    lore: 'The old couriers of Ilvane ran between heartbeats. Their stride lingers in the folds of the Veil.',
    color: '#9fd8ff',
  },
  {
    id: 'lance', name: 'Veil Lance', short: 'Hurl a spear of condensed Aether. Strikes distant switches.',
    howTo: 'Press ART to throw a lance (33 Aether). Hold UP while pressing ART for a rising Spire.',
    lore: 'Aether remembers the shape it is given. Given a point, it becomes a promise.',
    color: '#bfe8ff',
  },
  {
    id: 'grip', name: 'Wall Grip', short: 'Cling to walls, slide slowly, and leap between them.',
    howTo: 'Hold toward a wall while airborne to cling. Press JUMP to leap away.',
    lore: 'Spore-threads woven into the gloves. They tighten when you are afraid of falling.',
    color: '#c6e59a',
  },
  {
    id: 'lantern', name: 'Lumen Lantern', short: 'A crystal lantern that holds back umbral darkness.',
    howTo: 'Passive. Light surrounds you; umbral darkness no longer drains your Vigor.',
    lore: 'Cut from the heart-crystal of the Caverns. It hums a note only the dark can hear.',
    color: '#ffe9a8',
  },
  {
    id: 'step', name: 'Shadow Step', short: 'Blink a short distance, untouchable, through foes and thorns.',
    howTo: 'Press STEP to blink in the direction you face. Grants brief invulnerability.',
    lore: 'For an instant you are not here. The Veil forgets you, then remembers, and is ashamed.',
    color: '#b59cff',
  },
  {
    id: 'dive', name: 'Deep Dive', short: 'Breathe the black water. Swim freely beneath the surface.',
    howTo: 'Passive. Enter deep water to swim. Press JUMP to kick upward, DASH to surge.',
    lore: 'The bell-keepers of the Drowned City sang underwater. Their lungs were never their own.',
    color: '#6fc3d9',
  },
  {
    id: 'drop', name: 'Abyss Drop', short: 'Plunge downward with crushing force. Shatters fragile floors.',
    howTo: 'While airborne, hold DOWN and press ART. Costs no Aether.',
    lore: 'The Foundry Wardens fell like hammers. Gravity was their oath.',
    color: '#ff9a62',
  },
  {
    id: 'glide', name: 'Veil Glide', short: 'Spread your cloak to drift gently and travel far.',
    howTo: 'Hold JUMP while falling to glide.',
    lore: 'Pages of the Archive taught the cloth to read the wind.',
    color: '#e8d7b0',
  },
  {
    id: 'phase', name: 'Phase Walk', short: 'Pass through shimmering wards as if they were mist.',
    howTo: 'Passive. Violet wards no longer block your path.',
    lore: 'Wards were built to keep the living out. You are no longer entirely living.',
    color: '#d48cff',
  },
  {
    id: 'grapple', name: 'Aether Grapple', short: 'Hook onto glowing anchors and pull yourself through the air.',
    howTo: 'Press GRAPPLE near a glowing anchor to swing toward it.',
    lore: 'Chains of light, forged where the sea meets the sky that is not a sky.',
    color: '#7ff0d0',
  },
];

export const ABILITY_BY_ID = new Map(ABILITIES.map((a) => [a.id, a]));
