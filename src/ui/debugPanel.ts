import { VehiclePhysics } from '../physics/vehiclePhysics';
import { TrackManager } from '../track/trackManager';

export class DebugPanel {
  private panelEl: HTMLElement;
  public isVisible: boolean = false;
  public wireframeEnabled: boolean = false;
  public collisionBoundsEnabled: boolean = false;

  private fps: number = 60;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();

  constructor(private onTeleport: (s_m: number) => void) {
    this.panelEl = document.createElement('div');
    this.panelEl.id = 'debug-panel';
    this.panelEl.classList.add('hidden');
    document.getElementById('game-container')!.appendChild(this.panelEl);

    this.renderBaseMarkup();
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.panelEl.classList.remove('hidden');
    } else {
      this.panelEl.classList.add('hidden');
    }
  }

  private renderBaseMarkup(): void {
    this.panelEl.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px; color: #ffb703;">BATHURST DEBUG TELEMETRY</div>
      <div id="debug-stats"></div>
      
      <div style="margin-top: 8px;">
        <label>Teleport Sector:</label><br/>
        <select id="debug-teleport-select" style="width: 100%; margin-top: 2px;">
          <option value="0">Pit Straight (0m)</option>
          <option value="240">Hell Corner (240m)</option>
          <option value="800">Mountain Straight (800m)</option>
          <option value="1400">Griffin's Bend (1400m)</option>
          <option value="1750">The Cutting (1750m)</option>
          <option value="2100">Reid Park (2100m)</option>
          <option value="2500">Sulman Park (2500m)</option>
          <option value="2900">McPhillamy Park (2900m)</option>
          <option value="3150">Brock's Skyline (3150m)</option>
          <option value="3320">The Esses / Dipper (3320m)</option>
          <option value="3700">Forrest's Elbow (3700m)</option>
          <option value="4200">Conrod Straight (4200m)</option>
          <option value="5150">The Chase (5150m)</option>
          <option value="5920">Murray's Corner (5920m)</option>
        </select>
        <button id="btn-teleport" style="width: 100%; margin-top: 4px;">TELEPORT</button>
      </div>

      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button id="btn-wireframe" style="flex: 1;">WIREFRAME</button>
        <button id="btn-collision" style="flex: 1;">COLLISION</button>
      </div>
    `;

    document.getElementById('btn-teleport')?.addEventListener('click', () => {
      const select = document.getElementById('debug-teleport-select') as HTMLSelectElement;
      const s = parseFloat(select.value);
      this.onTeleport(s);
    });

    document.getElementById('btn-wireframe')?.addEventListener('click', () => {
      this.wireframeEnabled = !this.wireframeEnabled;
      const btn = document.getElementById('btn-wireframe');
      if (btn) btn.style.background = this.wireframeEnabled ? '#0284c7' : '#0f172a';
    });

    document.getElementById('btn-collision')?.addEventListener('click', () => {
      this.collisionBoundsEnabled = !this.collisionBoundsEnabled;
      const btn = document.getElementById('btn-collision');
      if (btn) btn.style.background = this.collisionBoundsEnabled ? '#0284c7' : '#0f172a';
    });
  }

  public update(player: VehiclePhysics, track: TrackManager): void {
    if (!this.isVisible) return;

    // Track FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    const sample = track.sample(player.s_m);
    const statsEl = document.getElementById('debug-stats');
    if (!statsEl) return;

    statsEl.innerHTML = `
      <div>FPS: <strong>${this.fps}</strong></div>
      <div>Area: <strong>${sample.area}</strong></div>
      <div>Segment ID: <strong>${sample.segmentId} / 1242</strong></div>
      <div>Chainage (s): <strong>${player.s_m.toFixed(1)}m</strong> / 6213m</div>
      <div>Total Progress: <strong>${player.totalDistance_m.toFixed(1)}m</strong></div>
      <div>Speed: <strong>${(player.speedMs * 3.6).toFixed(1)} km/h</strong> (${player.speedMs.toFixed(1)} m/s)</div>
      <div>Lateral Offset: <strong>${player.lateralM.toFixed(2)}m</strong> (W: ${sample.roadWidth_m}m)</div>
      <div>Relative Elevation: <strong>${sample.height_m.toFixed(1)}m</strong></div>
      <div>Gradient: <strong>${sample.gradientPercent.toFixed(1)}%</strong></div>
      <div>Curvature: <strong>${sample.curvature.toFixed(5)}</strong> (${sample.curvature > 0 ? 'R' : sample.curvature < 0 ? 'L' : 'Straight'})</div>
    `;
  }
}
