import { CarInputs } from '../physics/vehiclePhysics';

export class InputManager {
  private keysDown: Set<string> = new Set();
  public pauseRequested: boolean = false;
  public restartRequested: boolean = false;
  public resetRequested: boolean = false;
  public debugToggleRequested: boolean = false;

  // Touch states
  public touchSteerLeft: boolean = false;
  public touchSteerRight: boolean = false;
  public touchGas: boolean = false;
  public touchBrake: boolean = false;
  public touchShiftUp: boolean = false;
  public touchShiftDown: boolean = false;

  // Debouncing / edge detection states
  private prevShiftUpRaw: boolean = false;
  private prevShiftDownRaw: boolean = false;
  private prevGamepadPause: boolean = false;

  private isTouchDevice: boolean = false;

  constructor() {
    this.setupKeyboardListeners();
    this.setupWindowListeners();
    this.detectTouchDevice();
    this.setupTouchControls();
  }

  private detectTouchDevice(): void {
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.isTouchDevice = isMobileUserAgent || hasCoarsePointer || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const touchOverlay = document.getElementById('touch-controls');
    if (touchOverlay) {
      if (this.isTouchDevice) {
        touchOverlay.classList.remove('hidden');
      } else {
        touchOverlay.classList.add('hidden');
      }
    }

    // If user touches the screen anywhere, automatically enable touch controls
    const onTouch = () => {
      this.isTouchDevice = true;
      if (touchOverlay) touchOverlay.classList.remove('hidden');
    };
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') onTouch();
    }, { passive: true });
  }

  public get isTouchDeviceActive(): boolean {
    return this.isTouchDevice;
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scrolling with arrow keys / space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      this.keysDown.add(e.code);
      this.keysDown.add(e.key.toLowerCase());

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.pauseRequested = true;
      }
      if (e.code === 'KeyR') {
        this.resetRequested = true;
      }
      if (e.code === 'Backquote' || e.key === '`' || e.key === '~') {
        this.debugToggleRequested = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      this.keysDown.delete(e.key.toLowerCase());
    });
  }

  private setupWindowListeners(): void {
    // Release all active inputs and request pause when window loses focus
    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.touchSteerLeft = false;
      this.touchSteerRight = false;
      this.touchGas = false;
      this.touchBrake = false;
      this.touchShiftUp = false;
      this.touchShiftDown = false;
      this.pauseRequested = true;
    });

    // Check orientation on mobile
    window.addEventListener('resize', () => this.checkOrientation());
    window.addEventListener('orientationchange', () => this.checkOrientation());
    this.checkOrientation();
  }

  private checkOrientation(): void {
    const rotateOverlay = document.getElementById('rotate-device-overlay');
    if (!rotateOverlay) return;
    const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 800;
    if (isPortrait) {
      rotateOverlay.classList.remove('hidden');
      this.pauseRequested = true; // Auto-pause when rotated to portrait
    } else {
      rotateOverlay.classList.remove('hidden');
      rotateOverlay.classList.add('hidden');
    }
  }

  private setupTouchControls(): void {
    const bindBtn = (id: string, onDown: () => void, onUp: () => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e: Event) => {
        e.preventDefault();
        el.classList.add('active');
        onDown();
      };
      const end = (e: Event) => {
        e.preventDefault();
        el.classList.remove('active');
        onUp();
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
    };

    bindBtn('touch-steer-left', () => { this.touchSteerLeft = true; }, () => { this.touchSteerLeft = false; });
    bindBtn('touch-steer-right', () => { this.touchSteerRight = true; }, () => { this.touchSteerRight = false; });
    bindBtn('touch-gas', () => { this.touchGas = true; }, () => { this.touchGas = false; });
    bindBtn('touch-brake', () => { this.touchBrake = true; }, () => { this.touchBrake = false; });
    bindBtn('touch-shift-up', () => { this.touchShiftUp = true; }, () => { this.touchShiftUp = false; });
    bindBtn('touch-shift-down', () => { this.touchShiftDown = true; }, () => { this.touchShiftDown = false; });

    const btnReset = document.getElementById('touch-reset');
    if (btnReset) {
      btnReset.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.resetRequested = true;
      });
    }

    const btnPause = document.getElementById('touch-pause');
    if (btnPause) {
      btnPause.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.pauseRequested = true;
      });
    }

    const btnFullscreen = document.getElementById('touch-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else if ((document.documentElement as any).webkitRequestFullscreen) {
            (document.documentElement as any).webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
      });

      const updateFsLabel = () => {
        if (document.fullscreenElement) {
          btnFullscreen.textContent = '✕ EXIT';
          btnFullscreen.setAttribute('aria-label', 'Exit Fullscreen');
        } else {
          btnFullscreen.textContent = '⛶ FULL';
          btnFullscreen.setAttribute('aria-label', 'Toggle Fullscreen');
        }
      };
      document.addEventListener('fullscreenchange', updateFsLabel);
      document.addEventListener('webkitfullscreenchange', updateFsLabel);
    }
  }

  // Polled on every requestAnimationFrame frame (whether paused or playing)
  public pollGlobalFrame(): void {
    const gamepad = this.pollGamepad();
    if (gamepad) {
      if (gamepad.pause && !this.prevGamepadPause) {
        this.pauseRequested = true; // Leading edge pause toggle
      }
      this.prevGamepadPause = gamepad.pause;
    } else {
      this.prevGamepadPause = false;
    }
  }

  public getInputs(): CarInputs {
    let throttle = 0;
    let brake = 0;
    let steer = 0;
    let handbrake = false;

    // 1. Keyboard Inputs
    if (this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW') || this.keysDown.has('w')) {
      throttle = 1.0;
    }
    if (this.keysDown.has('ArrowDown') || this.keysDown.has('KeyS') || this.keysDown.has('s')) {
      brake = 1.0;
    }
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA') || this.keysDown.has('a')) {
      steer -= 1.0;
    }
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD') || this.keysDown.has('d')) {
      steer += 1.0;
    }
    if (this.keysDown.has('Space')) {
      handbrake = true;
    }

    // 2. Touch Controls Overrides
    if (this.touchGas) throttle = 1.0;
    if (this.touchBrake) brake = 1.0;
    if (this.touchSteerLeft) steer -= 1.0;
    if (this.touchSteerRight) steer += 1.0;

    // 3. Gamepad Input
    const gamepad = this.pollGamepad();
    let gpShiftUp = false;
    let gpShiftDown = false;
    if (gamepad) {
      if (gamepad.throttle > 0.05) throttle = Math.max(throttle, gamepad.throttle);
      if (gamepad.brake > 0.05) brake = Math.max(brake, gamepad.brake);
      if (Math.abs(gamepad.steer) > 0.05) steer = gamepad.steer;
      if (gamepad.handbrake) handbrake = true;
      if (gamepad.reset) this.resetRequested = true;
      gpShiftUp = gamepad.shiftUp;
      gpShiftDown = gamepad.shiftDown;
    }

    // 4. Edge-triggered single gear shifts (prevents holding key from shifting all 6 gears)
    const isShiftUpRaw = this.keysDown.has('KeyE') || this.keysDown.has('ShiftRight') || gpShiftUp || this.touchShiftUp;
    const isShiftDownRaw = this.keysDown.has('KeyQ') || this.keysDown.has('ControlRight') || gpShiftDown || this.touchShiftDown;

    const shiftUp = isShiftUpRaw && !this.prevShiftUpRaw;
    const shiftDown = isShiftDownRaw && !this.prevShiftDownRaw;

    this.prevShiftUpRaw = isShiftUpRaw;
    this.prevShiftDownRaw = isShiftDownRaw;

    const reset = this.resetRequested;
    this.resetRequested = false;

    return {
      throttle,
      brake,
      steer: Math.max(-1.0, Math.min(1.0, steer)),
      handbrake,
      shiftUp,
      shiftDown,
      reset,
    };
  }

  private pollGamepad(): { throttle: number; brake: number; steer: number; handbrake: boolean; shiftUp: boolean; shiftDown: boolean; pause: boolean; reset: boolean } | null {
    if (!navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return null;
    const gp = gamepads[0];

    const steer = gp.axes[0] || 0;
    const triggerGas = gp.buttons[7] ? gp.buttons[7].value : 0;
    const buttonGas = gp.buttons[0] && gp.buttons[0].pressed ? 1.0 : 0;
    const throttle = Math.max(triggerGas, buttonGas);

    const triggerBrake = gp.buttons[6] ? gp.buttons[6].value : 0;
    const buttonBrake = gp.buttons[2] && gp.buttons[2].pressed ? 1.0 : 0;
    const brake = Math.max(triggerBrake, buttonBrake);

    const handbrake = !!(gp.buttons[1] && gp.buttons[1].pressed); // B button
    const shiftUp = !!(gp.buttons[5] && gp.buttons[5].pressed); // RB
    const shiftDown = !!(gp.buttons[4] && gp.buttons[4].pressed); // LB
    const pause = !!(gp.buttons[9] && gp.buttons[9].pressed);
    const reset = !!((gp.buttons[8] && gp.buttons[8].pressed) || (gp.buttons[3] && gp.buttons[3].pressed));

    return { throttle, brake, steer, handbrake, shiftUp, shiftDown, pause, reset };
  }
}
