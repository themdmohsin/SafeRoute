/**
 * Screen Wake Lock lifecycle for an active ride.
 *
 * - acquire() when the ride starts, release() when it ends,
 * - automatic re-acquisition when the document becomes visible again
 *   (the platform releases the lock whenever the tab is hidden),
 * - honest statuses for the UI: unsupported / active / released / error.
 */

export type WakeLockStatus = 'idle' | 'unsupported' | 'active' | 'released' | 'error';

export interface WakeLockSnapshot {
  status: WakeLockStatus;
  lastError: string | null;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
};

export class WakeLockController {
  private sentinel: WakeLockSentinel | null = null;
  private shouldHold = false;
  private statusValue: WakeLockStatus = 'idle';
  private lastError: string | null = null;
  private listeners = new Set<(snapshot: WakeLockSnapshot) => void>();
  private handleVisibility = () => {
    if (document.visibilityState === 'visible' && this.shouldHold && !this.sentinel) {
      void this.acquire();
    }
  };
  private handleRelease = () => {
    this.sentinel = null;
    if (this.shouldHold) {
      // Platform-initiated release (e.g. tab hidden); try again when visible.
      if (document.visibilityState === 'visible') void this.acquire();
    } else {
      this.setStatus('released');
    }
  };

  snapshot(): WakeLockSnapshot {
    return { status: this.statusValue, lastError: this.lastError };
  }

  subscribe(listener: (snapshot: WakeLockSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Ignore UI listener failures.
      }
    }
  }

  private setStatus(status: WakeLockStatus) {
    if (this.statusValue !== status) {
      this.statusValue = status;
      this.emit();
    }
  }

  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      Boolean((navigator as NavigatorWithWakeLock).wakeLock)
    );
  }

  /** Request the screen wake lock and keep it maintained while visible. Safe to call repeatedly. */
  async acquire(): Promise<void> {
    this.shouldHold = true;
    document.addEventListener('visibilitychange', this.handleVisibility);
    if (!this.isSupported()) {
      this.lastError = null; // Unsupported is an expected, non-error state.
      this.setStatus('unsupported');
      return;
    }
    if (this.sentinel) return;
    if (document.visibilityState !== 'visible') {
      // Browsers refuse wake locks on hidden documents; visibilitychange
      // will re-acquire when the user comes back.
      this.setStatus('released');
      return;
    }
    try {
      const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock!;
      this.sentinel = await wakeLock.request('screen');
      this.sentinel.addEventListener('release', this.handleRelease);
      this.lastError = null;
      this.setStatus('active');
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : 'Screen wake lock request failed.';
      this.setStatus('error');
    }
  }

  /** Release the lock and stop listening for visibility changes. */
  async release(): Promise<void> {
    this.shouldHold = false;
    document.removeEventListener('visibilitychange', this.handleVisibility);
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel) {
      sentinel.removeEventListener('release', this.handleRelease);
      try {
        await sentinel.release();
      } catch {
        // Already released by the platform; nothing to do.
      }
    }
    if (this.statusValue !== 'idle') this.setStatus('released');
  }
}
