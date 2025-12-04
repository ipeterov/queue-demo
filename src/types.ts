export interface QueueRequest {
  id: string;
  processingTime: number; // predetermined processing time in ms
  createdAt: number;
  queuedAt?: number;
  processingStartedAt?: number;
  completedAt?: number;
  timedOutAt?: number; // when the client got 504 (but server may still be processing)
  status: 'spawning' | 'queued' | 'processing' | 'completed' | 'dropped' | 'timed_out_processing' | 'wasted' | 'rejected';
}

export interface Settings {
  spawnRate: number; // requests per second
  avgProcessingTime: number; // average processing time in ms
  variation: number; // 0-1, determines spread of processing times
  queueMode: 'FIFO' | 'LIFO' | 'Adaptive LIFO';
  queueTimeout: number; // max time since spawn before dropping (ms) - includes processing time
  maxQueueSize: number; // max requests in queue, 0 = unlimited
  adaptiveThreshold: number; // queue size threshold for switching from FIFO to LIFO in Adaptive mode
  isRunning: boolean;
  spawnDuration: number; // how long to spawn requests (seconds), 0 = manual stop
}

export interface Stats {
  completed: number;
  dropped: number; // timed out while queued (never started processing)
  wasted: number; // timed out during processing (server finished but client got 504)
  rejected: number; // rejected because queue was full
  totalTimes: number[]; // array of total time from spawn to completion (for histogram)
}
