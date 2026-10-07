/**
 * Batched, resilient upload of sensor windows to the authenticated backend.
 *
 * - Windows are queued client-side and POSTed in batches to
 *   POST /api/rides/:id/telemetry (see docs/SENSOR_WINDOW_CONTRACT.md).
 * - Failed batches stay queued and are retried with exponential backoff;
 *   nothing is lost unless the queue cap forces us to drop the oldest
 *   windows (counted in `droppedCount` so the UI can be honest about it).
 * - The uploader never blocks the ride: posting happens on a timer and all
 *   failures are surfaced through the snapshot instead of thrown.
 */

import type { SensorWindow, TelemetryBatch } from './contract';
import { SENSOR_WINDOW_BATCH_LIMIT } from './contract';

export type TelemetryStatus = 'idle' | 'syncing' | 'error';

export interface TelemetrySnapshot {
  status: TelemetryStatus;
  /** Windows queued and not yet acknowledged by the backend. */
  pendingCount: number;
  /** Windows successfully accepted by the backend this ride. */
  uploadedCount: number;
  /** Oldest windows discarded after hitting the queue cap. */
  droppedCount: number;
  lastError: string | null;
  lastUploadedAt: number | null;
}

const MAX_QUEUE_LENGTH = 600; // ~20 minutes of 2 s windows.
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

export type TelemetryPoster = (batch: TelemetryBatch) => Promise<void>;

export class TelemetryUploader {
  private queue: SensorWindow[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private syncing = false;
  private uploadedCount = 0;
  private droppedCount = 0;
  private lastError: string | null = null;
  private lastUploadedAt: number | null = null;
  private statusValue: TelemetryStatus = 'idle';
  private listeners = new Set<(snapshot: TelemetrySnapshot) => void>();

  constructor(
    private readonly rideId: string,
    private readonly post: TelemetryPoster,
    private readonly intervalMs = 30_000,
  ) {}

  snapshot(): TelemetrySnapshot {
    return {
      status: this.statusValue,
      pendingCount: this.queue.length,
      uploadedCount: this.uploadedCount,
      droppedCount: this.droppedCount,
      lastError: this.lastError,
      lastUploadedAt: this.lastUploadedAt,
    };
  }

  subscribe(listener: (snapshot: TelemetrySnapshot) => void): () => void {
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

  private setStatus(status: TelemetryStatus) {
    if (this.statusValue !== status) {
      this.statusValue = status;
      this.emit();
    }
  }

  /** Queue closed windows for upload. */
  enqueue(windows: SensorWindow[]) {
    if (windows.length === 0) return;
    this.queue.push(...windows);
    if (this.queue.length > MAX_QUEUE_LENGTH) {
      const excess = this.queue.length - MAX_QUEUE_LENGTH;
      this.queue.splice(0, excess);
      this.droppedCount += excess;
    }
    this.emit();
  }

  /** Start the periodic flush loop. */
  start() {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.intervalMs);
    void this.flush();
  }

  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Attempt to upload the whole queue immediately. Used by the timer, by
   * wake-ups and once more when the ride ends. Resolves with true when the
   * queue is fully acknowledged.
   */
  async flush(final = false): Promise<boolean> {
    if (this.syncing || this.queue.length === 0) {
      if (final && !this.syncing) this.setStatus(this.lastError ? 'error' : 'idle');
      return this.queue.length === 0;
    }

    this.syncing = true;
    this.setStatus('syncing');
    let allAcked = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.slice(0, SENSOR_WINDOW_BATCH_LIMIT);
        try {
          await this.post({ schemaVersion: batch[0]?.schemaVersion ?? 1, windows: batch });
          this.queue.splice(0, batch.length);
          this.uploadedCount += batch.length;
          this.lastError = null;
          this.lastUploadedAt = Date.now();
          this.retryAttempt = 0;
          this.emit();
        } catch (error) {
          allAcked = false;
          this.lastError =
            error instanceof Error ? error.message : 'Telemetry upload failed.';
          this.emit();
          break;
        }
      }
    } finally {
      this.syncing = false;
    }

    if (allAcked && this.queue.length === 0) {
      this.setStatus(this.lastError && final ? 'error' : 'idle');
    } else if (this.queue.length > 0) {
      this.setStatus('error');
      if (!final) this.scheduleRetry();
    }
    return allAcked && this.queue.length === 0;
  }

  private scheduleRetry() {
    if (this.retryTimeout !== null) return;
    const delay = Math.min(MAX_RETRY_DELAY_MS, 5_000 * 2 ** this.retryAttempt);
    this.retryAttempt = Math.min(this.retryAttempt + 1, 6);
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      void this.flush();
    }, delay);
  }
}
