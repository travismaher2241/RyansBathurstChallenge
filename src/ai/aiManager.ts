import { TrackManager } from '../track/trackManager';
import { TRACK_LAP_LENGTH_M, PHYSICS_CONFIG, AI_CONFIG } from '../config/gameConfig';
import { wrap, clamp, lerp } from '../utils/math';
import { GameSettings, CarChoice } from '../types/track';

export interface OpponentCar {
  id: number;
  name: string;
  liveryIndex: number;
  s_m: number;
  totalDistance_m: number;
  lateralM: number;
  speedMs: number;
  gear: number;
  rpm: number;
  steerAngle: number;
  isBraking: boolean;
  paceFactor: number;
  preferredLateralM: number;
  currentLap: number;
  lapStarted: boolean;
  finished: boolean;
  finishTime: number | null;
}

export class AIManager {
  public opponents: OpponentCar[] = [];

  constructor() {
    this.resetGrid('redbull');
  }

  public resetGrid(playerChoice: CarChoice = 'redbull'): void {
    this.opponents = [];
    const gridRoster = playerChoice === 'redbull'
      ? [
          { name: 'B. Kostecki', livery: 1 }, // Shell V-Power #17 (Arch-rival)
          { name: 'C. Mostert', livery: 4 },  // Mobil 1 Optus #25
          { name: 'C. Waters', livery: 2 },   // Monster Energy #6
          { name: 'M. Payne', livery: 3 },    // Penrite Racing #19
          { name: 'T. Randle', livery: 5 },   // Castrol Racing #55
          { name: 'J. Le Brocq', livery: 6 }, // Tradie Racing #34
          { name: 'N. Percat', livery: 7 },   // Bendix Racing #10
        ]
      : [
          { name: 'W. Brown', livery: 0 },    // Red Bull Ampol #888 (Arch-rival)
          { name: 'C. Mostert', livery: 4 },  // Mobil 1 Optus #25
          { name: 'C. Waters', livery: 2 },   // Monster Energy #6
          { name: 'M. Payne', livery: 3 },    // Penrite Racing #19
          { name: 'T. Randle', livery: 5 },   // Castrol Racing #55
          { name: 'J. Le Brocq', livery: 6 }, // Tradie Racing #34
          { name: 'N. Percat', livery: 7 },   // Bendix Racing #10
        ];

    // Place 7 opponents on the starting grid ahead of the player (grid boxes behind timing line)
    // Staggered grid on Pit Straight: slots at 6100m, 6120m, 6140m ... 6190m
    for (let i = 0; i < AI_CONFIG.carCount; i++) {
      const s = wrap(6100 + i * 14, TRACK_LAP_LENGTH_M);
      const lateral = (i % 2 === 0) ? -2.2 : 2.2;
      const pace = 0.86 + (i * 0.012); // P7 starts at 0.86, P1 leader at ~0.932
      const entry = gridRoster[i] || { name: `Driver ${i + 1}`, livery: (i + 1) % 8 };

      this.opponents.push({
        id: i + 1,
        name: entry.name,
        liveryIndex: entry.livery,
        s_m: s,
        totalDistance_m: s,
        lateralM: lateral,
        speedMs: 0,
        gear: 1,
        rpm: PHYSICS_CONFIG.idleRpm,
        steerAngle: 0,
        isBraking: false,
        paceFactor: pace,
        preferredLateralM: lateral,
        currentLap: 1,
        lapStarted: false,
        finished: false,
        finishTime: null,
      });
    }
  }

  public update(
    dt: number,
    track: TrackManager,
    player: { s_m: number; lateralM: number; speedMs: number; isGhost: boolean; isWallHit: boolean },
    settings: GameSettings,
    raceStarted: boolean,
    raceElapsedTime: number = 0,
    totalLaps: number = 3
  ): void {
    if (!raceStarted) return;

    for (let i = 0; i < this.opponents.length; i++) {
      const ai = this.opponents[i];
      const sample = track.sample(ai.s_m, settings.elevationExaggeration);
      const halfRoadW = sample.roadWidth_m * 0.5;

      // 1. Lookahead Corner Braking Analysis
      // Scan upcoming 140 metres for tight curvature
      let minSafeSpeedMs = PHYSICS_CONFIG.topSpeedMs * ai.paceFactor;
      const lookScanSteps = 7;
      const lookStepM = AI_CONFIG.lookaheadM / lookScanSteps;

      for (let step = 1; step <= lookScanSteps; step++) {
        const checkS = wrap(ai.s_m + step * lookStepM, TRACK_LAP_LENGTH_M);
        const checkSample = track.sample(checkS, settings.elevationExaggeration);
        const absCurv = Math.abs(checkSample.curvature);

        if (absCurv > 0.003) {
          // Corner ahead! Safe entry speed: v = sqrt(a_grip / abs(curvature))
          const grip = (settings.difficulty === 'arcade' ? 12.2 : 13.5) * ai.paceFactor;
          const cornerSafeV = Math.sqrt(grip / absCurv);
          // Account for braking distance needed
          const distToCheck = step * lookStepM;
          // v_target^2 = v_safe^2 + 2 * a_brake * dist
          const allowSpeed = Math.sqrt(cornerSafeV * cornerSafeV + 2 * 9.5 * distToCheck);
          if (allowSpeed < minSafeSpeedMs) {
            minSafeSpeedMs = allowSpeed;
          }
        }
      }

      // 2. Throttle / Brake Control
      if (ai.speedMs > minSafeSpeedMs + 1.5) {
        // Brake firmly before entry
        ai.isBraking = true;
        ai.speedMs = Math.max(0, ai.speedMs - 11.5 * dt);
      } else {
        ai.isBraking = false;
        // Accelerate up to target speed
        const accelRate = (settings.difficulty === 'arcade' ? 4.0 : 4.6) * ai.paceFactor;
        ai.speedMs = Math.min(minSafeSpeedMs, ai.speedMs + accelRate * dt);
      }

      // 3. Racing Line & Overtaking / Avoidance
      let targetLateral = 0;
      if (sample.curvature > 0.003) {
        targetLateral = halfRoadW * 0.55; // Right apex
      } else if (sample.curvature < -0.003) {
        targetLateral = -halfRoadW * 0.55; // Left apex
      } else {
        targetLateral = ai.preferredLateralM; // Cruising lane
      }

      // Avoid player if player is closely ahead
      const distToPlayer = wrap(player.s_m - ai.s_m, TRACK_LAP_LENGTH_M);
      if (distToPlayer > 0 && distToPlayer < AI_CONFIG.overtakeThresholdM) {
        if (Math.abs(ai.lateralM - player.lateralM) < 2.8) {
          targetLateral = player.lateralM > 0 ? player.lateralM - 3.2 : player.lateralM + 3.2;
        }
      }

      // Smooth steering toward target lateral position
      targetLateral = clamp(targetLateral, -halfRoadW + 1.2, halfRoadW - 1.2);
      const steerDelta = targetLateral - ai.lateralM;
      ai.steerAngle = clamp(steerDelta * 0.6, -1.0, 1.0);
      ai.lateralM = lerp(ai.lateralM, targetLateral, dt * 2.5);

      // 4. Update Distance & Lap Wrapping
      const deltaDist = ai.speedMs * dt;
      const prevS = ai.s_m;
      ai.s_m = wrap(ai.s_m + deltaDist, TRACK_LAP_LENGTH_M);
      ai.totalDistance_m += deltaDist;

      // Track AI laps
      if (prevS > 6000 && ai.s_m < 200) {
        if (!ai.lapStarted) {
          ai.lapStarted = true;
          ai.currentLap = 1;
        } else {
          ai.currentLap++;
          if (ai.currentLap > totalLaps && !ai.finished) {
            ai.finished = true;
            ai.finishTime = raceElapsedTime;
          }
        }
      }

      // 5. Player-AI Physical Collision
      if (!player.isGhost) {
        let dS = player.s_m - ai.s_m;
        if (dS > TRACK_LAP_LENGTH_M * 0.5) dS -= TRACK_LAP_LENGTH_M;
        if (dS < -TRACK_LAP_LENGTH_M * 0.5) dS += TRACK_LAP_LENGTH_M;

        const dLat = player.lateralM - ai.lateralM;

        if (Math.abs(dS) < 4.4 && Math.abs(dLat) < 2.0) {
          player.isWallHit = true; // Trigger contact sparks & sound
          const pushDir = Math.sign(dLat) || (Math.random() < 0.5 ? 1 : -1);
          const overlap = 2.0 - Math.abs(dLat);
          player.lateralM += pushDir * overlap * 0.5;
          ai.lateralM -= pushDir * overlap * 0.5;

          // Speed exchange
          if (dS > 0) {
            player.speedMs = Math.max(0, player.speedMs - 4.0 * dt);
            ai.speedMs = Math.min(PHYSICS_CONFIG.topSpeedMs, ai.speedMs + 2.5 * dt);
          } else {
            player.speedMs = Math.min(PHYSICS_CONFIG.topSpeedMs, player.speedMs + 2.5 * dt);
            ai.speedMs = Math.max(0, ai.speedMs - 4.0 * dt);
          }
        }
      }

      // Visual Gear and RPM
      ai.gear = Math.min(6, Math.max(1, Math.floor(ai.speedMs / 13) + 1));
      ai.rpm = lerp(PHYSICS_CONFIG.idleRpm, PHYSICS_CONFIG.redlineRpm, (ai.speedMs / PHYSICS_CONFIG.topSpeedMs));
    }
  }
}
