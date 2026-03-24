import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('HeartbeatManager', () => {
  let HeartbeatManager: typeof import('../../../src/streaming/heartbeat.js').HeartbeatManager;
  let createHeartbeatManager: typeof import('../../../src/streaming/heartbeat.js').createHeartbeatManager;

  beforeEach(async () => {
    vi.useFakeTimers();
    const module = await import('../../../src/streaming/heartbeat.js');
    HeartbeatManager = module.HeartbeatManager;
    createHeartbeatManager = module.createHeartbeatManager;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor and basic setup', () => {
    it('should create a heartbeat manager with given options', () => {
      const onHeartbeat = vi.fn();
      const manager = new HeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      expect(manager).toBeDefined();
    });

    it('should use createHeartbeatManager factory function', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      expect(manager).toBeInstanceOf(HeartbeatManager);
    });
  });

  describe('start and timer behavior', () => {
    it('should start timer that calls sendHeartbeat after interval', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      manager.start();

      // Initially should not have called heartbeat
      expect(onHeartbeat).not.toHaveBeenCalled();

      // Advance time past the interval
      vi.advanceTimersByTime(10000);

      expect(onHeartbeat).toHaveBeenCalledTimes(1);
    });

    it('should continue sending heartbeats at regular intervals', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 5000,
        onHeartbeat,
      });

      manager.start();

      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(3);
    });
  });

  describe('notifyDataSent', () => {
    it('should reset the heartbeat timer when data is sent', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      manager.start();

      // Advance 8 seconds (before heartbeat would fire)
      vi.advanceTimersByTime(8000);
      expect(onHeartbeat).not.toHaveBeenCalled();

      // Notify data sent - this resets the timer
      manager.notifyDataSent();

      // Advance another 8 seconds (16 total, but timer was reset at 8)
      vi.advanceTimersByTime(8000);
      expect(onHeartbeat).not.toHaveBeenCalled();

      // Advance 2 more seconds (10 seconds since reset)
      vi.advanceTimersByTime(2000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple data notifications', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      manager.start();

      // Send data at 5 seconds
      vi.advanceTimersByTime(5000);
      manager.notifyDataSent();

      // Send data at another 5 seconds (10 total, but reset)
      vi.advanceTimersByTime(5000);
      manager.notifyDataSent();

      // At 10 seconds since last reset
      vi.advanceTimersByTime(10000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should clear the timer and prevent further heartbeats', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 5000,
        onHeartbeat,
      });

      manager.start();

      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1);

      manager.stop();

      // Advance past what would be another heartbeat
      vi.advanceTimersByTime(10000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1); // Still only 1
    });

    it('should be safe to call stop multiple times', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 5000,
        onHeartbeat,
      });

      manager.start();
      manager.stop();
      manager.stop(); // Should not throw

      vi.advanceTimersByTime(10000);
      expect(onHeartbeat).not.toHaveBeenCalled();
    });
  });

  describe('heartbeat during active data flow', () => {
    it('should not fire heartbeat when data flows continuously', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      manager.start();

      // Simulate continuous data every 5 seconds
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(5000);
        manager.notifyDataSent();
      }

      // Total 25 seconds, but data kept resetting timer
      expect(onHeartbeat).not.toHaveBeenCalled();
    });

    it('should fire heartbeat after data stops flowing', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      manager.start();

      // Send data at 5 seconds
      vi.advanceTimersByTime(5000);
      manager.notifyDataSent();

      // Then let it idle for 10 seconds
      vi.advanceTimersByTime(10000);

      expect(onHeartbeat).toHaveBeenCalledTimes(1);
    });
  });

  describe('start/stop cycles', () => {
    it('should handle multiple start/stop cycles correctly', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 5000,
        onHeartbeat,
      });

      // First cycle
      manager.start();
      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1);
      manager.stop();

      // Second cycle
      manager.start();
      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(2);
      manager.stop();

      // Third cycle
      manager.start();
      vi.advanceTimersByTime(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(3);
      manager.stop();
    });

    it('should restart timer from fresh after stop/start', () => {
      const onHeartbeat = vi.fn();
      const manager = createHeartbeatManager({
        intervalMs: 10000,
        onHeartbeat,
      });

      // First cycle - run partial
      manager.start();
      vi.advanceTimersByTime(5000);
      manager.stop();

      // Reset call count
      onHeartbeat.mockClear();

      // Second cycle - should start fresh
      manager.start();
      vi.advanceTimersByTime(10000);

      expect(onHeartbeat).toHaveBeenCalledTimes(1);
    });
  });
});
