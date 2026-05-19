// Genera un "ding" de campanita con Web Audio API (sin asset externo).
// Dos tonos cortos descendentes — corto y discreto, suena a notificación de chat.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(ctx: AudioContext, freq: number, startAt: number, duration: number, gain: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  // Envolvente suave (attack + decay) para evitar click
  g.gain.setValueAtTime(0, ctx.currentTime + startAt);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration + 0.05);
}

export function playNotificationSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  // Si el contexto está suspended (autoplay policy), intentar resumir.
  // En la práctica el usuario ya interactuó con la app, así que normalmente
  // no hace falta — pero no rompemos si falla.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => { /* ignore */ });
  }
  // Ding-ding: dos notas, segunda más baja y más larga.
  playTone(ctx, 880, 0,    0.12, 0.18); // A5 corto
  playTone(ctx, 660, 0.10, 0.22, 0.14); // E5 un poco más largo
}
