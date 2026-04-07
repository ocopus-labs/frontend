/**
 * KDS (Kitchen Display System) event-specific sounds using Web Audio API.
 * Each function creates oscillator patterns suited to its event type.
 * All functions are no-ops if AudioContext is unavailable (e.g. SSR).
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
    return null;
  }
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

function playTone(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  gainValue = 0.3,
  type: OscillatorType = 'sine'
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq !== startFreq) {
    osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
  }
  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/**
 * New order: short ascending bell chime (440 Hz → 880 Hz, 150 ms)
 */
export function playNewOrderSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, 440, 880, now, 0.15, 0.3);
  } catch {
    // AudioContext may be suspended or unavailable
  }
}

/**
 * Priority order: double beep (800 Hz, two 100 ms pulses with 50 ms gap)
 */
export function playPriorityOrderSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, 800, 800, now, 0.1, 0.35, 'square');
    playTone(ctx, 800, 800, now + 0.15, 0.1, 0.35, 'square');
  } catch {
    // AudioContext may be suspended or unavailable
  }
}

/**
 * Item cancelled: low descending tone (440 Hz → 220 Hz, 200 ms)
 */
export function playCancelledSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, 440, 220, now, 0.2, 0.25);
  } catch {
    // AudioContext may be suspended or unavailable
  }
}

/**
 * All items ready: success chime (523 Hz → 659 Hz → 784 Hz, three quick notes)
 */
export function playAllReadySound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // C5 → E5 → G5  (major triad arpeggio)
    playTone(ctx, 523, 523, now, 0.1, 0.3);
    playTone(ctx, 659, 659, now + 0.12, 0.1, 0.3);
    playTone(ctx, 784, 784, now + 0.24, 0.12, 0.3);
  } catch {
    // AudioContext may be suspended or unavailable
  }
}
