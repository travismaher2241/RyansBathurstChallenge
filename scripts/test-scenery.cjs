const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./register-typescript.cjs');
const { TrackManager } = require('../src/track/trackManager.ts');
const { createSceneryDetail, createRenderScenery, SceneryIndex, BRIDGE_LAYOUT } = require('../src/render/sceneryDetail.ts');
const { ROAD_KERB_WIDTH_M } = require('../src/track/trackBoundaries.ts');
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
for (const key of ['gum_0', 'gum_7', 'vine_row', 'orchard_tree', 'caravan', 'spectators', 'detail_pit', 'detail_hotel']) {
  assert.ok(detail.some(item => item.sprite_key === key), `${key} should survive road-clearance filtering`);
}
// Independent nearest-centreline sample check, including neighbouring folds.
for (const item of detail) {
  if (item.sprite_key === 'bridge') {
    const sample = track.sample(item.s_m);
    const pillarWidth = item.width_m_estimate * BRIDGE_LAYOUT.pillarWidth / BRIDGE_LAYOUT.canvasWidth;
    const openingHalf = item.width_m_estimate / 2 - pillarWidth;
    const verticalClearance = item.height_m_estimate * (1 - BRIDGE_LAYOUT.beamHeight / BRIDGE_LAYOUT.canvasHeight);
    assert.ok(openingHalf > sample.roadWidth_m / 2 + ROAD_KERB_WIDTH_M + .5, 'Bridge pillars must clear road and kerbs');
    assert.ok(verticalClearance >= 4.5, 'Bridge beam must clear vehicles');
    assert.equal(item.offset_right_m, 0);
    assert.equal(item.game_east_m, sample.east_m); assert.equal(item.game_north_m, sample.north_m);
    // Test both actual support footprints against every nearby road section.
    for (const side of [-1, 1]) {
      const offset = side * (item.width_m_estimate / 2 - pillarWidth / 2);
      const east = sample.east_m + sample.normalE * offset, north = sample.north_m + sample.normalN * offset;
      for (const segment of track.segments) {
        assert.ok(Math.hypot(east - segment.east_start_m, north - segment.north_start_m) >
          segment.road_width_m / 2 + ROAD_KERB_WIDTH_M + pillarWidth / 2, 'Bridge support intersects road');
      }
    }
    continue;
  }
  for (const segment of track.segments) {
    const distance = Math.hypot(item.game_east_m - segment.east_start_m, item.game_north_m - segment.north_start_m);
    const clearance = item.sprite_key.includes('sign') ? 1.49 : 4.99;
    assert.ok(distance >= segment.road_width_m / 2 + item.width_m_estimate / 2 + clearance, `${item.id} overlaps road`);
  }
}
const merged = createRenderScenery(track);
const bridges = merged.filter(item => item.sprite_key === 'bridge');
assert.equal(bridges.length, 3);
assert.equal(new Set(bridges.map(item => item.s_m)).size, bridges.length, 'No duplicate original/detail bridges');
assert.ok(!merged.some(item => ['rock_face', 'cutting_bank'].includes(item.sprite_key)), 'No legacy Cutting billboards');
const index = new SceneryIndex(detail, track.lapLength);
for (const s of [-15, 0, 1200, 3120, 5900, 6200, 6213, 12429]) {
  const expected = detail.filter(item => ((item.s_m - s) % 6213 + 6213) % 6213 < 500)
    .map(item => item.id).sort();
  assert.deepEqual(index.ahead(s, 500).map(item => item.id).sort(), expected, `Visibility query at ${s}m`);
}
assert.deepEqual(new SceneryIndex([], 6213).ahead(6200, 500), []);
assert.deepEqual(index.ahead(100, 0), []);
// Exercise the actual draw path: a nearer wall masks a distant sprite, not a
// sprite in front, and the mask is released before drawing the next object.
const { SceneryRenderer } = require('../src/render/sceneryRenderer.ts');
const renderer = new SceneryRenderer();
const point = (x, y) => ({ x, y, depthZ: 20, scale: 1, visible: true });
renderer.prepareScenery(track, { s_m: 0, project: () => ({ visible: false }) }, {}, 400, 300, 150, [{
  segment: track.segments[0], occluded: false, clipY: 300, hasLeftWall: true,
  p0WallBase: point(100, 200), p1WallBase: point(200, 200),
  p0WallTop: point(100, 100), p1WallTop: point(200, 100),
}]);
const sprite = { type: 'scenery', screenX: 150, screenY: 190, width: 40, height: 60, canvas: { width: 40, height: 60 }, clipY: 300 };
renderer.drawables = [{ ...sprite, depthZ: 30 }, { ...sprite, depthZ: 10 }];
let masked = false; const renderedMasks = [];
renderer.render({ save() {}, restore() { masked = false; }, beginPath() {}, rect() {}, moveTo() {}, lineTo() {}, closePath() {},
  clip(rule) { assert.equal(rule, 'evenodd'); masked = true; }, drawImage() { renderedMasks.push(masked); } });
assert.deepEqual(renderedMasks, [true, false], 'Only scenery behind the wall should be masked');
console.log(`Scenery checks passed: ${detail.length} deterministic decorations, road clearance, sector coverage, no data mutations, and lap-wrap visibility.`);
