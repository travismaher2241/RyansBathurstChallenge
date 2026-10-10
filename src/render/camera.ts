import { CAMERA_CONFIG } from '../config/gameConfig';
import { angleDiff, lerp } from '../utils/math';

export interface ProjectedPoint {
  x: number;       // Screen X
  y: number;       // Screen Y
  scale: number;   // Perspective scale (focal / Z)
  depthZ: number;  // Camera forward distance Z
  visible: boolean;
}

export class Camera {
  public s_m: number = 0;
  public lateralOffset_m: number = 0; // Relative to track centreline
  public heightOffset_m: number = CAMERA_CONFIG.heightM;
  public worldEast_m: number = 0;
  public worldNorth_m: number = 0;
  public worldHeight_m: number = 0;

  public headingRad: number = 0; // Clockwise from North
  public pitchRad: number = 0;

  public focalLength: number = CAMERA_CONFIG.focalLength;
  public nearPlane: number = CAMERA_CONFIG.nearPlaneM;

  public updatePosition(
    trackS: number,
    playerLateralM: number,
    trackEast: number,
    trackNorth: number,
    trackHeight: number,
    targetHeadingRad: number,
    targetPitchRad: number,
    dt: number
  ): void {
    this.s_m = trackS;
    this.lateralOffset_m = playerLateralM;
    this.worldEast_m = trackEast;
    this.worldNorth_m = trackNorth;
    this.worldHeight_m = trackHeight + this.heightOffset_m;

    // Smooth heading follow
    const diffH = angleDiff(targetHeadingRad, this.headingRad);
    const alphaH = Math.min(1.0, CAMERA_CONFIG.smoothingAlpha * (dt * 60));
    this.headingRad += diffH * alphaH;

    // Smooth pitch follow
    const alphaP = Math.min(1.0, CAMERA_CONFIG.smoothingAlpha * 0.7 * (dt * 60));
    this.pitchRad = lerp(this.pitchRad, targetPitchRad, alphaP);
  }

  public project(
    worldE: number,
    worldN: number,
    worldH: number,
    screenW: number,
    screenH: number,
    horizonY: number
  ): ProjectedPoint {
    const dE = worldE - this.worldEast_m;
    const dN = worldN - this.worldNorth_m;
    const dH = worldH - this.worldHeight_m;

    // Camera axes:
    // Forward vector is (sin(heading), cos(heading))
    // Right vector is (cos(heading), -sin(heading))
    const sinH = Math.sin(this.headingRad);
    const cosH = Math.cos(this.headingRad);

    const camZ = dE * sinH + dN * cosH;
    const camX = dE * cosH - dN * sinH;
    // Apply camera pitch
    const camY = dH - camZ * Math.tan(this.pitchRad);

    if (camZ <= this.nearPlane) {
      return { x: 0, y: 0, scale: 0, depthZ: camZ, visible: false };
    }

    const scale = this.focalLength / camZ;
    const halfW = screenW * 0.5;

    const screenX = halfW + camX * scale * halfW;
    const screenY = horizonY - camY * scale * halfW;

    return {
      x: screenX,
      y: screenY,
      scale: scale * halfW,
      depthZ: camZ,
      visible: true,
    };
  }
}
