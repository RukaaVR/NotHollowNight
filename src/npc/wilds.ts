import type { NpcDef } from './Npc';
import type { DLine } from '../dialogue/types';
import { robe, breath, headCircle, eyes, lantern, hood, staff } from './paint';
import { ellipse, fillCircle, glow } from '../rendering/draw';
import { hasFlag, setFlag, bossDefeated } from '../progression/Progress';
import { questStage, questDone, setQuest, give, COGS, CORES, takeKeys } from '../quests/quests';

const L = (who: string, text: string): DLine => ({ who, text });

// ---------------------------------------------------------------- Brother Hollis

export const hollis: NpcDef = {
  id: 'hollis', name: 'Brother Hollis', title: 'A Pilgrim, Walking Slowly', w: 12, h: 21,
  present: (p, room) => {
    const st = questStage(p, 'pilgrim');
    if (room.startsWith('mg')) return st === 0;
    if (room.startsWith('lc')) return st === 1;
    if (room.startsWith('tc')) return st >= 2;
    return false;
  },
  talk(w, n) {
    const H = 'Hollis';
    const p = w.progress;
    const st = questStage(p, 'pilgrim');
    if (st === 0) {
      setQuest(w, 'pilgrim', 1);
      return { lines: [
        L(H, 'Peace on your path, small one. I walk to the Thorn Chapel. I have walked there more than a thousand times.'),
        L(H, 'Each time I arrive, I have forgotten why I went. So I walk back and begin again. It is a very good prayer. It never ends.'),
        L(H, 'Perhaps we will meet on the road. I am slow. You will pass me.'),
      ] };
    }
    if (st === 1) {
      if (p.keys.includes('prayer_beads')) {
        takeKeys(p, ['prayer_beads']);
        setQuest(w, 'pilgrim', 2);
        setFlag(p, 'hollis_beads');
        return { lines: [L(H, 'My beads! Oh — I had counted them so many times I could feel their absence like a missing tooth.'), L(H, 'Now I remember why I walk. I am going to thank her. The Saint. For taking the thorns. I will see you at the Chapel.')] };
      }
      return { lines: [L(H, 'I have stopped to rest. I lost my prayer beads somewhere in these caverns. Without them I cannot count my steps, and if I cannot count them, how will I know I have walked enough?')] };
    }
    // At the Chapel
    if (!questDone(p, 'pilgrim')) {
      setQuest(w, 'pilgrim', 3, true);
      give(w, 'relic', 'pilgrims_ash');
      if (bossDefeated(p, 'thorn_saint')) {
        return { lines: [L(H, 'She is at rest. You did that, didn\'t you. I came to thank her and found only quiet.'), L(H, 'I am not angry. She held the thorns for four hundred years. Someone should have told her she could put them down.'), L(H, 'Take my ash. The ground never hurt my feet. Perhaps it will spare yours.')] };
      }
      return { lines: [L(H, 'I made it. I can hear her in there, still praying. Still bleeding for us.'), L(H, 'Will you ease her suffering, if you can? Take this. The ground respects it.')] };
    }
    return { lines: [L(H, n.talks % 2 ? 'I think I will stay here a while. I have never stayed anywhere before.' : 'One thousand and one. That is how many times. This time I remember.')] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 11, 14 + b, '#6a5a44', '#a8987a');
    headCircle(ctx, -17 + b, 3.4, '#d8c8b0');
    hood(ctx, -17 + b, 3.8, '#5a4a36');
    eyes(ctx, n, 0.5, -17 + b, '#2a2018', 1.8, 0.5);
    staff(ctx, 6, -22, '#6a5038');
    ctx.fillStyle = '#c8a070';
    for (let i = 0; i < 4; i++) fillCircle(ctx, -2 + i * 1.5, -10 + b + Math.abs(i - 1.5), 0.6, '#c8a070');
  },
};

// ---------------------------------------------------------------- The Mourner

export const mourner: NpcDef = {
  id: 'mourner', name: 'The Mourner', title: 'Who Leaves the Flowers', w: 12, h: 22,
  present: (p) => !hasFlag(p, 'gloam_defeated'),
  talk(w, n) {
    const M = 'The Mourner';
    const p = w.progress;
    if (n.talks === 0) return { lines: [L('', 'A veiled figure kneels by a small grave, arranging fresh flowers. It does not look up.'), L(M, 'Every day. Every single day. Someone has to.')] };
    if (bossDefeated(p, 'crown')) return { lines: [L(M, '...She is gone? Then who are these flowers for now?'), L(M, 'For you, perhaps. You are what she was remembering.')] };
    return { lines: [[L(M, 'The grave is empty. It has always been empty. That is not the point.')], [L(M, 'I do not remember whose grave this is. My hands do.')], [L(M, 'Go on. The flowers will be fresh tomorrow.')]][n.talks % 3] };
  },
  draw(ctx, n) {
    const b = breath(n, 0.3);
    ctx.fillStyle = '#1e1a22';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-6, -10, -2, -16 + b);
    ctx.lineTo(4, -16 + b);
    ctx.quadraticCurveTo(7, -8, 6, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,220,235,0.5)';
    ctx.beginPath();
    ctx.moveTo(-2, -18 + b);
    ctx.quadraticCurveTo(-7, -10, -5, -2);
    ctx.lineTo(3, -14 + b);
    ctx.fill();
    headCircle(ctx, -18 + b, 3, '#2a2430');
    fillCircle(ctx, 5, -6, 1.3, '#ffe8f0');
    fillCircle(ctx, 6.5, -5, 1.1, '#f0d0ff');
  },
};

// ---------------------------------------------------------------- Ysolde the Cartographer

export const ysolde: NpcDef = {
  id: 'ysolde', name: 'Ysolde', title: 'Wandering Cartographer', w: 12, h: 20,
  light: { r: 40, color: '#f0d890' },
  talk(w, n) {
    const Y = 'Ysolde';
    const lines: DLine[] = [];
    if (n.talks === 0) lines.push(L(Y, 'Hm-hm-hmmm — oh! A visitor. Do you know you\'re standing on the edge of the known world? I\'ve marked it right here. See? Edge.'), L(Y, 'I sell maps of places I\'ve been. You can mark your own, too, if you have a quill.'));
    else lines.push(L(Y, ['The Veil rearranges itself when nobody\'s mapping it. That\'s my theory. That\'s why I never stop.', 'Hmm-hm... this cavern looked bigger from the inside.', 'If you find a place that isn\'t on any map, tell me. I won\'t put it on a map. I\'ll just like knowing.'][n.talks % 3]));
    return { lines, choices: [
      { label: 'Buy maps', run: () => { w.ui.openShop('ysolde'); } },
      { label: 'Leave', run: () => ({ lines: [L(Y, 'Hm-hm-hmmm!')] }) },
    ] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 10, 13 + b, '#5a4a3a', '#d8c090');
    // Enormous backpack of scrolls
    ctx.fillStyle = '#6a5038';
    ctx.fillRect(-9, -18 + b, 6, 14);
    ctx.fillStyle = '#efe4c4';
    for (let i = 0; i < 3; i++) ctx.fillRect(-10 + i * 2, -22 + b + i, 1.5, 6);
    headCircle(ctx, -16 + b, 3.4, '#e8d4c0');
    ctx.fillStyle = '#8a5a3a';
    ellipse(ctx, 0, -19 + b, 4, 1.8);
    ctx.fill();
    eyes(ctx, n, 0.5, -16 + b, '#2a1a10');
    ctx.strokeStyle = '#f0d890';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(4, -10);
    ctx.lineTo(7, -16);
    ctx.stroke();
  },
};

// ---------------------------------------------------------------- Flicker (moth guide)

export const flicker: NpcDef = {
  id: 'flicker', name: 'Flicker', title: 'A Very Small Light', w: 8, h: 10,
  light: { r: 70, color: '#ffe9a8' },
  present: (p) => !p.abilities.lantern,
  talk(w, n) {
    const F = 'Flicker';
    void w;
    return { lines: [[
      L(F, 'Bzz! You\'re dark! Not dark-dark. Normal-dark. Past here is DARK-dark. The kind that bites.'),
      L(F, 'Stay near the crystals and lanterns. The dark doesn\'t like them. The heart-lantern is deep down, past the singing. Bzz.'),
    ], [L(F, 'I would come with you but I am mostly afraid. Bzz.')], [L(F, 'If you find the heart-lantern you won\'t need me anymore. That\'s okay! That\'s what lights are for.')]][Math.min(2, n.talks)] };
  },
  draw(ctx, n) {
    const y = -6 + Math.sin(n.t * 3) * 2;
    glow(ctx, 0, y, 14, '#ffe9a8', 0.9);
    const flap = Math.sin(n.t * 30);
    ctx.fillStyle = 'rgba(255,240,200,0.7)';
    ellipse(ctx, -3, y - 1, 3, 1.5 + flap, -0.4);
    ctx.fill();
    ellipse(ctx, 3, y - 1, 3, 1.5 + flap, 0.4);
    ctx.fill();
    fillCircle(ctx, 0, y, 1.5, '#fff8e0');
  },
};

// ---------------------------------------------------------------- Ambrose the Bellringer (ghost)

export const ambrose: NpcDef = {
  id: 'ambrose', name: 'Ambrose', title: 'The Bellringer\'s Ghost', w: 12, h: 22,
  light: { r: 50, color: '#bfe8ff' },
  talk(w, n) {
    const A = 'Ambrose';
    const p = w.progress;
    if (questDone(p, 'bells')) return { lines: [L(A, 'Do you hear it? Quarter past eleven. Then half past. Then — then the next hour. Time moves again in the city.'), L(A, 'I can rest now. The bell tower doors are open, if you want what I left there. Thank you, little bell-ringer.')] };
    const rung = ['bell_1', 'bell_2', 'bell_3'].filter((b) => hasFlag(p, b)).length;
    if (questStage(p, 'bells') === 0) setQuest(w, 'bells', 1);
    const lines = n.talks === 0 ? [
      L(A, 'Quarter past the eleventh hour. Always quarter past. I\'ve rung for it a thousand times and the bells won\'t answer.'),
      L(A, 'Three bells. One high in the tower. One drowned in the square. One in the cathedral where no one prays. Strike them. Remind them.'),
    ] : [L(A, `${rung} of three bells. ${rung === 0 ? 'Silence.' : 'I heard that. I heard it.'}`)];
    return { lines };
  },
  draw(ctx, n) {
    ctx.globalAlpha *= 0.7 + 0.15 * Math.sin(n.t * 1.5);
    const b = Math.sin(n.t * 1.2) * 1.5 - 2;
    robe(ctx, n, 10, 16, 'rgba(160,210,230,0.6)');
    headCircle(ctx, -19 + b, 3.6, 'rgba(220,240,250,0.8)');
    eyes(ctx, n, 0, -19 + b, '#2a4a5a');
    ctx.strokeStyle = 'rgba(200,230,240,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(4, -14 + b);
    ctx.lineTo(4, -30);
    ctx.stroke();
    glow(ctx, 0, -12, 24, '#bfe8ff', 0.3);
  },
};

// ---------------------------------------------------------------- Gearwright Ottoline

export const ottoline: NpcDef = {
  id: 'ottoline', name: 'Ottoline', title: 'Gearwright of the Foundry', w: 14, h: 20,
  talk(w, n) {
    const O = 'Ottoline';
    const p = w.progress;
    if (questDone(p, 'lift')) return { lines: [L(O, 'Listen to her purr. Straight up to Lanternwake. Nobody walks through fire to buy bread anymore.')] };
    if (questStage(p, 'lift') === 0) {
      setQuest(w, 'lift', 1);
      return { lines: [
        L(O, 'Careful, that\'s a live gear. Everything here is a live gear. The Foundry never powered down — the Archon forbade it.'),
        L(O, 'See that lift? Goes all the way to Lanternwake. Dead. Needs three Cog Hearts — ticking ones. The Foundry\'s deeper rooms are full of them, inside things that won\'t want to give them up.'),
      ] };
    }
    const have = COGS.filter((c) => p.keys.includes(c));
    if (have.length > 0) {
      const n2 = takeKeys(p, have);
      p.flags.cogs_given = (p.flags.cogs_given ?? 0) + n2;
      if (p.flags.cogs_given >= 3) {
        setFlag(p, 'foundry_lift');
        setQuest(w, 'lift', 2, true);
        give(w, 'relic', 'heavy_blow');
        w.camera.shake(0.4, 1);
        return { lines: [L(O, 'Three hearts, three beats. Stand clear!'), L('', 'Somewhere above, a great chain groans and begins to move.'), L(O, 'She\'s running! Take these gauntlets — Warden issue, I found them in a locker. They hit like a closing door.')] };
      }
      return { lines: [L(O, `That's ${p.flags.cogs_given} of three. Ticking nicely.`)] };
    }
    return { lines: [L(O, n.talks % 2 ? 'Cog Hearts tick. Follow the ticking.' : `${p.flags.cogs_given ?? 0} of three Cog Hearts. The lift is patient. I am not.`)] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 12, 13 + b, '#4a3a2e', '#c8905a');
    headCircle(ctx, -16 + b, 3.6, '#d8b8a0');
    // Goggles
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(-2.5, -17.5 + b, 7, 2.4);
    fillCircle(ctx, 0, -16.3 + b, 1.2, '#9fe8ff');
    fillCircle(ctx, 3, -16.3 + b, 1.2, '#9fe8ff');
    ctx.fillStyle = '#6a3a2a';
    ellipse(ctx, 0, -19.5 + b, 4, 1.8);
    ctx.fill();
    // Wrench
    ctx.strokeStyle = '#8a8a94';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(8, -12);
    ctx.stroke();
  },
};

// ---------------------------------------------------------------- Gristle the miner

export const gristle: NpcDef = {
  id: 'gristle', name: 'Gristle', title: 'Last Miner of the Foundry Deeps', w: 14, h: 18,
  talk(w, n) {
    const G = 'Gristle';
    const p = w.progress;
    return { lines: [[
      L(G, 'Dig, dig, dig. Down there the rock is warm. Warm like skin. I stopped digging when it started breathing.'),
      L(G, 'The floor past the furnaces, the cracked bit? Only something falling very hard would get through. Like a hammer. Like a Warden.'),
    ], [L(G, p.abilities.drop ? 'You fall like a Warden now. The deep floor won\'t hold you. Don\'t say I didn\'t warn you about the breathing.' : 'You\'re too light. You\'d bounce.')], [L(G, 'Veilsteel grows in the deep seams. Old Kettle up top can use it, if you find any.')]][Math.min(2, n.talks)] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 13, 11 + b, '#3a3028', '#6a5a4a');
    headCircle(ctx, -14 + b, 3.8, '#c8a890');
    ctx.fillStyle = '#c8a040';
    ctx.beginPath();
    ctx.arc(0.5, -15 + b, 4, Math.PI, 0);
    ctx.fill();
    lantern(ctx, 0.5, -21 + b, '#ffcf8a', 0.5);
    eyes(ctx, n, -0.5, -14 + b, '#1a1410');
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-4, -12);
    ctx.stroke();
    ctx.fillStyle = '#8a8a94';
    ctx.beginPath();
    ctx.moveTo(-8, -11);
    ctx.lineTo(-4, -13);
    ctx.lineTo(0, -11);
    ctx.fill();
  },
};

// ---------------------------------------------------------------- Leaflet (memory shards)

const LEAF_REWARDS: { n: number; give: () => ['relic' | 'frags' | 'heart' | 'vessel', string | number] }[] = [
  { n: 4, give: () => ['frags', 250] },
  { n: 8, give: () => ['relic', 'charged_soul'] },
  { n: 12, give: () => ['heart', ''] },
  { n: 16, give: () => ['relic', 'veil_resonance'] },
  { n: 20, give: () => ['vessel', ''] },
];

export const leaflet: NpcDef = {
  id: 'leaflet', name: 'Leaflet', title: 'A Living Bookmark', w: 8, h: 18,
  talk(w, n) {
    const B = 'Leaflet';
    const p = w.progress;
    if (questStage(p, 'leaflet') === 0) setQuest(w, 'leaflet', 1);
    const count = p.shards.length;
    const claimed = p.flags.leaflet_claimed ?? 0;
    const lines: DLine[] = [];
    if (n.talks === 0) lines.push(L(B, 'Oh! Oh, a reader! Nobody reads anymore. They just drown.'), L(B, 'I mark places. That\'s what bookmarks do. Memory Shards are places in time — bring them to me and I\'ll mark them so the Archive never loses them.'));
    let given = 0;
    for (let i = claimed; i < LEAF_REWARDS.length; i++) {
      if (count >= LEAF_REWARDS[i].n) {
        const [k, v] = LEAF_REWARDS[i].give();
        give(w, k, v);
        p.flags.leaflet_claimed = i + 1;
        given++;
      }
    }
    if (given > 0) lines.push(L(B, `${count} memories! Marked, catalogued, cherished. Take this — a reader should be rewarded.`));
    else lines.push(L(B, `${count} memories so far. ${LEAF_REWARDS[claimed] ? `Bring me ${LEAF_REWARDS[claimed].n} and I'll have something for you.` : 'You have found them all. Every one.'}`));
    if ((p.flags.leaflet_claimed ?? 0) >= LEAF_REWARDS.length && !questDone(p, 'leaflet')) setQuest(w, 'leaflet', 2, true);
    return { lines };
  },
  draw(ctx, n) {
    const sway = Math.sin(n.t * 1.5) * 0.15;
    ctx.save();
    ctx.rotate(sway);
    ctx.fillStyle = '#8a2a2a';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-3, -16);
    ctx.lineTo(3, -16);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8b070';
    ctx.fillRect(-3, -16, 6, 1.5);
    ctx.strokeStyle = '#d8b070';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(2, -20, 4, -19);
    ctx.stroke();
    eyes(ctx, n, -1.2, -12, '#ffe8b0', 2.4, 0.6);
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Sister Maudlin

export const maudlin: NpcDef = {
  id: 'maudlin', name: 'Sister Maudlin', title: 'Last Nun of the Thorn Chapel', w: 12, h: 22,
  talk(w, n) {
    const M = 'Maudlin';
    const p = w.progress;
    if (bossDefeated(p, 'thorn_saint')) return { lines: [L(M, 'The thorns are withering. All of them, all at once. She let go.'), L(M, 'I have prayed every day of my life for her pain to end. I never once thought about what I would do after.')] };
    return { lines: [[
      L(M, 'Quietly, child. She is praying. She is always praying.'),
      L(M, 'Every wound the faithful suffered, she took into herself. Every thorn. She became the wall between us and the Dreamer\'s nightmares.'),
      L(M, 'Now she cannot stop. The thorns will not let her.'),
    ], [L(M, 'Beneath the nave the floor is cracked. She sealed herself below, where only the falling can follow.')], [L(M, 'Do you think it is cruel, to end a saint\'s suffering? Or cruel not to?')]][Math.min(2, n.talks)] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 11, 16 + b, '#2a1a20', '#6a3a4a');
    ctx.fillStyle = '#e8e0e0';
    ellipse(ctx, 0.5, -18 + b, 3.6, 4.2);
    ctx.fill();
    hood(ctx, -18 + b, 4.4, '#1a1014');
    eyes(ctx, n, -0.5, -18 + b, '#3a2028', 2, 0.5);
    ctx.strokeStyle = '#6a3a3a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(-3 + i * 1.5, -22 + b);
      ctx.lineTo(-3.5 + i * 1.5, -24 + b);
    }
    ctx.stroke();
  },
};

// ---------------------------------------------------------------- Calder the Ferrywoman

export const calder: NpcDef = {
  id: 'calder', name: 'Calder', title: 'Ferrywoman of the Still Sea', w: 12, h: 22,
  light: { r: 60, color: '#70e0d0' },
  talk(w, n) {
    const C = 'Calder';
    const p = w.progress;
    if (bossDefeated(p, 'ormund')) return { lines: [L(C, 'The water moves now. Little waves against my boat, all night. I had forgotten the sound.'), L(C, 'Ormund was holding his breath for all of us. Somebody finally let him exhale.')] };
    return { lines: [[
      L(C, 'I row people across. Nobody has wanted crossing in a long time, so mostly I row myself.'),
      L(C, 'The water is still because Ormund holds it still. The Engine needs it cold. If he ever breathes, the whole sea will move.'),
    ], [L(C, 'Down past the shrine, behind the violet wards, he sleeps. Don\'t look too long at the bottom.')], [L(C, 'Some say the Reservoir has no floor. I say it has a floor, and the floor is looking up.')]][Math.min(2, n.talks)] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 10, 16 + b, '#1e3038', '#5a9aa8');
    hood(ctx, -18 + b, 4, '#16262c', 2);
    fillCircle(ctx, 1, -18 + b, 1, '#70e0d0');
    // Long oar
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(6, -28);
    ctx.stroke();
    ctx.fillStyle = '#5a4a3a';
    ellipse(ctx, -6, 2, 1.6, 3.5, 0.4);
    ctx.fill();
    lantern(ctx, 7, -30, '#70e0d0', 0.6);
  },
};

// ---------------------------------------------------------------- Juno, the Astronomer's apprentice

export const juno: NpcDef = {
  id: 'juno', name: 'Juno', title: 'Apprentice of the Starwell', w: 10, h: 18,
  talk(w, n) {
    const J = 'Juno';
    const p = w.progress;
    if (bossDefeated(p, 'astronomer')) return { lines: [L(J, 'She told you, didn\'t she. About the sun. About the sky being blue again.'), L(J, 'I always believed her. I just never had anyone else who did.'), L(J, 'The Starwell goes all the way up. Some day, someone should climb it.')] };
    return { lines: [[
      L(J, 'You climbed all the way here? Nobody climbs here. The Archon sealed the Starwell when I was little.'),
      L(J, 'My teacher still watches. She says the sky is coming back. Everyone says she\'s mad.'),
    ], [L(J, 'She doesn\'t see with her eyes anymore. The Archon took them. She sees with the stars.')], [L(J, 'If you go up to her — be gentle. She\'s been alone with the truth for a very long time.')]][Math.min(2, n.talks)] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 9, 12 + b, '#1e2448', '#b8c0ff');
    headCircle(ctx, -15 + b, 3.4, '#e0d8e8');
    ctx.fillStyle = '#2a2040';
    ellipse(ctx, 0, -18 + b, 3.8, 2);
    ctx.fill();
    eyes(ctx, n, 0, -15 + b, '#1a1a30');
    fillCircle(ctx, 5, -9 + b, 1.5, '#e0e4ff');
    glow(ctx, 5, -9 + b, 8, '#e0e4ff', 0.5);
  },
};

// ---------------------------------------------------------------- Fen the Gardener

export const fen: NpcDef = {
  id: 'fen', name: 'Fen', title: 'Silent Gardener', w: 14, h: 20,
  talk(w, n) {
    const F = 'Fen';
    const p = w.progress;
    if (questDone(p, 'bloom')) return { lines: [L(F, '...'), L('', 'Fen does not speak, but kneels by the Pale Bloom and gently straightens one petal. Then looks at you for a long while, and nods.')] };
    if (questStage(p, 'bloom') === 0) setQuest(w, 'bloom', 1);
    if (p.keys.includes('pale_bloom')) return { lines: [L('', 'Fen sees the Pale Bloom you carry and gasps — a small sound, the first you have heard from them. They point urgently at the empty flower bed.')] };
    return { lines: [[
      L('', 'The gardener does not speak. They hand you a small slate, chalk-written:'),
      L('', '"Every flower here is a memory the Queen keeps. One bed is empty. It is for a Pale Bloom. They grow only where someone is truly remembered. I cannot find one. Will you?"'),
    ], [L('', 'Fen taps the slate: "Hidden places. Behind walls that pretend."')], [L('', 'Fen is watering an empty bed with great care.')]][Math.min(2, n.talks)] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 12, 13 + b, '#3a4a30', '#a8c090');
    headCircle(ctx, -16 + b, 3.6, '#c8b8a0');
    // Wide straw hat
    ctx.fillStyle = '#c8a860';
    ellipse(ctx, 0.5, -19 + b, 8, 1.8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.5, -19.5 + b, 3.6, Math.PI, 0);
    ctx.fill();
    eyes(ctx, n, -0.5, -16 + b, '#1a1a10');
    // Watering can
    ctx.fillStyle = '#6a7a6a';
    ctx.fillRect(4, -8, 4, 4);
    ctx.beginPath();
    ctx.moveTo(8, -7);
    ctx.lineTo(11, -10);
    ctx.lineTo(11, -9);
    ctx.lineTo(8, -5.5);
    ctx.fill();
  },
};

// ---------------------------------------------------------------- Unit Nine

export const unit9: NpcDef = {
  id: 'unit9', name: 'Unit Nine', title: 'Maintenance Automaton', w: 14, h: 20,
  light: { r: 40, color: '#ffd890' },
  talk(w, n) {
    const U = 'Unit Nine';
    const p = w.progress;
    if (questDone(p, 'unit9')) return { lines: [L(U, 'MEMORY RESTORED. I REMEMBER THE ARCHON. HE WAS KIND, ONCE. HE BUILT ME TO SWEEP FLOORS AND HUM.'), L(U, 'HE STOPPED HUMMING THE DAY THE QUEEN STOPPED SPEAKING TO HIM. I WILL HUM FOR HIM NOW.')] };
    if (questStage(p, 'unit9') === 0) {
      setQuest(w, 'unit9', 1);
      return { lines: [L(U, 'GREETINGS. I AM UNIT NINE. I AM... I AM... ERROR. MEMORY CORES MISSING. THREE.'), L(U, 'THEY WERE TAKEN BY THE GEARWARDENS FOR SPARE PARTS. PLEASE RECOVER THEM. I WOULD LIKE TO KNOW WHO I WAS.')] };
    }
    const have = CORES.filter((c) => p.keys.includes(c));
    if (have.length) {
      const k = takeKeys(p, have);
      p.flags.cores_given = (p.flags.cores_given ?? 0) + k;
      if (p.flags.cores_given >= 3) {
        setQuest(w, 'unit9', 2, true);
        setFlag(p, 'gate_he_shortcut');
        give(w, 'relic', 'aether_font');
        return { lines: [L(U, 'CORES INSTALLED. REBOOTING...'), L(U, 'OH. OH, I REMEMBER. I REMEMBER EVERYTHING.'), L(U, 'I HAVE OPENED THE SERVICE PASSAGE TO THE ENGINE CORE. AND PLEASE, TAKE THIS FONT. IT WAS LEAKING ANYWAY.')] };
      }
      return { lines: [L(U, `CORE INSTALLED. ${p.flags.cores_given} OF 3. I REMEMBER... A BROOM.`)] };
    }
    return { lines: [L(U, `${p.flags.cores_given ?? 0} OF 3 CORES. ${n.talks % 2 ? 'BEEP.' : 'THE GEARWARDENS ROLL WHERE THE GEARS ARE LOUDEST.'}`)] };
  },
  draw(ctx, n) {
    const b = Math.sin(n.t * 6) * 0.3;
    ctx.fillStyle = '#4a4438';
    ctx.fillRect(-5, -12, 10, 10);
    ctx.fillStyle = '#6a6050';
    ctx.fillRect(-4, -18 + b, 8, 6);
    fillCircle(ctx, 1.5, -15 + b, 1.6, '#ffd890');
    glow(ctx, 1.5, -15 + b, 6, '#ffd890', 0.6);
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -18 + b);
    ctx.lineTo(0, -21);
    ctx.stroke();
    fillCircle(ctx, 0, -21.5, 0.8, '#ff8a6a');
    // Wheels
    fillCircle(ctx, -3, -1.5, 1.8, '#2a2620');
    fillCircle(ctx, 3, -1.5, 1.8, '#2a2620');
    // Broom
    ctx.strokeStyle = '#6a5038';
    ctx.beginPath();
    ctx.moveTo(6, -1);
    ctx.lineTo(8, -14);
    ctx.stroke();
  },
};

void staff;
void lantern;
export const WILD_NPCS: NpcDef[] = [hollis, mourner, ysolde, flicker, ambrose, ottoline, gristle, leaflet, maudlin, calder, juno, fen, unit9];
