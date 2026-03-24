/**
 * Heartbeat manager for SSE streaming connections.
 *
 * Sends periodic SSE comments (`: heartbeat\n\n`) during idle periods
 * to prevent connection timeout in proxy servers.
 *
 * Per D-05: Uses SSE comment format - invisible to clients.
 * Per D-06: Default interval 10 seconds (conservative, safe for any proxy).
 * Per D-07: Heartbeat sent only when no data received for interval duration.
 */

export interface HeartbeatOptions {
  intervalMs: number;
  onHeartbeat: () => void;
}

export class HeartbeatManager {
  private timer: NodeJS.Timeout | null = null;
  private lastDataTime: number = 0;
  private intervalMs: number = 10000;
  private onHeartbeat: () => void;
  private running: boolean = false;

  constructor(options: HeartbeatOptions) {
    this.intervalMs = options.intervalMs;
    this.onHeartbeat = options.onHeartbeat;
  }

  /**
   * Start the heartbeat timer.
   * Initializes lastDataTime and begins checking for idle periods.
   */
  start(): void {
    this.lastDataTime = Date.now();
    this.running = true;
    this.scheduleCheck();
  }

  /**
   * Notify that data was sent on the stream.
   * Resets the heartbeat timer to prevent sending during active data flow.
   */
  notifyDataSent(): void {
    this.lastDataTime = Date.now();
  }

  /**
   * Schedule the next check for idle period.
   * Uses shorter intervals (max 1s) for responsive checking while conserving resources.
   */
  private scheduleCheck(): void {
    if (!this.running) return;

    // Check at most every second, or sooner if interval is shorter
    const checkInterval = Math.min(this.intervalMs, 1000);

    this.timer = setTimeout(() => {
      if (!this.running) return;

      const elapsed = Date.now() - this.lastDataTime;

      // If idle for full interval, send heartbeat
      if (elapsed >= this.intervalMs) {
        this.onHeartbeat();
        this.lastDataTime = Date.now();
      }

      // Schedule next check
      this.scheduleCheck();
    }, checkInterval);
  }

  /**
   * Stop the heartbeat timer.
   * Clears any pending timers and prevents further heartbeats.
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Factory function to create a HeartbeatManager.
 */
export function createHeartbeatManager(options: HeartbeatOptions): HeartbeatManager {
  return new HeartbeatManager(options);
}
