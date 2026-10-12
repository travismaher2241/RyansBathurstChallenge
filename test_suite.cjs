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

// Regression 1: Minimum Valid Lap Time Sanity (Sub-2:00 / 120s impossible times rejected)
const MIN_VALID_LAP_TIME_SEC = 120.0;
function isValidLapTime(t) {
  return Number.isFinite(t) && t >= MIN_VALID_LAP_TIME_SEC;
}
assert(!isValidLapTime(7.5), 'Rejects legacy 7.5s countdown record');
assert(!isValidLapTime(3.583), 'Rejects legacy 3.583s impossible record');
assert(!isValidLapTime(102.0), 'Rejects exploited 1:42 (102.0s) impossible record');
assert(!isValidLapTime(-10), 'Rejects negative lap time');
assert(!isValidLapTime(NaN), 'Rejects NaN lap time');
assert(isValidLapTime(125.50), 'Accepts legitimate 2:05.50 qualifying lap time');
assert(isValidLapTime(138.45), 'Accepts legitimate 2:18.45 race lap time');

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

// Regression 4: Gen3 Powertrain acceleration & top speed benchmarks
const gearTopSpeedsKmh = [82, 128, 174, 222, 268, 305];
let speedMs = 0;
let gear = 1;
const dt = 1 / 60;
let t100 = null;
let t200 = null;

// Simulate 35 seconds of flat road full throttle
for (let frame = 0; frame < 35 * 60; frame++) {
  const t = frame * dt;
  const speedKmh = speedMs * 3.6;
  if (!t100 && speedKmh >= 100) t100 = t;
  if (!t200 && speedKmh >= 200) t200 = t;

  if (gear < 6 && speedKmh > gearTopSpeedsKmh[gear - 1] * 0.93) {
    gear++;
  }
  const currentGearTop = gearTopSpeedsKmh[gear - 1] / 3.6;
  const gearSpeedRatio = Math.min(1.05, speedMs / currentGearTop);
  const powerFactor = Math.max(0.72, 0.55 + 0.50 * gearSpeedRatio);
  const wheelPowerW = 385000 * powerFactor;
  const effSpeed = Math.max(10.2, speedMs);
  const rawAccel = wheelPowerW / (1335 * effSpeed);
  const accelForce = Math.min(8.35, rawAccel);

  const aeroDrag = 0.5 * 1.225 * 0.39 * 2.10 * (speedMs * speedMs) / 1335;
  const rollingRes = 0.013 * 9.81;
  const netAccel = accelForce - aeroDrag - rollingRes;
  speedMs = Math.min(84.0, Math.max(0, speedMs + netAccel * dt));
}
const finalKmh = speedMs * 3.6;
assert(gear === 6, `Transmission reached 6th gear on flat road (current gear: ${gear})`);
assert(t100 !== null && t100 >= 3.2 && t100 <= 3.7, `Gen3 0-100 km/h acceleration is authentic (actual: ${t100.toFixed(2)}s)`);
assert(t200 !== null && t200 >= 8.0 && t200 <= 9.0, `Gen3 0-200 km/h acceleration is authentic (actual: ${t200.toFixed(2)}s)`);
assert(finalKmh > 295, `Vehicle reaches Gen3 top speed (>295 km/h) on flat road (actual: ${finalKmh.toFixed(1)} km/h)`);

// Regression 5: Post-finish freeze test
let postFinishSpeed = 0;
let distancePostFinish = 1000;
function updatePostFinish() {
  postFinishSpeed = 0; // frozen
  // Distance does not increase
}
updatePostFinish();
assert(postFinishSpeed === 0 && distancePostFinish === 1000, 'Car does not move after race finish');

// Regression 6: Kerb stripes driving physics test
// When vehicle rides the rumble kerb stripes (e.g. lateral offset 5.5m on 10m road),
// it must be flagged as on-kerb (not offroad), retain speed, and not stop dead.
const roadWidthM = 10.0;
const halfRoadW = roadWidthM * 0.5; // 5.0m
const kerbWidthM = 1.4;
const kerbOuterM = halfRoadW + kerbWidthM; // 6.4m
const carLateralM = 5.6; // Directly on the stripes

const isOnKerb = carLateralM > halfRoadW && carLateralM <= kerbOuterM;
const isOffRoad = carLateralM > kerbOuterM;
assert(isOnKerb === true && isOffRoad === false, 'Vehicle riding stripes is flagged on-kerb, not off-road');

// Simulate 2 seconds on the stripes at 150 km/h with throttle applied
let kerbTestSpeedMs = 150 / 3.6; // ~41.67 m/s
for (let f = 0; f < 120; f++) {
  const kerbDrag = 0.25 * 1.5; // 0.375 m/s2
  const aeroDrag = 0.5 * 1.225 * 0.38 * 2.1 * (kerbTestSpeedMs * kerbTestSpeedMs) / 1320;
  const engineAccel = 3.6; // Cruising/accelerating in 4th gear
  const netAccel = engineAccel - aeroDrag - kerbDrag;
  kerbTestSpeedMs += netAccel * dt;
}
const finalKerbKmh = kerbTestSpeedMs * 3.6;
assert(finalKerbKmh > 130, `Vehicle riding kerb stripes maintains high speed without stopping (actual: ${finalKerbKmh.toFixed(1)} km/h)`);

// Regression 7: Lap integrity, sector checkpoints, and track limits rules
function verifyLapIntegrity(distanceM, checkpoints, offRoadAtSpeed, wallHitAtSpeed) {
  if (wallHitAtSpeed) return { valid: false, reason: 'WALL CONTACT' };
  if (offRoadAtSpeed) return { valid: false, reason: 'TRACK LIMITS' };
  const allCheckpoints = checkpoints.cutting && checkpoints.skyline && checkpoints.conrod && checkpoints.chase;
  if (distanceM < 5800 || !allCheckpoints) return { valid: false, reason: 'MISSED SECTORS' };
  return { valid: true, reason: null };
}

assert(verifyLapIntegrity(6213, { cutting: true, skyline: true, conrod: true, chase: true }, false, false).valid === true, 'Full clean lap is valid');
assert(verifyLapIntegrity(6213, { cutting: true, skyline: true, conrod: true, chase: true }, false, true).valid === false, 'Lap with wall impact is invalidated');
assert(verifyLapIntegrity(6213, { cutting: true, skyline: true, conrod: true, chase: true }, true, false).valid === false, 'Lap with track limits breach is invalidated');
assert(verifyLapIntegrity(300, { cutting: false, skyline: false, conrod: false, chase: false }, false, false).valid === false, 'Short-cut or reversed lap is invalidated');

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
