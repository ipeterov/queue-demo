import { useState, useCallback, useRef, useEffect } from 'react';
import type { QueueRequest, Settings, Stats } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const generateProcessingTime = (avg: number, variation: number): number => {
  // Generate a log-normal-ish distribution
  // variation: 0 = very tight around avg, 1 = wide spread
  const minMultiplier = 1 - variation * 0.9; // at variation=1, min is 0.1x
  const maxMultiplier = 1 + variation * 9;   // at variation=1, max is 10x

  // Use a weighted random that favors values closer to average
  const random = Math.random();
  const skewed = Math.pow(random, 1.5); // skew toward lower values

  const multiplier = minMultiplier + skewed * (maxMultiplier - minMultiplier);
  return Math.max(50, Math.round(avg * multiplier));
};

export const useSimulation = () => {
  const [settings, setSettings] = useState<Settings>({
    spawnRate: 2,
    avgProcessingTime: 1000,
    variation: 0.3,
    queueMode: 'FIFO',
    queueTimeout: 5000,
    isRunning: false,
    spawnDuration: 10, // default 10 seconds
  });

  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    completed: 0,
    dropped: 0,
    wasted: 0,
    totalTimes: [],
  });

  const spawnIntervalRef = useRef<number | null>(null);
  const spawnStopTimeoutRef = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const processLoopRef = useRef<number | null>(null);

  const spawnRequest = useCallback(() => {
    const newRequest: QueueRequest = {
      id: generateId(),
      processingTime: generateProcessingTime(settings.avgProcessingTime, settings.variation),
      createdAt: Date.now(),
      status: 'spawning',
    };

    setRequests(prev => [...prev, newRequest]);

    // After spawn animation, move to queue
    setTimeout(() => {
      setRequests(prev =>
        prev.map(r =>
          r.id === newRequest.id
            ? { ...r, status: 'queued' as const, queuedAt: Date.now() }
            : r
        )
      );
    }, 800); // spawn animation duration (matches animation)
  }, [settings.avgProcessingTime, settings.variation]);

  // Check for timed out requests - timeout is based on createdAt (total time since spawn)
  const checkTimeouts = useCallback(() => {
    const now = Date.now();
    setRequests(prev => {
      const updated = prev.map(r => {
        // Queued requests that timeout get dropped immediately
        if (r.status === 'queued' && now - r.createdAt > settings.queueTimeout) {
          return { ...r, status: 'dropped' as const, timedOutAt: now };
        }
        // Processing requests that timeout: client gets 504, but server keeps processing
        if (r.status === 'processing' && now - r.createdAt > settings.queueTimeout) {
          return { ...r, status: 'timed_out_processing' as const, timedOutAt: now };
        }
        return r;
      });

      // Count newly dropped (queued -> dropped)
      const newlyDropped = updated.filter(
        (r, i) => r.status === 'dropped' && prev[i]?.status === 'queued'
      ).length;

      if (newlyDropped > 0) {
        setStats(s => ({ ...s, dropped: s.dropped + newlyDropped }));
      }

      return updated;
    });
  }, [settings.queueTimeout]);

  // Process next request from queue
  const processNext = useCallback(() => {
    if (processingRef.current) return;

    setRequests(prev => {
      const queuedRequests = prev.filter(r => r.status === 'queued');
      if (queuedRequests.length === 0) return prev;

      // FIFO: take first, LIFO: take last
      const nextRequest = settings.queueMode === 'FIFO'
        ? queuedRequests[0]
        : queuedRequests[queuedRequests.length - 1];

      processingRef.current = true;

      // Schedule completion
      setTimeout(() => {
        setRequests(p => {
          const request = p.find(r => r.id === nextRequest.id);
          // Complete if still processing
          if (request && request.status === 'processing') {
            const completedAt = Date.now();
            const totalTime = completedAt - request.createdAt;
            setStats(s => ({
              ...s,
              completed: s.completed + 1,
              totalTimes: [...s.totalTimes, totalTime],
            }));
            return p.map(r =>
              r.id === nextRequest.id
                ? { ...r, status: 'completed' as const, completedAt }
                : r
            );
          }
          // If timed out during processing, server finishes but response is wasted
          if (request && request.status === 'timed_out_processing') {
            setStats(s => ({ ...s, wasted: s.wasted + 1 }));
            return p.map(r =>
              r.id === nextRequest.id
                ? { ...r, status: 'wasted' as const, completedAt: Date.now() }
                : r
            );
          }
          return p;
        });
        processingRef.current = false;
      }, nextRequest.processingTime);

      return prev.map(r =>
        r.id === nextRequest.id
          ? { ...r, status: 'processing' as const, processingStartedAt: Date.now() }
          : r
      );
    });
  }, [settings.queueMode]);

  // Clean up completed/dropped/wasted requests after animation
  useEffect(() => {
    const cleanup = setInterval(() => {
      setRequests(prev =>
        prev.filter(r => {
          if (r.status === 'completed' && r.completedAt && Date.now() - r.completedAt > 1200) {
            return false;
          }
          if (r.status === 'wasted' && r.completedAt && Date.now() - r.completedAt > 1200) {
            return false;
          }
          if (r.status === 'dropped' && Date.now() - r.createdAt > settings.queueTimeout + 1000) {
            return false;
          }
          return true;
        })
      );
    }, 500);

    return () => clearInterval(cleanup);
  }, [settings.queueTimeout]);

  // Spawning loop - controlled by isRunning
  useEffect(() => {
    if (!settings.isRunning) {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
      if (spawnStopTimeoutRef.current) {
        clearTimeout(spawnStopTimeoutRef.current);
        spawnStopTimeoutRef.current = null;
      }
      return;
    }

    // Spawn requests at configured rate
    const spawnInterval = 1000 / settings.spawnRate;
    spawnIntervalRef.current = window.setInterval(spawnRequest, spawnInterval);

    // Auto-stop after duration (if duration > 0)
    if (settings.spawnDuration > 0) {
      spawnStopTimeoutRef.current = window.setTimeout(() => {
        setSettings(s => ({ ...s, isRunning: false }));
      }, settings.spawnDuration * 1000);
    }

    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (spawnStopTimeoutRef.current) clearTimeout(spawnStopTimeoutRef.current);
    };
  }, [settings.isRunning, settings.spawnRate, settings.spawnDuration, spawnRequest]);

  // Processing loop - always runs independently
  useEffect(() => {
    const loop = () => {
      checkTimeouts();
      processNext();
      processLoopRef.current = requestAnimationFrame(loop);
    };
    processLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (processLoopRef.current) cancelAnimationFrame(processLoopRef.current);
    };
  }, [checkTimeouts, processNext]);

  const reset = useCallback(() => {
    setRequests([]);
    setStats({ completed: 0, dropped: 0, wasted: 0, totalTimes: [] });
    processingRef.current = false;
  }, []);

  const toggleRunning = useCallback(() => {
    setSettings(s => ({
      ...s,
      isRunning: !s.isRunning,
      spawnDuration: s.isRunning ? s.spawnDuration : 0  // Set to 0 (indefinite) when starting
    }));
  }, []);

  const startTimed = useCallback((durationSeconds: number) => {
    // Clear any existing timeout
    if (spawnStopTimeoutRef.current) {
      clearTimeout(spawnStopTimeoutRef.current);
      spawnStopTimeoutRef.current = null;
    }
    // Set the duration and start
    setSettings(s => ({ ...s, spawnDuration: durationSeconds, isRunning: true }));
  }, []);

  return {
    settings,
    setSettings,
    requests,
    stats,
    reset,
    toggleRunning,
    startTimed,
  };
};
