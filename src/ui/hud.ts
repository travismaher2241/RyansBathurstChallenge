import { VehiclePhysics } from '../physics/vehiclePhysics';
import { RaceManager } from '../state/raceManager';
import { AIManager } from '../ai/aiManager';
import { TrackManager } from '../track/trackManager';
import { formatLapTime } from '../utils/math';
import { loadBestLapTime, GameSettings } from '../config/gameConfig';

export class HUD {
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private readonly mapW = 120;
  private readonly mapH = 170;

  // Track coordinate bounding box
  private minEast: number = -900;
  private maxEast: number = 300;
  private minNorth: number = -2150;
  private maxNorth: number = 80;

  private currentArea: string = '';
  private areaToastTimer: number = 0;
  private lastAnnouncedArea: string = '';

  constructor(track: TrackManager) {
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = this.mapW;
    this.minimapCanvas.height = this.mapH;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    this.calculateBounds(track);
    this.renderBaseMinimap(track);
  }

  private calculateBounds(track: TrackManager): void {
    let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity;
    for (const seg of track.segments) {
      minE = Math.min(minE, seg.east_start_m);
      maxE = Math.max(maxE, seg.east_start_m);
      minN = Math.min(minN, seg.north_start_m);
      maxN = Math.max(maxN, seg.north_start_m);
    }
    this.minEast = minE - 50;
    this.maxEast = maxE + 50;
    this.minNorth = minN - 50;
    this.maxNorth = maxN + 50;
  }

  private mapToScreen(east: number, north: number): { x: number; y: number } {
    const pad = 10;
    const nx = (east - this.minEast) / (this.maxEast - this.minEast);
    // Invert North since North is +up but canvas Y is +down
    const ny = 1.0 - (north - this.minNorth) / (this.maxNorth - this.minNorth);
    return {
      x: pad + nx * (this.mapW - pad * 2),
      y: pad + ny * (this.mapH - pad * 2),
    };
  }

  private renderBaseMinimap(track: TrackManager): void {
    const ctx = this.minimapCtx;
    ctx.clearRect(0, 0, this.mapW, this.mapH);

    // Dark semi-transparent background
    ctx.fillStyle = 'rgba(10, 15, 25, 0.72)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.mapW, this.mapH, 8);
    ctx.fill();
    ctx.stroke();

    // Circuit centerline trace
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i < track.segments.length; i++) {
      const seg = track.segments[i];
      const pt = this.mapToScreen(seg.east_start_m, seg.north_start_m);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Start/Finish Line Indicator
    const finishPt = this.mapToScreen(0, 0);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(finishPt.x - 3, finishPt.y - 3, 6, 6);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    screenW: number,
    screenH: number,
    player: VehiclePhysics,
    race: RaceManager,
    ai: AIManager,
    track: TrackManager,
    settings: GameSettings,
    isTouchDevice: boolean = false
  ): void {
    // 1. Current Track Area Notification (Toast)
    const currentSample = track.sample(player.s_m);
    if (currentSample.area !== this.lastAnnouncedArea) {
      this.lastAnnouncedArea = currentSample.area;
      this.currentArea = currentSample.area;
      this.areaToastTimer = 3.2;
    }

    if (this.areaToastTimer > 0) {
      this.areaToastTimer -= 0.016;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 1.5;
      const toastW = 280;
      const toastH = 34;
      const toastX = (screenW - toastW) * 0.5;
      const toastY = 58;

      ctx.beginPath();
      ctx.roundRect(toastX, toastY, toastW, toastH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.currentArea.toUpperCase(), screenW * 0.5, toastY + toastH * 0.5);
    }

    // 2. Top-Left: Position or Best Time Badge
    if (race.mode === 'arcade') {
      const pos = race.getPlayerPosition();
      const posSuffix = ['ST', 'ND', 'RD', 'TH'][Math.min(pos - 1, 3)];

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(16, 16, 120, 52);
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 120, 52);

      ctx.fillStyle = '#8ecae6';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('POSITION', 24, 30);

      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${pos}${posSuffix}`, 24, 56);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('/ 8', 92, 56);
    } else {
      // Time Trial / Practice Badge
      const best = player.bestLapTime || loadBestLapTime(settings.difficulty);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(16, 16, 175, 54);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 175, 54);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BEST (${settings.difficulty.toUpperCase()})`, 24, 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(best ? formatLapTime(best) : '--:--.---', 24, 44);

      if (player.lastLapTime) {
        ctx.fillStyle = '#8ecae6';
        ctx.font = '8px monospace';
        ctx.fillText(`PREV: ${formatLapTime(player.lastLapTime)}`, 24, 58);
      }
    }

    // 3. Top-Right: Lap & Time Cluster
    const rightX = screenW - 16;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(rightX - 170, 16, 170, 52);
    ctx.strokeStyle = player.lapValid ? '#38bdf8' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(rightX - 170, 16, 170, 52);

    ctx.fillStyle = '#8ecae6';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(race.mode === 'arcade' ? `LAP ${player.currentLap}/${race.totalLaps}` : `LAP ${player.currentLap}`, rightX - 160, 30);

    if (!player.lapValid) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(player.lapInvalidReason || 'INVALID', rightX - 8, 30);
    }

    ctx.fillStyle = player.lapValid ? '#ffffff' : '#f87171';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatLapTime(player.currentLapTime), rightX - 160, 54);

    // 4. Minimap with Live Dots (Upper-Left on Touch to avoid left thumb, Bottom-Left on Desktop)
    const mapDrawX = 16;
    const mapDrawY = isTouchDevice ? 74 : (screenH - this.mapH - 16);
    ctx.drawImage(this.minimapCanvas, mapDrawX, mapDrawY);

    // Draw AI opponent dots on minimap
    if (race.mode === 'arcade') {
      for (const opp of ai.opponents) {
        const seg = track.getSegment(opp.s_m);
        const oppPt = this.mapToScreen(seg.east_start_m, seg.north_start_m);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(mapDrawX + oppPt.x, mapDrawY + oppPt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player dot on minimap (glowing green/yellow)
    const pSeg = track.getSegment(player.s_m);
    const pPt = this.mapToScreen(pSeg.east_start_m, pSeg.north_start_m);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(mapDrawX + pPt.x, mapDrawY + pPt.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 5. Bottom-Right: Speedometer & Tachometer Cluster (Raised on Touch to sit comfortably above right thumb pedals)
    const speedKmh = Math.round(player.speedMs * 3.6);
    const speedW = 210;
    const speedH = 74;
    const speedX = screenW - speedW - 16;
    const speedY = isTouchDevice ? (screenH - speedH - 96) : (screenH - speedH - 16);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(speedX, speedY, speedW, speedH);
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.strokeRect(speedX, speedY, speedW, speedH);

    // Digital Speed Display
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(speedKmh.toString().padStart(3, ' '), speedX + 120, speedY + 40);

    ctx.fillStyle = '#ffb703';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('KM/H', speedX + 126, speedY + 36);

    // Gear Indicator Box
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(speedX + 164, speedY + 12, 36, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(speedX + 164, speedY + 12, 36, 48);

    ctx.fillStyle = '#8ecae6';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GEAR', speedX + 182, speedY + 24);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(player.gear.toString(), speedX + 182, speedY + 48);

    // Tachometer RPM Bar Graph
    const barX = speedX + 12;
    const barY = speedY + 52;
    const barW = 142;
    const barH = 12;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);

    const rpmRatio = Math.min(1.0, (player.rpm - 1000) / 7200);
    const activeBarW = barW * rpmRatio;

    // Green -> Yellow -> Red Gradient
    const rpmGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    rpmGrad.addColorStop(0, '#22c55e');
    rpmGrad.addColorStop(0.65, '#eab308');
    rpmGrad.addColorStop(0.85, '#ef4444');
    ctx.fillStyle = rpmGrad;
    ctx.fillRect(barX, barY, activeBarW, barH);

    // Redline Tick
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX + barW * 0.88, barY - 2, 2, barH + 4);

    // 6. Central Banners (Countdown / Final Lap / Finish)
    if (race.state === 'countdown') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (race.countdownPhase > 0) {
        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 64px monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 12;
        ctx.fillText(race.countdownPhase.toString(), screenW * 0.5, screenH * 0.38);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 72px monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 16;
        ctx.fillText('GO!', screenW * 0.5, screenH * 0.38);
        ctx.shadowBlur = 0;
      }
    } else if (race.showFinalLapNotice) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px monospace';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 14;
      ctx.fillText('FINAL LAP!', screenW * 0.5, screenH * 0.35);
      ctx.shadowBlur = 0;
    }
  }
}
