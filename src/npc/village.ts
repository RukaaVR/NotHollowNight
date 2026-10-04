import type { NpcDef, Npc } from './Npc';
import type { GameWorld } from '../world/GameWorld';
import type { DialogueScript, DLine } from '../dialogue/types';
import { robe, breath, headCircle, eyes, lantern, hood, staff, hat } from './paint';
import { ellipse, fillCircle, glow } from '../rendering/draw';
import { hasFlag, setFlag } from '../progression/Progress';
import { questStage, questDone, setQuest, give, bossCount, explorersFound, WICKS, takeKeys, trueEndingReady } from '../quests/quests';
import { LOST_RELICS } from '../story/lore';
import { Entity } from '../world/Entity';
import { createEnemy } from '../enemies/registry';
import { Enemy } from '../enemies/Enemy';
import { sfx } from '../core/events';
import { TILE } from '../world/tiles';

const L = (who: string, text: string): DLine => ({ who, text });

// ---------------------------------------------------------------- Old Wick

export const oldWick: NpcDef = {
  id: 'old_wick', name: 'Old Wick', title: 'The Last Lamplighter', w: 12, h: 22,
  light: { r: 60, color: '#ffcf8a' },
  talk(w, n) {
    const p = w.progress;
    const W = 'Old Wick';
    if (questDone(p, 'lamplighter')) {
      return { lines: [
        L(W, 'Look at it burn. Four hundred years I kept that wick trimmed for a lamp that would not light.'),
        L(W, 'Now the village can see the edges of itself again. The children have started counting lamps.'),
        hasFlag(p, 'gloam_defeated') ? L(W, 'Whatever you did down there... the flame leaned toward it. Like a flower to a window.') : L(W, 'Go on, little lantern. The light will keep.'),
      ] };
    }
    const carried = WICKS.filter((k) => p.keys.includes(k));
    if (questStage(p, 'lamplighter') === 0) {
      return {
        lines: [
          L(W, 'Mind the step. Mind the dark, too, while you\'re at it. It\'s been minding us.'),
          L(W, 'That great lamp there. It went out the night the bells stopped. Every lamp below took its fire from that one.'),
          L(W, 'Four wicks would do it. One of root, one of crystal, one of cinder, one of tide. They\'re out there in the Veil, where the old lamplighters left them.'),
        ],
        choices: [
          { label: 'I will find them.', run: () => { setQuest(w, 'lamplighter', 1); return { lines: [L(W, 'Hah. They all said that. You say it like you mean it, though. Off you go.')] }; } },
          { label: 'Not now.', run: () => ({ lines: [L(W, 'Nobody\'s ever in a hurry for the dark. Come back.')] }) },
        ],
      };
    }
    if (carried.length > 0) {
      const given = takeKeys(p, carried);
      const total = (p.flags.wicks_given ?? 0) + given;
      p.flags.wicks_given = total;
      sfx('quest');
      if (total >= 4) {
        setFlag(p, 'great_lamp_lit');
        setQuest(w, 'lamplighter', 2, true);
        give(w, 'vessel', '');
        w.discoverSecret();
        return { lines: [
          L(W, `${given > 1 ? 'Those are' : 'That\'s'} the last of them. Stand back.`),
          L('', 'Old Wick threads the four wicks together and lifts them into the Great Lamp. For a long moment, nothing.'),
          L('', 'Then the lamp breathes in, and Lanternwake is suddenly, astonishingly bright.'),
          L(W, '...There. There you are. I knew you were still in there.'),
          L(W, 'Take this. The lamplighters kept it for whoever lit the Great Lamp again. I never thought it\'d be anyone but me.'),
        ] };
      }
      return { lines: [L(W, `A good wick. That makes ${total} of four. The lamp\'s already listening.`)] };
    }
    const lines: DLine[] = [L(W, `${p.flags.wicks_given ?? 0} of four wicks. The root grows in the Grove. The crystal sings in the Caverns. The cinder never sleeps in the Foundry. The tide hides in the drowned streets.`)];
    if (n.talks > 3 && n.once('wick_story')) lines.push(L(W, 'I was nine when the Descent happened. I carried my father\'s lamp the whole way down. I don\'t remember his face. I remember the lamp.'));
    return { lines };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 11, 15 + b, '#4a3a2a', '#c8a26a');
    // Stooped head with a long white beard-like scarf
    headCircle(ctx, -17 + b, 4, '#d8c8b0');
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-1, -15 + b);
    ctx.lineTo(4, -15 + b);
    ctx.lineTo(1.5, -8 + b);
    ctx.fill();
    eyes(ctx, n, 0.5, -18 + b, '#2a2018');
    hat(ctx, -20 + b, 10, 5, '#3a2a1e');
    staff(ctx, 6, -24);
    lantern(ctx, 6, -26, '#ffcf8a', 0.9);
  },
};

// ---------------------------------------------------------------- Marrow (shop)

export const marrow: NpcDef = {
  id: 'marrow', name: 'Marrow', title: 'Dealer in Curios', w: 16, h: 18,
  talk(w, n) {
    const M = 'Marrow';
    const lines: DLine[] = [];
    if (n.talks === 0) lines.push(L(M, 'A customer. A small, masked, quiet customer. My favourite kind.'));
    else if (bossCount(w.progress) >= 6 && n.once('marrow_late')) lines.push(L(M, 'You\'re still alive. That\'s good for business and bad for my bets.'));
    else lines.push(L(M, ['Browse. Touch nothing you can\'t afford.', 'Everything here was someone\'s treasure. Now it\'s inventory.', 'I buy bones. I sell everything else.'][n.talks % 3]));
    return { lines, choices: [
      { label: 'Browse wares', run: () => { w.ui.openShop('marrow'); } },
      { label: 'Leave', run: () => ({ lines: [L(M, 'Mind the skulls on the way out. They mind you.')] }) },
    ] };
  },
  draw(ctx, n) {
    const b = breath(n, 0.4);
    // A hunched, wide figure under a shell of stitched bone plates
    ctx.fillStyle = '#3a3028';
    ellipse(ctx, 0, -7, 8, 7 + b);
    ctx.fill();
    ctx.fillStyle = '#d8d0c0';
    for (let i = 0; i < 5; i++) {
      ellipse(ctx, -5 + i * 2.5, -12 - Math.sin((i / 4) * Math.PI) * 2 + b, 1.6, 2.4);
      ctx.fill();
    }
    fillCircle(ctx, 6, -9 + b, 3, '#c8b8a0');
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(6.5, -10 + b, 2, 1);
    fillCircle(ctx, 8, -9.5 + b, 0.6, '#ffcf8a');
  },
};

// ---------------------------------------------------------------- Tamsin (vault)

export const tamsin: NpcDef = {
  id: 'tamsin', name: 'Tamsin', title: 'Keeper of the Lantern Vault', w: 12, h: 20,
  talk(w) {
    const T = 'Tamsin';
    const p = w.progress;
    return {
      lines: [L(T, p.banked > 0 ? `Your ${p.banked} fragments are safe with me. Safer than with you.` : 'Fragments you carry, you can lose. Fragments you leave with me, the dark can\'t touch.')],
      choices: [
        { label: 'Use the vault', run: () => { w.ui.openShop('vault'); } },
        { label: 'Why keep a vault?', run: () => ({ lines: [L(T, 'My brother went into the Veil with everything he owned. He came back with nothing, and then he didn\'t come back at all. I keep things now. It helps.')] }) },
      ],
    };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 10, 14 + b, '#2a3448', '#8aa0c8');
    headCircle(ctx, -16 + b, 3.6, '#e0d4c4');
    hood(ctx, -16 + b, 4, '#1e2638');
    eyes(ctx, n, 0, -16 + b, '#1a1a24');
    // A ring of keys at the belt
    ctx.strokeStyle = '#c8b070';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(3, -6, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c8b070';
    ctx.fillRect(4, -5, 0.8, 3);
  },
};

// ---------------------------------------------------------------- Captain Rhoswen

export const rhoswen: NpcDef = {
  id: 'rhoswen', name: 'Captain Rhoswen', title: 'Leader of the Lantern Expedition', w: 12, h: 23,
  talk(w, n) {
    const R = 'Rhoswen';
    const p = w.progress;
    const found = explorersFound(p);
    if (questDone(p, 'expedition')) return { lines: [L(R, 'Four lanterns went out. Four lanterns came home. I owe you more than a thread and some fragments.'), L(R, 'If you ever need a crew, Wanderer, you have one.')] };
    if (questStage(p, 'expedition') === 0) {
      return {
        lines: [
          L(R, 'You came from above? Then you came the way we went. Did you see them?'),
          L(R, 'My expedition. Four of them. We went to map the Grove and the dark... rearranged itself. I made it back. They didn\'t.'),
        ],
        choices: [
          { label: 'I will look for them.', run: () => { setQuest(w, 'expedition', 1); return { lines: [L(R, 'Pell is young and scared of everything. Dorran is stubborn. Ilka chases crystals. Castor... Castor hides. Tell them their captain is waiting.')] }; } },
          { label: 'Not yet.', run: () => ({ lines: [L(R, 'I\'ll be here. I\'m always here.')] }) },
        ],
      };
    }
    if (found >= 4) {
      setQuest(w, 'expedition', 2, true);
      give(w, 'relic', 'wanderers_thread');
      give(w, 'frags', 300);
      return { lines: [L(R, 'All four. All four of them, alive.'), L(R, 'Here. My grandmother tied this thread to the gate the day we came down so she could always find home. Take it.')] };
    }
    const lines = [L(R, `${found} of four home. ${4 - found} still out there.`)];
    if (n.talks > 2 && n.once('rhos_doubt')) lines.push(L(R, 'Some nights I think the Veil wanted to keep them. Like it\'s collecting people. Like it\'s lonely.'));
    return { lines };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 11, 16 + b, '#4a2a24', '#d8a060');
    // Coat with pauldron and a captain's hat with a feather
    ctx.fillStyle = '#6a4a34';
    ellipse(ctx, 3, -15 + b, 3, 1.8);
    ctx.fill();
    headCircle(ctx, -18 + b, 3.6, '#d8c4b0');
    eyes(ctx, n, 0.5, -18 + b, '#2a1810');
    hat(ctx, -21 + b, 11, 3, '#2a1a14');
    ctx.strokeStyle = '#e8e0c8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-3, -22 + b);
    ctx.quadraticCurveTo(-8, -27 + b, -9, -24 + b);
    ctx.stroke();
    lantern(ctx, -6, -10, '#ffcf8a', 0.7);
  },
};

// ---------------------------------------------------------------- Quenna (innkeeper)

export const quenna: NpcDef = {
  id: 'quenna', name: 'Quenna', title: 'Keeper of the Ember Inn', w: 14, h: 20,
  light: { r: 50, color: '#ffb070' },
  talk(w, n) {
    const Q = 'Quenna';
    const p = w.progress;
    const bc = bossCount(p);
    let line: string;
    if (hasFlag(p, 'gloam_defeated')) line = 'The ground stopped shaking. First time in my life. I don\'t know what to do with my hands.';
    else if (hasFlag(p, 'abyss_open')) line = 'Something deep down is breathing. You can feel it in the soup. The soup is trembling, Wanderer.';
    else if (hasFlag(p, 'great_lamp_lit')) line = 'Since the Great Lamp came back, folk sit by the window instead of the wall. Small thing. Big thing.';
    else if (hasFlag(p, 'bells_rung')) line = 'Did you hear it? Bells. From below. My grandmother used to set her bread by those bells.';
    else if (bc >= 4) line = 'Travellers have stopped coming through. Except you. You keep coming through.';
    else if (bc >= 1) line = 'Word is something old fell in the Grove. The roots outside the window stopped weeping. Was that you?';
    else line = 'Sit. Warm yourself. Nobody\'s been upstairs in a long while and I\'ve stopped asking why.';
    const lines = [L(Q, line)];
    if (n.talks === 1) lines.push(L(Q, 'You don\'t eat, do you? No. No, I suppose masks don\'t.'));
    if (n.talks === 4 && n.once('quenna_bells')) {
      lines.push(L(Q, 'The bells stopped three nights ago.'), L('Aeren', '...What bells?'), L(Q, '...You don\'t hear them? No. Of course. Three nights, three hundred years. It\'s all the same night down here.'));
    }
    return { lines };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 13, 14 + b, '#6a3a2a', '#e8b880');
    ctx.fillStyle = '#e8d8c0';
    ctx.fillRect(-4, -12 + b, 8, 8);
    headCircle(ctx, -17 + b, 4, '#e0c8b0');
    ctx.fillStyle = '#6a2a1a';
    ellipse(ctx, 0, -20 + b, 4.4, 2.5);
    ctx.fill();
    eyes(ctx, n, 0, -17 + b, '#2a1810');
    // Steaming mug
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(5, -11 + b, 3, 3);
    ctx.strokeStyle = 'rgba(230,230,230,0.4)';
    ctx.beginPath();
    ctx.moveTo(6.5, -12 + b);
    ctx.quadraticCurveTo(5 + Math.sin(n.t * 2), -15, 7, -18);
    ctx.stroke();
  },
};

// ---------------------------------------------------------------- Master Corvane (trials)

const TRIALS: { req: number; enemies: string[]; reward: string; text: string }[] = [
  { req: 0, enemies: ['husk', 'husk', 'rootling', 'moth', 'moth'], reward: 'quickstep', text: 'First trial. Simple things that bite.' },
  { req: 3, enemies: ['thornback', 'shade', 'hound', 'capling', 'capling', 'capling', 'bark_knight'], reward: 'long_reach', text: 'Second trial. Armour, wings and teeth.' },
  { req: 6, enemies: ['geode', 'brute', 'scribe', 'acolyte', 'orrery_knight', 'maiden'], reward: 'glass_crown', text: 'Final trial. Everything I have left.' },
];

class TrialWatcher extends Entity {
  waves: string[][];
  wave = 0;
  spawned: Enemy[] = [];
  t = 0;
  constructor(world: GameWorld, public index: number) {
    super(world);
    const list = TRIALS[index].enemies;
    this.waves = [list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))];
    world.ui.toast(`Trial ${index + 1}`, 'Defeat every foe.', 'quest');
    setFlag(world.progress, 'trial_active');
  }
  spawnWave(): void {
    const w = this.world;
    const g = w.grid;
    this.spawned = [];
    this.waves[this.wave].forEach((id, i) => {
      const x = TILE * 4 + ((i * 97) % Math.max(1, g.pw - TILE * 8));
      const e = createEnemy(w, id, x, g.ph - TILE, false);
      if (e) {
        e.setState('chase');
        w.add(e);
        w.fx.burst(e.cx, e.cy, 16, '#ffe8b0', 90, 0.6, 2);
        this.spawned.push(e);
      }
    });
    sfx('gate');
  }
  update(dt: number): void {
    this.t += dt;
    const w = this.world;
    if (w.player.state === 'dead') {
      this.dead = true;
      delete w.progress.flags.trial_active;
      return;
    }
    if (this.spawned.length === 0 && this.t > 1) this.spawnWave();
    if (this.spawned.length > 0 && this.spawned.every((e) => e.dead || e.deathT >= 0)) {
      this.wave++;
      this.spawned = [];
      this.t = 0;
      if (this.wave >= this.waves.length) {
        this.dead = true;
        delete w.progress.flags.trial_active;
        setFlag(w.progress, `trial_${this.index + 1}`);
        give(w, 'relic', TRIALS[this.index].reward);
        w.victoryT = 4;
        if (this.index === 2) setQuest(w, 'trials', 2, true);
        else if (questStage(w.progress, 'trials') === 0) setQuest(w, 'trials', 1);
      }
    }
  }
  draw(): void {
    /* invisible controller */
  }
}

export const corvane: NpcDef = {
  id: 'corvane', name: 'Master Corvane', title: 'Swordmaster of Lanternwake', w: 12, h: 24,
  talk(w, n) {
    const C = 'Corvane';
    const p = w.progress;
    const next = TRIALS.findIndex((_, i) => !hasFlag(p, `trial_${i + 1}`));
    const lines: DLine[] = [];
    if (n.talks === 0) lines.push(L(C, 'That blade is far too old for you, and you hold it far too well. Show me.'), L(C, 'The dummy keeps count. Strike it to measure yourself; speak to it to see your numbers.'));
    if (hasFlag(p, 'trial_active')) return { lines: [L(C, 'Fight! Talking comes after.')] };
    if (next < 0) return { lines: [...lines, L(C, 'I have nothing left to teach. Teach the dummy something. It is lonely.')] };
    const tr = TRIALS[next];
    if (bossCount(p) < tr.req) return { lines: [...lines, L(C, `My next trial would break you. Come back when you have felled ${tr.req} of the great ones.`)] };
    return {
      lines: [...lines, L(C, tr.text)],
      choices: [
        { label: `Begin Trial ${next + 1}`, run: () => { w.add(new TrialWatcher(w, next)); return { lines: [L(C, 'Begin.')] }; } },
        { label: 'Later', run: () => ({ lines: [L(C, 'The yard will wait. I will not, forever.')] }) },
      ],
    };
  },
  draw(ctx, n) {
    const b = breath(n, 0.3);
    // Tall, gaunt bird-like duelist with a long beaked mask
    ctx.fillStyle = '#1e1e26';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-4, -16 + b);
    ctx.lineTo(4, -16 + b);
    ctx.lineTo(6, 0);
    ctx.fill();
    ctx.fillStyle = '#c8c0b0';
    ellipse(ctx, 0.5, -19 + b, 3, 3.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2.5, -19 + b);
    ctx.lineTo(9, -17 + b);
    ctx.lineTo(2.5, -17.5 + b);
    ctx.fill();
    fillCircle(ctx, 1.5, -20 + b, 0.6, '#1a1a20');
    // Black plume
    ctx.fillStyle = '#0e0e14';
    ctx.beginPath();
    ctx.moveTo(-2, -21 + b);
    ctx.quadraticCurveTo(-8, -26 + b, -9, -20 + b);
    ctx.fill();
    // Sheathed rapier
    ctx.strokeStyle = '#a8a8b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(4, -10);
    ctx.stroke();
  },
};

// ---------------------------------------------------------------- Kettle (smith)

export const kettle: NpcDef = {
  id: 'kettle', name: 'Kettle', title: 'Smith of the Low Forge', w: 18, h: 18,
  light: { r: 50, color: '#ff9a50' },
  talk(w, n) {
    const K = 'Kettle';
    const lines: DLine[] = [];
    if (n.talks === 0) lines.push(L(K, 'Hrm. Veilblade. Haven\'t seen one of those since my grandmother\'s grandmother\'s anvil.'), L(K, 'It\'s made of Veilsteel — memory, hammered thin. Bring me ore and I\'ll fold it in.'));
    else lines.push(L(K, w.progress.bladeLevel >= 4 ? 'That edge could cut a promise in half. Nothing more I can do.' : 'Got ore? Got fragments? Got patience? Two of three will do.'));
    return { lines, choices: [
      { label: 'Temper the blade', run: () => { w.ui.openShop('kettle'); } },
      { label: 'Leave', run: () => ({ lines: [L(K, 'Hrm.')] }) },
    ] };
  },
  draw(ctx, n) {
    const b = breath(n, 0.3);
    // Squat beetle-shelled smith with a leather apron and a hammer
    ctx.fillStyle = '#2a2420';
    ellipse(ctx, 0, -8, 9, 8 + b);
    ctx.fill();
    ctx.fillStyle = '#5a3a24';
    ctx.fillRect(-4, -9 + b, 8, 9);
    ctx.fillStyle = '#4a4a54';
    ellipse(ctx, -2, -14 + b, 7, 4);
    ctx.fill();
    fillCircle(ctx, 6, -10 + b, 2.5, '#6a5a4a');
    fillCircle(ctx, 7, -10.5 + b, 0.6, '#ffcf8a');
    ctx.save();
    ctx.translate(8, -8);
    ctx.rotate(-0.6 + Math.sin(n.t * 3) * 0.1);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(0, -0.6, 7, 1.2);
    ctx.fillStyle = '#6a6a74';
    ctx.fillRect(6, -2.5, 3, 5);
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Oriel (weaver)

export const oriel: NpcDef = {
  id: 'oriel', name: 'Oriel', title: 'Weaver of Threads', w: 14, h: 22,
  talk(w, n) {
    const O = 'Oriel';
    const lines: DLine[] = [];
    if (n.talks === 0) lines.push(L(O, 'Every relic you wear tugs on a thread of you. Too many, and you unravel.'), L(O, 'I can spin more of you. Not much more. Enough.'));
    else lines.push(L(O, `You bear ${w.progress.threadSlots} threads. ${w.progress.threadSlots >= 9 ? 'There is no more of you to spin.' : 'There is a little more to spin.'}`));
    return { lines, choices: [
      { label: 'Weave a thread', run: () => { w.ui.openShop('oriel'); } },
      { label: 'Leave', run: () => ({ lines: [L(O, 'Mind your edges.')] }) },
    ] };
  },
  draw(ctx, n) {
    const b = breath(n);
    // Moth-folk weaver: big soft wings folded like a shawl, feathery antennae
    ctx.fillStyle = '#c8b8a0';
    ctx.beginPath();
    ctx.moveTo(0, -18 + b);
    ctx.quadraticCurveTo(-9, -12, -6, 0);
    ctx.lineTo(6, 0);
    ctx.quadraticCurveTo(9, -12, 0, -18 + b);
    ctx.fill();
    ctx.fillStyle = '#a8987e';
    ellipse(ctx, -3, -8, 2, 4);
    ctx.fill();
    headCircle(ctx, -19 + b, 3.4, '#e8e0d0');
    fillCircle(ctx, 2, -19.5 + b, 1.3, '#2a2420');
    ctx.strokeStyle = '#8a7a60';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -22 + b);
    ctx.quadraticCurveTo(-3, -28, -5, -27);
    ctx.moveTo(1, -22 + b);
    ctx.quadraticCurveTo(4, -28, 6, -27);
    ctx.stroke();
    // A floating spindle
    glow(ctx, 8, -12 + Math.sin(n.t * 2) * 2, 6, '#f0d890', 0.6);
    fillCircle(ctx, 8, -12 + Math.sin(n.t * 2) * 2, 1.2, '#f0d890');
  },
};

// ---------------------------------------------------------------- Ossian (curator)

export const ossian: NpcDef = {
  id: 'ossian', name: 'Ossian', title: 'Curator of Lost Things', w: 12, h: 24,
  talk(w, n) {
    const O = 'Ossian';
    const p = w.progress;
    const soldCount = Object.keys(LOST_RELICS).filter((id) => hasFlag(p, `sold_${id}`)).length;
    if (questStage(p, 'curator') === 0) setQuest(w, 'curator', 1);
    if (soldCount >= 6 && !questDone(p, 'curator')) {
      setQuest(w, 'curator', 2, true);
      give(w, 'relic', 'lamplight_locket');
      return { lines: [L(O, 'The collection is complete. Six fragments of a dead kingdom, together again.'), L(O, 'I\'ll open the gallery to the village. They should see what they came from. And you should have this — it belonged to the first curator. It still remembers the sun.')] };
    }
    const unsold = p.lostRelics.filter((id) => !hasFlag(p, `sold_${id}`)).length;
    const lines = [L(O, n.talks === 0 ? 'The Veil eats history. I collect what it spits out. Lost Relics of Ilvane — I pay for each.' : `The gallery holds ${soldCount} of six relics.`)];
    if (unsold === 0) return { lines };
    return { lines, choices: [
      { label: 'Show relics', run: () => { w.ui.openShop('curator'); } },
      { label: 'Leave', run: () => ({ lines: [L(O, 'History is patient. I am less so.')] }) },
    ] };
  },
  draw(ctx, n) {
    const b = breath(n);
    robe(ctx, n, 9, 17 + b, '#2a2a3a', '#a8a0c0');
    headCircle(ctx, -19 + b, 3.6, '#d8d4dc');
    // Monocle and a tall collar
    ctx.strokeStyle = '#e8d890';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(2, -19.5 + b, 1.4, 0, Math.PI * 2);
    ctx.stroke();
    fillCircle(ctx, -0.5, -19.5 + b, 0.6, '#1a1a24');
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(-4, -16 + b, 8, 2);
    hat(ctx, -22 + b, 7, 6, '#1a1a24');
  },
};

// ---------------------------------------------------------------- Explorers (move home when found)

function explorer(id: string, name: string, title: string, flag: string, home: string, talkWild: (w: GameWorld, n: Npc) => DialogueScript, talkHome: string, draw: NpcDef['draw']): NpcDef {
  return {
    id, name, title, w: 12, h: 20,
    present: (p, room) => (room.startsWith('lw') ? hasFlag(p, flag) : !hasFlag(p, flag) && room === home),
    talk(w, n) {
      if (n.world.room.id.startsWith('lw')) return { lines: [L(name, talkHome)] };
      return talkWild(w, n);
    },
    draw,
  };
}

function sendHome(w: GameWorld, flag: string, name: string): void {
  setFlag(w.progress, flag);
  if (questStage(w.progress, 'expedition') === 0) setQuest(w, 'expedition', 1);
  w.ui.toast(`${name} heads home`, `${explorersFound(w.progress)} of 4 explorers found.`, 'quest');
}

export const pell = explorer('pell', 'Pell', 'Youngest of the Expedition', 'found_pell', 'mg_hollow', (w) => ({
  lines: [
    L('Pell', 'Don\'t— oh. Oh, you\'re not a root. Sorry. Everything here is a root until it isn\'t.'),
    L('Pell', 'The captain sent you? She\'s alive? I thought — the trees moved, and she was just gone, and I hid in here and I\'ve been hiding for... how long has it been?'),
    L('Pell', 'I can find the way back. I think. If you say the path is clear. Is it clear?'),
  ],
  choices: [{ label: 'The path is clear.', run: () => { sendHome(w, 'found_pell', 'Pell'); return { lines: [L('Pell', 'Okay. Okay okay okay. Running. Thank you!')] }; } }],
}), 'I told everyone at the inn about you. Nobody believes the bit where you hit a tree until it cried.', drawExplorer('#5a6a3a', '#a8c070', 0.85));

export const dorran = explorer('dorran', 'Dorran', 'Expedition Cartographer', 'found_dorran', 'gs_camp', (w) => ({
  lines: [
    L('Dorran', 'Stay back. Spores. I\'ve been breathing them for days and I\'m starting to dream with my eyes open.'),
    L('Dorran', 'I\'m not lost, I\'m mapping. The map keeps changing. The Warrens grow new tunnels when you\'re not looking.'),
    L('Dorran', '...Rhoswen is waiting? Stubborn woman. Fine. I suppose a map no one reads is just a drawing.'),
  ],
  choices: [{ label: 'Go home, Dorran.', run: () => { sendHome(w, 'found_dorran', 'Dorran'); give(w, 'frags', 120); return { lines: [L('Dorran', 'Take my survey fee. I won\'t need fragments if I\'m dreaming of mushrooms forever.')] }; } }],
}), 'The Warrens dreams are fading. I miss them a little. Don\'t tell Rhoswen.', drawExplorer('#6a4a3a', '#d8b080', 1));

export const ilka = explorer('ilka', 'Ilka', 'Expedition Crystalsmith', 'found_ilka', 'lc_grotto', (w) => ({
  lines: [
    L('Ilka', 'Listen. Hear that? The crystals are singing. They only sing to things that are alive. Isn\'t it beautiful?'),
    L('Ilka', 'Past here the dark is umbral — it eats the warmth right out of you. Old miners carried lanterns cut from the heart-crystal. There\'s one deeper in, I\'m sure of it.'),
    L('Ilka', 'Captain wants me home? I suppose I\'ve collected enough. My pockets are very heavy.'),
  ],
  choices: [{ label: 'Head home.', run: () => { sendHome(w, 'found_ilka', 'Ilka'); return { lines: [L('Ilka', 'If you find the heart-lantern, hold it up to your ear. It hums.')] }; } }],
}), 'Lanternwake\'s crystals are all wrong. They hum the wrong key. I\'m retuning them.', drawExplorer('#3a4a6a', '#9ad8ff', 0.95));

export const castor = explorer('castor', 'Castor', 'Expedition Scout', 'found_castor', 'dc_attic', (w) => ({
  lines: [
    L('Castor', 'Shh. Shh. It\'ll hear. The thing with the bell for a head. It walks the square every hour, except there are no hours anymore.'),
    L('Castor', 'I\'ve been up here counting its footsteps. Four hundred and twelve thousand. You want to know a secret? It\'s crying. Under the bell.'),
    L('Castor', 'Home? ...Yes. Yes, I think I\'d like that.'),
  ],
  choices: [{ label: 'Go. I\'ll keep it busy.', run: () => { sendHome(w, 'found_castor', 'Castor'); return { lines: [L('Castor', 'Don\'t let it ring.')] }; } }],
}), 'I still count footsteps. Yours are very quiet. That\'s good. Keep them quiet.', drawExplorer('#3a3a44', '#8a9aa8', 0.9));

function drawExplorer(coat: string, trim: string, s: number): NpcDef['draw'] {
  return (ctx, n) => {
    const b = breath(n);
    ctx.save();
    ctx.scale(s, s);
    robe(ctx, n, 10, 13 + b, coat, trim);
    // Backpack with bedroll
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(-7, -13 + b, 4, 8);
    ctx.fillStyle = '#8a6a4a';
    ellipse(ctx, -5, -14 + b, 2.5, 1.5);
    ctx.fill();
    headCircle(ctx, -16 + b, 3.6, '#e0ccb4');
    hood(ctx, -16 + b, 3.9, coat);
    eyes(ctx, n, 0.5, -16 + b, '#1a1410');
    lantern(ctx, 6, -10, '#ffcf8a', 0.6);
    ctx.restore();
  };
}

// ---------------------------------------------------------------- Hush (the silent child)

export const hush: NpcDef = {
  id: 'hush', name: 'Hush', title: '', w: 10, h: 16,
  present: (p, room) => {
    if (room === 'ab_threshold') return p.keys.includes('unworn_mask');
    return !p.keys.includes('unworn_mask');
  },
  talk(w, n) {
    const p = w.progress;
    const shards = ['mask_1', 'mask_2', 'mask_3'].filter((k) => p.keys.includes(k)).length;
    if (questStage(p, 'mask') === 0) setQuest(w, 'mask', 1);
    if (p.keys.includes('unworn_mask')) {
      if (!questDone(p, 'mask')) setQuest(w, 'mask', 2, true);
      setFlag(p, 'mask_whole');
      return { lines: [L('', 'The child reaches up and touches the Unworn Mask. Behind you, deep in the rock, a door you never saw grinds open.'), L('', 'Hush points down, into the dark. For the first time, it is smiling.')] };
    }
    const lines = [
      [L('', 'A small masked child watches you. It does not speak. It holds up a hand: three fingers.')],
      [L('', 'The child traces a crack across its own mask with one finger, then points at yours.')],
      [L('', 'Hush hums a few notes. You know the tune, though you have never heard it.')],
    ][Math.min(2, n.talks)];
    if (shards > 0) lines.push(L('', `It notices the ${shards === 1 ? 'shard' : 'shards'} you carry and nods, very seriously.`));
    return { lines };
  },
  draw(ctx, n) {
    const b = breath(n, 0.3);
    ctx.globalAlpha *= 0.8 + 0.2 * Math.sin(n.t);
    robe(ctx, n, 8, 10 + b, '#3a3644');
    hood(ctx, -12 + b, 3.4, '#2e2a38', 3);
    ctx.fillStyle = '#e8e4f0';
    ellipse(ctx, 1, -12 + b, 2.4, 2.8);
    ctx.fill();
    ctx.strokeStyle = '#4a4050';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, -14 + b);
    ctx.lineTo(1.5, -11 + b);
    ctx.stroke();
    glow(ctx, 0, -10, 14, '#c8b8ff', 0.25);
  },
};

// ---------------------------------------------------------------- Seraphel's echo (end-game, at the Abyss threshold)

export const seraphelEcho: NpcDef = {
  id: 'seraphel_echo', name: 'Echo of Seraphel', title: 'A memory that remembers you back', w: 14, h: 26,
  light: { r: 70, color: '#ffd8f0' },
  present: (p) => hasFlag(p, 'crown_spared'),
  talk(w) {
    const p = w.progress;
    const te = trueEndingReady(p);
    const lines = [
      L('Seraphel', 'There you are. I remembered you so hard that the Veil had no choice. I am sorry. You were never meant to carry this.'),
      L('Seraphel', 'Below us, Orun dreams. The dream is the Veil, and the nightmare is what the dream became when we forgot what was above.'),
    ];
    if (te.ok) lines.push(L('Seraphel', 'You carry every echo. You lit the lamp. You let me go. When you reach the Dreamer, do not take its place. Wake it — gently, the way I used to wake you.'));
    else lines.push(L('Seraphel', `The Veil still forgets too much. ${te.missing.join('; ')}. If you go now, you can only take the Dreamer\'s place.`));
    return { lines };
  },
  draw(ctx, n) {
    ctx.globalAlpha *= 0.75;
    const b = breath(n);
    robe(ctx, n, 12, 20 + b, 'rgba(240,210,230,0.7)');
    headCircle(ctx, -23 + b, 4, '#f8eef4');
    ctx.fillStyle = '#e8d090';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2 - 0.8, -26 + b);
      ctx.lineTo(i * 2, -30 + b);
      ctx.lineTo(i * 2 + 0.8, -26 + b);
      ctx.fill();
    }
    glow(ctx, 0, -14, 30, '#ffd8f0', 0.4);
  },
};

void staff;
export const VILLAGE_NPCS: NpcDef[] = [oldWick, marrow, tamsin, rhoswen, quenna, corvane, kettle, oriel, ossian, pell, dorran, ilka, castor, hush, seraphelEcho];
