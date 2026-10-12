require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { VehiclePhysics } = require('../src/physics/vehiclePhysics.ts');
const { TrackManager } = require('../src/track/trackManager.ts');
const { RaceManager } = require('../src/state/raceManager.ts');
const { AIManager } = require('../src/ai/aiManager.ts');
const { BATHURST_SECTORS } = require('../src/ui/menus.ts');
const { DEFAULT_SETTINGS, PHYSICS_CONFIG, loadBestLapTime, saveBestLapTime } = require('../src/config/gameConfig.ts');
const { getCuttingWallOffset, CAR_HALF_WIDTH_M } = require('../src/track/trackBoundaries.ts');
const track = new TrackManager(JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/track.json'), 'utf8')));
const flat = { sample: s => ({ ...track.sample(s), curvature: 0, gradientPercent: 0, roadWidth_m: 12 }) };
const storage = new Map();
global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
const sound = { playCountdown() {}, playFinish() {}, stopAll() {} };
const dt = 1 / 60;
const gas = { throttle: 1, brake: 0, steer: 0, handbrake: false };
let passed = 0;
const test = (name, fn) => { storage.clear(); fn(); passed++; console.log(`[PASS] ${name}`); };
const step = (car, frames, settings = DEFAULT_SETTINGS, input = gas, circuit = flat) => {
  for (let i = 0; i < frames; i++) car.update(dt, input, circuit, settings);
};
function lap(car, settings, onFrame = () => {}) {
  const initialLap = car.currentLap;
  for (let i = 0; i < 60 * 400 && car.currentLap === initialLap; i++) {
    onFrame(car);
    car.update(dt, { ...gas, throttle: .2 }, flat, settings);
  }
  assert.equal(car.currentLap, initialLap + 1, 'A full lap must finish');
}

test('Actual automatic powertrain: acceleration, sixth gear and top speed', () => {
  const p = new VehiclePhysics(); let t100, t200;
  for (let i = 0; i < 2100; i++) {
    p.update(dt, gas, flat, DEFAULT_SETTINGS);
    if (t100 === undefined && p.speedMs * 3.6 >= 100) t100 = (i + 1) * dt;
    if (t200 === undefined && p.speedMs * 3.6 >= 200) t200 = (i + 1) * dt;
  }
  assert.ok(t100 >= 3.2 && t100 <= 3.7); assert.ok(t200 >= 8 && t200 <= 9);
  assert.equal(p.gear, 6); assert.ok(p.speedMs * 3.6 > 295);
});
for (let gear = 1; gear <= 6; gear++) test(`Manual gear ${gear} cannot power beyond its redline`, () => {
  const p = new VehiclePhysics(); p.gear = gear;
  step(p, 3600, { ...DEFAULT_SETTINGS, transmission: 'manual' });
  assert.equal(p.gear, gear);
  assert.ok(p.speedMs * 3.6 <= PHYSICS_CONFIG.gearTopSpeedsKmh[gear - 1] + .5);
  assert.ok(p.speedMs * 3.6 > PHYSICS_CONFIG.gearTopSpeedsKmh[gear - 1] * .94);
  assert.ok(p.rpm <= PHYSICS_CONFIG.redlineRpm);
});
test('Manual upshift restores acceleration; unsafe downshift is rejected', () => {
  const p = new VehiclePhysics(), settings = { ...DEFAULT_SETTINGS, transmission: 'manual' };
  step(p, 1200, settings); const firstTop = p.speedMs;
  step(p, 1, settings, { ...gas, shiftUp: true }); step(p, 240, settings);
  assert.equal(p.gear, 2); assert.ok(p.speedMs > firstTop + 5);
  step(p, 1, settings, { ...gas, shiftDown: true }); assert.equal(p.gear, 2);
  p.speedMs = 15; step(p, 1, settings, { ...gas, shiftDown: true }); assert.equal(p.gear, 1);
});
test('Kerb riding retains speed without off-road or wall penalties', () => {
  const p = new VehiclePhysics(0, 6.6); p.speedMs = 150 / 3.6;
  step(p, 120); assert.ok(p.isOnKerb); assert.ok(!p.isOffRoad && !p.isWallHit);
  assert.ok(p.speedMs * 3.6 > 145); assert.ok(p.lapValid);
});
test('Sustained grass excursion invalidates the lap', () => {
  const p = new VehiclePhysics(0, 7.6); p.speedMs = 40;
  step(p, 30); assert.equal(p.lapValid, false); assert.equal(p.lapInvalidReason, 'TRACK LIMITS');
});
test('The Cutting collision meets the visible wall at the car body', () => {
  for (const s of [1450, 1510, 1750, 1930, 1955]) {
    const p = new VehiclePhysics(s); const edge = getCuttingWallOffset(track.sample(s).roadWidth_m);
    p.lateralM = -(edge - CAR_HALF_WIDTH_M + .3); p.speedMs = 12;
    step(p, 1, DEFAULT_SETTINGS, { ...gas, throttle: 0 }, track);
    assert.ok(p.isWallHit); assert.ok(Math.abs(p.lateralM) + CAR_HALF_WIDTH_M <= edge + 1e-6);
    assert.equal(p.lapValid, false);
  }
});
test('Reset input invalidates this lap and preserves an earlier session best', () => {
  const p = new VehiclePhysics(); p.resetAll(0, 0, true); p.bestLapTime = 140;
  step(p, 1, DEFAULT_SETTINGS, { ...gas, reset: true });
  assert.equal(p.lapValid, false); assert.equal(p.lapInvalidReason, 'CAR RESET');
  assert.equal(p.bestLapTime, 140); assert.ok(p.isGhost);
});
test('A reset-containing lap cannot save; the next clean lap can', () => {
  const p = new VehiclePhysics(); p.resetAll(0, 0, true);
  let reset = false;
  lap(p, DEFAULT_SETTINGS, car => { if (!reset && car.s_m > 2000) { car.resetToTrack(); reset = true; } });
  assert.equal(loadBestLapTime('arcade'), null);
  assert.ok(p.lapValid); lap(p, DEFAULT_SETTINGS); assert.ok(loadBestLapTime('arcade') > 120);
});
test('First Pro Practice lap saves only to Pro, through actual race startup', () => {
  const p = new VehiclePhysics(), race = new RaceManager(), ai = new AIManager();
  const settings = { ...DEFAULT_SETTINGS, difficulty: 'pro' };
  race.startRace('practice', p, ai, sound, settings); lap(p, settings);
  assert.ok(loadBestLapTime('pro') > 120); assert.equal(loadBestLapTime('arcade'), null);
});
test('Record storage rejects impossible times and keeps difficulties separate', () => {
  for (const time of [-1, NaN, 7.5, 102]) saveBestLapTime(time, 'arcade');
  assert.equal(loadBestLapTime(), null);
  saveBestLapTime(138.45, 'arcade'); saveBestLapTime(125.5, 'pro');
  assert.equal(loadBestLapTime('arcade'), 138.45); assert.equal(loadBestLapTime('pro'), 125.5);
});
test('Skipping sectors cannot save a record', () => {
  const p = new VehiclePhysics(); p.resetAll(6200, 0, true); p.currentLapTime = 150;
  p.speedMs = 30; step(p, 60);
  assert.equal(p.currentLap, 2); assert.equal(loadBestLapTime(), null);
});
test('Practice destinations match their actual track sectors', () => {
  const expected = ['Pit Straight','Hell Corner','Mountain Straight',"Griffin's Bend",'The Cutting','Reid Park','McPhillamy Park',"Brock's Skyline",'The Esses',"Forrest's Elbow",'Conrod Straight','The Chase',"Murray's Corner"];
  BATHURST_SECTORS.forEach((sector, i) => assert.ok(track.sample(sector.s).area.replace(/’/g, "'").includes(expected[i]), sector.name));
});
test('Three-lap Arcade flow finishes, freezes player, and rejects invalid laps', () => {
  const p = new VehiclePhysics(), ai = new AIManager(), race = new RaceManager();
  race.startRace('arcade', p, ai, sound, DEFAULT_SETTINGS);
  for (let i = 0; i < 60 * 700 && race.state !== 'finished'; i++) {
    p.update(dt, { ...gas, throttle: race.state === 'countdown' ? -1 : 1 }, track, DEFAULT_SETTINGS);
    ai.update(dt, track, p, DEFAULT_SETTINGS, race.state === 'racing', race.raceElapsedTime, race.totalLaps);
    race.update(dt, p, ai, sound, DEFAULT_SETTINGS);
  }
  assert.equal(race.state, 'finished'); assert.equal(p.currentLap, 4); assert.equal(p.speedMs, 0);
  assert.equal(race.standings.length, 8); assert.equal(loadBestLapTime(), null);
});
console.log(`${passed} production-module gameplay checks passed.`);
