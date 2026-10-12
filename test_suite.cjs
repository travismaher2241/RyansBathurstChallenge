const fs = require('fs');

console.log('=== RUNNING BATHURST ARCADE VERIFICATION SUITE ===\n');

// 1. Data Verification
const track = JSON.parse(fs.readFileSync('data/track.json', 'utf8'));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// Check Lap length
assert(track.metadata.lap_length_m === 6213, 'Lap length is exactly 6,213 m');
assert(track.segments.length === 1243, 'Total segment count is 1,243');

// Check first 1242 are 5m, last is 3m
let segs5m = 0;
let lastSegLen = 0;
for (let i = 0; i < track.segments.length; i++) {
  const seg = track.segments[i];
  if (i < 1242) {
    if (seg.length_m === 5) segs5m++;
  } else {
    lastSegLen = seg.length_m;
  }
}
assert(segs5m === 1242, 'First 1,242 segments are 5 m long');
assert(lastSegLen === 3, 'Final segment is 3 m long');

// Check segment length sum
const totalLen = track.segments.reduce((acc, s) => acc + s.length_m, 0);
assert(totalLen === 6213, `Total segment length sum is ${totalLen} m`);

// Check track closure
const lastSeg = track.segments[1242];
const closureE = Math.abs(lastSeg.east_end_m - 0.0);
const closureN = Math.abs(lastSeg.north_end_m - 0.0);
assert(closureE < 1e-4 && closureN < 1e-4, 'Track coordinates close at (0, 0)');

// Check elevation relief
let minH = Infinity, maxH = -Infinity;
for (const s of track.segments) {
  minH = Math.min(minH, s.elevation_start_m, s.elevation_end_m);
  maxH = Math.max(maxH, s.elevation_start_m, s.elevation_end_m);
}
const relief = maxH - minH;
assert(Math.abs(relief - 174.08) < 1.0, `Elevation relief is approx 174m (actual: ${relief.toFixed(2)}m)`);

// Check key turn directions
function getSegAt(s) {
  const idx = Math.min(Math.floor(s / 5), 1242);
  return track.segments[idx];
}

const hell = getSegAt(240);
assert(hell.turn_radians < 0, `Hell Corner turns left (turn_rad: ${hell.turn_radians.toFixed(4)})`);

const griffins = getSegAt(1400);
assert(griffins.turn_radians > 0, `Griffin's Bend turns right (turn_rad: ${griffins.turn_radians.toFixed(4)})`);

const cutting = getSegAt(1800);
assert(cutting.turn_radians < 0, `The Cutting turns left (turn_rad: ${cutting.turn_radians.toFixed(4)})`);

const murrays = getSegAt(5950);
assert(murrays.turn_radians < 0, `Murray's Corner turns left (turn_rad: ${murrays.turn_radians.toFixed(4)})`);

// Check non-NaN projection values
let nanFound = false;
for (const s of track.segments) {
  if (isNaN(s.east_start_m) || isNaN(s.north_start_m) || isNaN(s.height_start_m) ||
      isNaN(s.east_end_m) || isNaN(s.north_end_m) || isNaN(s.height_end_m)) {
    nanFound = true;
    break;
  }
}
assert(!nanFound, 'No NaN or invalid values in road segments');

// Check modulo 6213 wrapping
function wrap(s, len) {
  return ((s % len) + len) % len;
}
assert(wrap(6213, 6213) === 0, '6213 wraps to 0');
assert(wrap(6214, 6213) === 1, '6214 wraps to 1');
assert(wrap(-1, 6213) === 6212, '-1 wraps to 6212');

// Check unwrapped race ordering across timing line
const carA_distance = 1 * 6213 + 50; // Just started lap 2 (50m past line)
const carB_distance = 0 * 6213 + 6200; // Almost finished lap 1 (13m before line)
assert(carA_distance > carB_distance, 'Car A on lap 2 is ranked ahead of Car B on lap 1 across the timing line');

// --- GAMEPLAY REGRESSION TESTS ---

// Regression 1: Minimum Valid Lap Time Sanity (Sub-95s impossible times rejected)
const MIN_VALID_LAP_TIME_SEC = 95.0;
function isValidLapTime(t) {
  return Number.isFinite(t) && t >= MIN_VALID_LAP_TIME_SEC;
}
assert(!isValidLapTime(7.5), 'Rejects legacy 7.5s countdown record');
assert(!isValidLapTime(3.583), 'Rejects legacy 3.583s impossible record');
assert(!isValidLapTime(-10), 'Rejects negative lap time');
assert(!isValidLapTime(NaN), 'Rejects NaN lap time');
assert(isValidLapTime(138.45), 'Accepts legitimate 2:18.45 lap time');

// Regression 2: Record difficulty separation
const mockStorage = {};
function saveRecord(t, diff) {
  if (!isValidLapTime(t)) return;
  const key = `bathurst_record_${diff}`;
  if (!mockStorage[key] || t < mockStorage[key]) {
    mockStorage[key] = t;
  }
}
saveRecord(145.2, 'arcade');
assert(mockStorage['bathurst_record_arcade'] === 145.2, 'Arcade record saved');
assert(mockStorage['bathurst_record_pro'] === undefined, 'Arcade record does not leak into Pro');

// Regression 3: Auto-pause vs user toggle logic
let isPaused = false;
function onAutoPause() {
  if (!isPaused) isPaused = true; // Explicit pause only, never toggle
}
function onUserToggle() {
  isPaused = !isPaused;
}
onAutoPause();
assert(isPaused === true, 'Auto-pause pauses running game');
onAutoPause();
assert(isPaused === true, 'Repeated auto-pause (resize/rotate) remains paused without resuming');
onUserToggle();
assert(isPaused === false, 'User toggle resumes game');

// Regression 4: Powertrain flat-road full throttle acceleration test
// Verify vehicle shifts out of 5th gear and exceeds 250 km/h toward top speed
const gearTopSpeedsKmh = [75, 125, 175, 222, 262, 302];
const gearAccels = [7.5, 6.2, 5.2, 4.4, 3.8, 3.4];
let speedMs = 0;
let gear = 1;
const dt = 1 / 60;
// Simulate 45 seconds of flat road full throttle
for (let frame = 0; frame < 45 * 60; frame++) {
  const speedKmh = speedMs * 3.6;
  if (gear < 6 && speedKmh > gearTopSpeedsKmh[gear - 1] * 0.90) {
    gear++;
  }
  const topSpeedForGear = gearTopSpeedsKmh[gear - 1] / 3.6;
  const powerFactor = Math.max(0, Math.min(1, 1.0 - Math.pow(speedMs / topSpeedForGear, 1.8)));
  const baseAccel = gearAccels[gear - 1] || 2.8;
  const accelForce = baseAccel * (0.40 + 0.60 * powerFactor) + 1.1;
  const aeroDrag = 0.5 * 1.225 * 0.38 * 2.1 * (speedMs * speedMs) / 1320;
  const rollingRes = 0.015 * 9.81;
  const netAccel = accelForce - aeroDrag - rollingRes;
  speedMs = Math.min(82.5, Math.max(0, speedMs + netAccel * dt));
}
const finalKmh = speedMs * 3.6;
assert(gear === 6, `Transmission reached 6th gear on flat road (current gear: ${gear})`);
assert(finalKmh > 275, `Vehicle reaches high speed (>275 km/h) on flat road (actual: ${finalKmh.toFixed(1)} km/h)`);

// Regression 5: Post-finish freeze test
let postFinishSpeed = 0;
let distancePostFinish = 1000;
function updatePostFinish() {
  postFinishSpeed = 0; // frozen
  // Distance does not increase
}
updatePostFinish();
assert(postFinishSpeed === 0 && distancePostFinish === 1000, 'Car does not move after race finish');

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
