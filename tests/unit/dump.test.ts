import { it } from 'vitest';
import { partialRooms } from '../../src/rooms/index';
import { doorReachability } from '../../src/rooms/reach';

// Development aid: DUMP=th_01,th_02 npx vitest run tests/unit/dump.test.ts
it('dump rooms', () => {
  const want = (process.env.DUMP ?? '').split(',').filter(Boolean);
  if (!want.length) return;
  const ab = JSON.parse(process.env.AB ?? '{}');
  for (const r of partialRooms()) {
    if (!want.includes(r.id) && !want.includes('all')) continue;
    console.log(`\n=== ${r.id} ===\n` + r.rows.map((row, i) => String(i).padStart(2) + ' ' + row).join('\n'));
    const bad = doorReachability(r, ab).filter((x) => !x.ok);
    console.log(bad.length ? 'UNREACHABLE: ' + bad.map((b) => `${b.from}->${b.to}`).join(', ') : 'all doors connected');
  }
});
