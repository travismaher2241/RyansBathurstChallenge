import { TrackManager } from '../track/trackManager';
import { TRACK_LAP_LENGTH_M, PHYSICS_CONFIG, AI_CONFIG } from '../config/gameConfig';
import { wrap, clamp, lerp } from '../utils/math';
import { GameSettings } from '../types/track';

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
}

const AI_NAMES = [
  'P. Brock',
  'D. Johnson',
  'A. Moffat',
  'J. Richards',
  'G. Seton',
  'L. Perkins',
  'J. Bowe',
];

export class AIManager {
  public opponents: OpponentCar[] = [];

  constructor() {
    this.resetGrid();
  }

  public resetGrid(): void {
    this.opponents = [];
    // Place 7 opponents on the starting grid ahead of the player (grid boxes behind timing line)
    // In Bathurst, grid is on Pit Straight, staggered left and right:
    for (let i = 0; i < AI_CONFIG.carCount; i++) {
      const gridSlot = i + 1; // slots 1 to 7 ahead of player (who is in slot 8)
      // Staggered grid on Pit Straight: slots at 6100m, 6120m, 6140m ... 6190m
      const s = wrap(6100 + i * 14, TRACK_LAP_LENGTH_M);
      const lateral = (i % 2 === 0) ? -2.2 : 2.2;
      const pace = 0.94 + (i * 0.015); // Leader slightly faster

      this.opponents.push({
        id: i + 1,
        name: AI_NAMES[i % AI_NAMES.length],
        liveryIndex: (i + 1) % 8,
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
      });
    }
  }

  public update(
    dt: number,
    track: TrackManager,
    playerS: number,
    playerLateralM: number,
    playerSpeedMs: number,
    settings: GameSettings,
    raceStarted: boolean
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
          const grip = 12.8 * ai.paceFactor;
          const cornerSafeV = Math.sqrt(grip / absCurv);
          // Account for braking distance needed
          const distToCheck = step * lookStepM;
          // v_target^2 = v_safe^2 + 2 * a_brake * dist
          const allowSpeed = Math.sqrt(cornerSafeV * cornerSafeV + 2 * 9.0 * distToCheck);
          if (allowSpeed < minSafeSpeedMs) {
            minSafeSpeedMs = allowSpeed;
          }
        }
      }

      // 2. Throttle / Brake Control
      if (ai.speedMs > minSafeSpeedMs + 1.5) {
        // Brake firmly before entry
        ai.isBraking = true;
        ai.speedMs = Math.max(0, ai.speedMs - 11.0 * dt);
      } else {
        ai.isBraking = false;
        // Accelerate up to target speed
        const accelRate = 4.2 * ai.paceFactor;
        ai.speedMs = Math.min(minSafeSpeedMs, ai.speedMs + accelRate * dt);
      }

      // 3. Racing Line & Overtaking / Avoidance
      // Target apex: on right turn, hug right (positive lateral); on left turn, hug left (negative lateral)
      let targetLateral = 0;
      if (sample.curvature > 0.003) {
        targetLateral = halfRoadW * 0.55; // Right apex
      } else if (sample.curvature < -0.003) {
        targetLateral = -halfRoadW * 0.55; // Left apex
      } else {
        targetLateral = ai.preferredLateralM; // Cruising lane
      }

      // Avoid player if player is right ahead
      const distToPlayer = wrap(playerS - ai.s_m, TRACK_LAP_LENGTH_M);
      if (distToPlayer > 0 && distToPlayer < AI_CONFIG.overtakeThresholdM) {
        // Player is closely ahead! Steer away to overtake
        if (Math.abs(ai.lateralM - playerLateralM) < 2.8) {
          targetLateral = playerLateralM > 0 ? playerLateralM - 3.2 : playerLateralM + 3.2;
        }
      }

      // Smooth steering toward target lateral position
      targetLateral = clamp(targetLateral, -halfRoadW + 1.2, halfRoadW - 1.2);
      const steerDelta = targetLateral - ai.lateralM;
      ai.steerAngle = clamp(steerDelta * 0.6, -1.0, 1.0);
      ai.lateralM = lerp(ai.lateralM, targetLateral, dt * 2.5);

      // 4. Update Distance & Lap Wrapping
      const deltaDist = ai.speedMs * dt;
      ai.s_m = wrap(ai.s_m + deltaDist, TRACK_LAP_LENGTH_M);
      ai.totalDistance_m += deltaDist;

      // Visual Gear and RPM
      ai.gear = Math.min(6, Math.max(1, Math.floor(ai.speedMs / 13) + 1));
      ai.rpm = lerp(PHYSICS_CONFIG.idleRpm, PHYSICS_CONFIG.redlineRpm, (ai.speedMs / PHYSICS_CONFIG.topSpeedMs));
    }
  }
}
