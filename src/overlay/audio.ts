import type { Page } from 'playwright';

/**
 * Inject the audio context and click sound generator into the page
 */
export async function injectAudio(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Check if audio is already injected
    if ((window as any).__demosimthAudio) return;

    // Create audio context lazily (needs user interaction in some browsers)
    let audioContext: AudioContext | null = null;

    function getAudioContext(): AudioContext {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return audioContext;
    }

    // Generate a click sound using Web Audio API
    function playClickSound() {
      try {
        const ctx = getAudioContext();

        // Create oscillator for the click
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Click sound: short, high-frequency burst
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

        // Quick attack and decay
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
      } catch (e) {
        // Audio might not be available, silently fail
        console.debug('demosmith: audio not available', e);
      }
    }

    // Generate a softer keystroke sound
    function playKeystrokeSound() {
      try {
        const ctx = getAudioContext();

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Keystroke: softer, lower frequency
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.03);

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
      } catch (e) {
        console.debug('demosmith: audio not available', e);
      }
    }

    // Store functions globally
    (window as any).__demosimthAudio = {
      playClickSound,
      playKeystrokeSound,
      getAudioContext,
    };
  });
}

/**
 * Play a click sound
 */
export async function playClickSound(page: Page): Promise<void> {
  await injectAudio(page);
  await page.evaluate(() => {
    const audio = (window as any).__demosimthAudio;
    if (audio && audio.playClickSound) {
      audio.playClickSound();
    }
  });
}

/**
 * Play a keystroke sound
 */
export async function playKeystrokeSound(page: Page): Promise<void> {
  await injectAudio(page);
  await page.evaluate(() => {
    const audio = (window as any).__demosimthAudio;
    if (audio && audio.playKeystrokeSound) {
      audio.playKeystrokeSound();
    }
  });
}

/**
 * Resume audio context (needed after user interaction in some browsers)
 */
export async function resumeAudio(page: Page): Promise<void> {
  await page.evaluate(() => {
    const audio = (window as any).__demosimthAudio;
    if (audio && audio.getAudioContext) {
      const ctx = audio.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
  });
}

/**
 * Clean up audio resources
 */
export async function cleanupAudio(page: Page): Promise<void> {
  await page.evaluate(() => {
    const audio = (window as any).__demosimthAudio;
    if (audio && audio.getAudioContext) {
      try {
        const ctx = audio.getAudioContext();
        ctx.close();
      } catch (e) {
        // Ignore
      }
    }
    delete (window as any).__demosimthAudio;
  });
}
