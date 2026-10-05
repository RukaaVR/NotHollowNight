/**
 * The written history of the Veil. Everything here is optional reading:
 * the story is also told through rooms, enemies and NPC behaviour.
 */
export interface LoreEntry {
  title: string;
  text: string;
}

/** Memory Shards: small crystallised moments. Traded to Leaflet in the Archive. */
export const SHARDS: Record<string, LoreEntry> = {
  ms_01: { title: 'A Child\'s Drawing', text: 'Crayon on slate: a sun, very large, very yellow. Underneath, in careful letters: "THIS IS WHAT IT LOOKED LIKE."' },
  ms_02: { title: 'Lamplighter\'s Count', text: 'Nine hundred lamps were lit each evening in Lanternwake. Then six hundred. Then ninety. The count stops at nine.' },
  ms_03: { title: 'Root Prayer', text: 'We asked the trees to follow us down. They did. They are still asking us why.' },
  ms_04: { title: 'Spore Ledger', text: 'Warren Tithe, Year 214: forty measures of dreamcap delivered to the Engine. Annotation: "The caps whisper now. Increase the gloves."' },
  ms_05: { title: 'Wet Bell-Rope', text: 'The rope is still taut. Somewhere above, a bell is held mid-swing, waiting for someone to let go.' },
  ms_06: { title: 'Stopped Watch', text: 'Its hands point to a quarter past the eleventh hour. Every watch in the Drowned City says the same.' },
  ms_07: { title: 'Crystal Song', text: 'Lumen crystal grows toward sound. The miners sang so it would not grow toward their hearts.' },
  ms_08: { title: 'Foundry Shift Bell', text: 'END OF SHIFT. END OF SHIFT. END OF — the bell cracked before it could finish.' },
  ms_09: { title: 'Overdue Notice', text: 'The Archive requests the immediate return of "On the Sleeping Titan, vol. III." It has been overdue for four hundred years.' },
  ms_10: { title: 'Thorn Vow', text: 'Let every hurt I carry become a thorn, and every thorn a wall between the Dreamer and its waking.' },
  ms_11: { title: 'Tide Table', text: 'High tide: never. Low tide: never. The Reservoir does not move. It is holding its breath.' },
  ms_12: { title: 'Star Chart', text: 'Charted from memory. The astronomers drew the sky they remembered, and argued for decades about where they had put the moon.' },
  ms_13: { title: 'Pressed Flower', text: 'A pale bloom between two pages. Someone wrote beside it: "For when she forgets me, so she can remember the garden instead."' },
  ms_14: { title: 'Engine Schematic', text: 'A spiral of gears around a hollow centre. The centre is labelled only: DREAM INTAKE.' },
  ms_15: { title: 'Abyssal Stone', text: 'Warm, faintly. It beats once every eleven minutes, like something enormous turning over in its sleep.' },
  ms_16: { title: 'Wanderer\'s Mark', text: 'Scratched into the stone at child height: a mask, a blade, and a tally of forty-one lines.' },
  ms_17: { title: 'Ration Token', text: 'Redeemable for one measure of Aether-bread. Not redeemable for sunlight, a note adds, in a different hand.' },
  ms_18: { title: 'Mourning Ribbon', text: 'Teal silk, the colour of the royal house. It was tied around a sapling that never grew.' },
  ms_19: { title: 'Guard\'s Last Report', text: 'Gate held. Gate held. Gate held. Gate — they are not trying to get in. They are trying to get out.' },
  ms_20: { title: 'Lullaby Fragment', text: '"Hush now, little lantern, the night is only long, / the sun is only sleeping, and you are only song."' },
  ms_21: { title: 'Cog of Unit Nine', text: 'Stamped on the inside: PROPERTY OF THE ARCHON. IF FOUND, RETURN TO THE ENGINE. IF THE ENGINE IS GONE, RETURN TO ANYONE.' },
  ms_22: { title: 'Cracked Telescope Lens', text: 'Through it, faintly, you can see a blue that is not the blue of any crystal.' },
  ms_23: { title: 'Pilgrim\'s Sandal', text: 'Worn through at the heel. Whoever wore it walked to the Chapel more than a thousand times.' },
  ms_24: { title: 'Unsent Letter', text: 'Seraphel — I have finished the Engine. It will hold the dream for a thousand years. I could not make it hold her. — T.V.' },
};

/** Echoes: recorded voices of Ilvane. All seven are needed for the true ending. */
export const ECHOES: Record<string, LoreEntry> = {
  echo_1: { title: 'Echo of the Herald', text: '"People of Ilvane. The astronomers have spoken. The sun is dying, and we will not die with it. The Queen has commanded the Descent. Bring your lamps. Bring your memories. Leave nothing you cannot carry."' },
  echo_2: { title: 'Echo of the Architect', text: '"Beneath us sleeps Orun, older than stone. It dreams, and its dreams are light. We will build a world inside that light. A veil between us and the cold. It will hold — so long as the Dreamer never wakes."' },
  echo_3: { title: 'Echo of the Bellringer', text: '"Quarter past the eleventh hour. The water stopped. The bells stopped. Everything stopped, as if the whole city had been told to hush. And far below, something... turned over."' },
  echo_4: { title: 'Echo of the Queen', text: '"My child is too sick to make the Descent. The physicians say the cold will take him within the month. So I will carry him down the only way I can. I will remember him. Every hour of every day. I will remember him so hard the Veil itself will learn his name."' },
  echo_5: { title: 'Echo of the Astronomer', text: '"I have looked again. The sun did not die. It dimmed — an age-long eclipse — and it has been burning bright for three centuries. The surface is green. The Archon knows. The Archon has ordered the Starwell sealed."' },
  echo_6: { title: 'Echo of the Archon', text: '"If they leave, the dream fails. If the dream fails, Orun wakes. If Orun wakes, everything we built is unmade. Let them believe in the cold. A lie is a small price for a world."' },
  echo_7: { title: 'Echo of the Child', text: '"Mother? It is so dark. Are you there? I can hear you humming. Keep humming. If you keep humming I think I can find you."' },
};

/** Inscriptions, murals and tablets found in the world. */
export const TABLETS: Record<string, LoreEntry> = {
  tab_th_1: { title: 'Weathered Signpost', text: 'BELOW: LANTERNWAKE. ABOVE: NOTHING. DO NOT CLIMB.' },
  tab_th_2: { title: 'Gate Inscription', text: 'Whoever passes this door agrees to forget the sky.' },
  tab_lw_1: { title: 'Village Charter', text: 'Lanternwake: founded on the first night below, so that no one would ever have to be in the dark alone.' },
  tab_lw_2: { title: 'Notice Board', text: 'MISSING: the Lantern Expedition. Four souls. Last seen heading into the Grove. If found, tell Captain Rhoswen. If not found, keep looking.' },
  tab_lw_3: { title: 'The Great Lamp', text: 'It burned for four hundred years. It went out the night the bells stopped. Old Wick says it can be lit again, with the right wicks.' },
  tab_mg_1: { title: 'Root-Carved Plaque', text: 'This grove was a royal garden once, above. It was brought down root by root. It has not forgiven anyone.' },
  tab_mg_2: { title: 'Mourner\'s Stone', text: 'Fresh flowers lie here every day. No one in Lanternwake admits to leaving them.' },
  tab_mg_3: { title: 'Warning Glyph', text: 'THE ROOT WEEPS. DO NOT ANSWER IT.' },
  tab_gs_1: { title: 'Harvest Rules', text: 'Do not sleep in the Warrens. Do not breathe deep in the Warrens. Do not dream in the Warrens. The caps will dream back.' },
  tab_gs_2: { title: 'Spore-Stained Mural', text: 'A queen of mushrooms, crowned in caps, feeding a long line of sleepers. Every sleeper is smiling.' },
  tab_dc_1: { title: 'Clocktower Plaque', text: 'The Hour Bells of Ilvane-Below. May they ring until the sun returns.' },
  tab_dc_2: { title: 'Flood Line', text: 'A scratch on the wall marks the water\'s height on the night of the Stillness. You are standing well below it.' },
  tab_dc_3: { title: 'Dining Hall Placard', text: 'Banquet in honour of the Queen\'s son. Two hundred places set. Not one plate touched.' },
  tab_lc_1: { title: 'Miner\'s Chalk', text: 'Lantern lost at shaft nine. Don\'t go past the singing crystals without light. The dark down here is hungry.' },
  tab_lc_2: { title: 'Crystal Ledger', text: 'Lumen crystal: grows from remembered light. When the Veil was young, the caverns were blinding.' },
  tab_af_1: { title: 'Foundry Decree', text: 'By order of the Archon: the furnaces will not be banked. The Engine must be fed. The Foundry does not sleep.' },
  tab_af_2: { title: 'Warden\'s Oath', text: 'I am the wall. I am the hammer. I am the ash that remains when the fire is done.' },
  tab_sa_1: { title: 'Reading Room Rules', text: 'Silence. No open flame. No open water. The Archive accepts no responsibility for what you remember after reading.' },
  tab_sa_2: { title: 'Catalogue Card', text: 'RESTRICTED: "Orun: A Natural History." Location: deepest stacks. Status: being read.' },
  tab_sa_3: { title: 'Royal Genealogy', text: 'Seraphel, Queen of Ilvane. Issue: one son, AEREN, born in the last summer. Died —  the date has been scraped away.' },
  tab_tc_1: { title: 'Chapel Lintel', text: 'Every thorn here was once a prayer. Pray carefully.' },
  tab_tc_2: { title: 'Saint\'s Reliquary', text: 'She took the thorns into herself so the faithful would not have to. She is still taking them.' },
  tab_br_1: { title: 'Dam Placard', text: 'The Black Reservoir: Aether-coolant for the Engine. Do not swim. Do not drink. Do not look too long at the bottom.' },
  tab_br_2: { title: 'Drowned Shrine', text: 'Ormund, Keeper of the Still Tide, sleeps here. He will wake when the water moves. The water will not move.' },
  tab_so_1: { title: 'Observatory Charter', text: 'To watch the sky, even when we cannot see it. To remember it correctly.' },
  tab_so_2: { title: 'Sealed Order', text: 'By decree of the Archon: the Starwell is closed. All lenses are to be destroyed. Astronomers will be reassigned to the Foundry.' },
  tab_vg_1: { title: 'Garden Gate', text: 'The Queen\'s garden. Every flower is a memory she refuses to lose.' },
  tab_vg_2: { title: 'Gardener\'s Note', text: 'She has stopped sleeping. She walks the rows at night saying his name to each flower so they will not forget it.' },
  tab_he_1: { title: 'Engine Warning', text: 'DREAM PRESSURE CRITICAL. DREAMER STIRRING. DO NOT REDUCE INTAKE. DO NOT REDUCE INTAKE.' },
  tab_he_2: { title: 'Archon\'s Desk', text: 'Notes, endlessly corrected: how long the dream will last. Each estimate shorter than the last. The final line just says: "Long enough."' },
  tab_ab_1: { title: 'The Last Inscription', text: 'Here the Veil ends and the Dreamer begins. If you have come this far, you already know what you are.' },
  tab_ab_2: { title: 'Scratched Mask Glyph', text: 'Forty-one masks hang on the wall of this cave. Forty-one children of memory came before you. One of them is still here.' },
  tab_eh_1: { title: 'Hall of Echoes', text: 'Here the Veil keeps what it cannot forget. Step onto a dais to face a memory again.' },
  tab_lw_4: { title: 'Training Yard Sign', text: 'Master Corvane\'s Yard. Strike the dummy. It does not mind. It has had a long life.' },
  tab_th_3: { title: 'Snow-Covered Plaque', text: 'The snow here falls from nowhere. It is the memory of snow, settling on everything that remembers being outside.' },
};

export interface ItemDef {
  name: string;
  desc: string;
  color: string;
}

/** Key items carried in the inventory. */
export const ITEMS: Record<string, ItemDef> = {
  wick_mg: { name: 'Rootfire Wick', desc: 'A wick woven from Mourning Grove root fibre. It smoulders without burning. Old Wick wants this.', color: '#d7e8a0' },
  wick_lc: { name: 'Lumen Wick', desc: 'Spun crystal thread that glows when held. Old Wick wants this.', color: '#b8f0ff' },
  wick_af: { name: 'Cinder Wick', desc: 'A wick that has never gone out, taken from the Foundry\'s oldest furnace. Old Wick wants this.', color: '#ffb070' },
  wick_dc: { name: 'Tidewick', desc: 'A wick that burns underwater with a pale blue flame. Old Wick wants this.', color: '#9fe8ff' },
  cog_1: { name: 'Cog Heart (I)', desc: 'A brass heart of gears, still ticking. Gearwright Ottoline needs three.', color: '#e0b070' },
  cog_2: { name: 'Cog Heart (II)', desc: 'A brass heart of gears, still ticking. Gearwright Ottoline needs three.', color: '#e0b070' },
  cog_3: { name: 'Cog Heart (III)', desc: 'A brass heart of gears, still ticking. Gearwright Ottoline needs three.', color: '#e0b070' },
  prayer_beads: { name: 'Pilgrim\'s Beads', desc: 'Wooden beads worn smooth by a thousand prayers. They belong to Brother Hollis.', color: '#c8a070' },
  pale_bloom: { name: 'Pale Bloom', desc: 'A flower that grows only where someone is being remembered. Fen the Gardener has been searching for one.', color: '#ffe0f0' },
  core_1: { name: 'Memory Core (Alpha)', desc: 'A glass sphere full of slow light. It belongs to Unit Nine.', color: '#ffd890' },
  core_2: { name: 'Memory Core (Beta)', desc: 'A glass sphere full of slow light. It belongs to Unit Nine.', color: '#ffd890' },
  core_3: { name: 'Memory Core (Gamma)', desc: 'A glass sphere full of slow light. It belongs to Unit Nine.', color: '#ffd890' },
  seal_tide: { name: 'Seal of the Still Tide', desc: 'One of three Dream Seals. It feels like holding your breath.', color: '#70e0d0' },
  seal_stars: { name: 'Seal of the Starwell', desc: 'One of three Dream Seals. It is warm, like a remembered summer.', color: '#e0e4ff' },
  seal_memory: { name: 'Seal of Memory', desc: 'One of three Dream Seals. It hums a lullaby when you are not listening.', color: '#ffd8f0' },
  mask_1: { name: 'Mask Shard (Brow)', desc: 'A fragment of a porcelain mask, much like your own. It is cold.', color: '#e8e4f0' },
  mask_2: { name: 'Mask Shard (Cheek)', desc: 'A fragment of a porcelain mask, much like your own. It is cold.', color: '#e8e4f0' },
  mask_3: { name: 'Mask Shard (Chin)', desc: 'A fragment of a porcelain mask, much like your own. It is cold.', color: '#e8e4f0' },
  unworn_mask: { name: 'The Unworn Mask', desc: 'Three shards, made whole. It has no eye-slits. It was never meant to see. Something in the Abyss is waiting for it.', color: '#ffffff' },
  foundry_key: { name: 'Warden\'s Key', desc: 'A heavy iron key, warm to the touch. It opens the great gate between the Foundry and Lanternwake.', color: '#c08060' },
  quill: { name: 'Cartographer\'s Quill', desc: 'Lets you mark your map. Bought from Ysolde.', color: '#f0d890' },
  shrine_lens: { name: 'Shrine Lens', desc: 'Veil Shrines now appear on your map wherever you have been.', color: '#ffe8b0' },
  hunters_lens: { name: 'Seeker\'s Compass', desc: 'Your map marks treasure in rooms you have explored but not emptied.', color: '#ffb0b0' },
};

/** Lost Relics: rare treasures the Curator pays handsomely for. */
export const LOST_RELICS: Record<string, ItemDef & { value: number }> = {
  lr_1: { name: 'Sunstone Brooch', desc: 'A jewel that once held real sunlight. A little is left.', color: '#ffd060', value: 200 },
  lr_2: { name: 'Herald\'s Horn', desc: 'The horn that called the Descent. It will not sound again.', color: '#e0c090', value: 250 },
  lr_3: { name: 'Crown Fragment', desc: 'A point of the Queen\'s crown, snapped off in grief.', color: '#fff0c0', value: 400 },
  lr_4: { name: 'Astrolabe of Ilvane', desc: 'It still tracks the surface sun. The sun is up.', color: '#c8d0ff', value: 450 },
  lr_5: { name: 'Engine Governor', desc: 'A small device that once kept the Silent Engine from spinning too fast.', color: '#d0b080', value: 500 },
  lr_6: { name: 'First Lantern', desc: 'The very first lamp carried into the Veil. Its flame is a memory of a flame.', color: '#ffe8a0', value: 800 },
};

export function loreFor(kind: 'shard' | 'echo' | 'tablet', id: string): LoreEntry {
  const table = kind === 'shard' ? SHARDS : kind === 'echo' ? ECHOES : TABLETS;
  return table[id] ?? { title: 'Faded Words', text: 'The words are too worn to read.' };
}
