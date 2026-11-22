import type { Options as ConfettiOptions } from 'canvas-confetti';

/**
 * Lazily loads canvas-confetti only when triggered so it stays out of initial JS chunks.
 */
export function triggerConfetti(options?: ConfettiOptions): void {
  import('canvas-confetti')
    .then((mod) => {
      const fn = mod.default;
      if (typeof fn === 'function') {
        fn(options);
      }
    })
    .catch(() => {
      // Non-fatal decorative effect
    });
}
