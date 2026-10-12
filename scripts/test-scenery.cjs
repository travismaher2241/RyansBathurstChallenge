const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the actual TS modules without a browser, bundler, or generated files.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const { TrackManager } = require('../src/track/trackManager.ts');
const { createSceneryDetail, SceneryIndex } = require('../src/render/sceneryDetail.ts');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/track.json'), 'utf8'));
const original = JSON.stringify(data);
const track = new TrackManager(data);
const originalScenery = JSON.stringify(track.scenery);
const detail = createSceneryDetail(track);
assert.equal(JSON.stringify(data), original, 'Track data must be untouched');
assert.equal(JSON.stringify(track.scenery), originalScenery, 'No decorative objects enter the physics scenery collection');
assert.deepEqual(createSceneryDetail(track), detail, 'Scenery must be identical between runs');
assert.ok(detail.length > 300 && detail.length < 1500, 'Keep a bounded, useful scenery budget');
assert.ok(detail.every(item => !item.collidable && Number.isFinite(item.game_east_m) && Number.isFinite(item.game_north_m)));
assert.equal(new Set(detail.map(item => item.id)).size, detail.length);
for (const key of ['gum_0', 'gum_7', 'vine_row', 'orchard_tree', 'cutting_bank', 'caravan', 'spectators', 'detail_pit', 'detail_hotel']) {
  assert.ok(detail.some(item => item.sprite_key === key), `${key} should survive road-clearance filtering`);
}
// Independent nearest-centreline sample check, including neighbouring folds.
for (const item of detail) {
  for (const segment of track.segments) {
    const distance = Math.hypot(item.game_east_m - segment.east_start_m, item.game_north_m - segment.north_start_m);
    assert.ok(distance >= segment.road_width_m / 2 + item.width_m_estimate / 2 + 4.9, `${item.id} overlaps road`);
  }
}
const index = new SceneryIndex(detail, track.lapLength);
for (const s of [-15, 0, 1200, 3120, 5900, 6200, 6213, 12429]) {
  const expected = detail.filter(item => ((item.s_m - s) % 6213 + 6213) % 6213 < 500)
    .map(item => item.id).sort();
  assert.deepEqual(index.ahead(s, 500).map(item => item.id).sort(), expected, `Visibility query at ${s}m`);
}
assert.deepEqual(new SceneryIndex([], 6213).ahead(6200, 500), []);
assert.deepEqual(index.ahead(100, 0), []);
console.log(`Scenery checks passed: ${detail.length} deterministic decorations, road clearance, sector coverage, no data mutations, and lap-wrap visibility.`);
