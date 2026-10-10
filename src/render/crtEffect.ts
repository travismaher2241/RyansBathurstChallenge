export class CrtEffect {
  private patternCanvas: HTMLCanvasElement;
  private pattern: CanvasPattern | null = null;

  constructor() {
    this.patternCanvas = document.createElement('canvas');
    this.patternCanvas.width = 4;
    this.patternCanvas.height = 4;
    const ctx = this.patternCanvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fillRect(0, 0, 4, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 2, 4, 2);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.pattern) {
      this.pattern = ctx.createPattern(this.patternCanvas, 'repeat');
    }
    if (this.pattern) {
      ctx.fillStyle = this.pattern;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle vignette around edges
    const grad = ctx.createRadialGradient(
      width * 0.5, height * 0.5, Math.min(width, height) * 0.35,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.7
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}
