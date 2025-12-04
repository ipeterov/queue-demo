export interface QueueRequest {
  id: string;
  processingTime: number; // predetermined processing time in ms
  createdAt: number;
  queuedAt?: number;
  processingStartedAt?: number;
  completedAt?: number;
  timedOutAt?: number; // when the client got 504 (but server may still be processing)
  status: 'spawning' | 'queued' | 'processing' | 'completed' | 'dropped' | 'timed_out_processing' | 'wasted';
}

export interface Settings {
  spawnRate: number; // requests per second
  avgProcessingTime: number; // average processing time in ms
  variation: number; // 0-1, determines spread of processing times
  queueMode: 'FIFO' | 'LIFO';
  queueTimeout: number; // max time since spawn before dropping (ms) - includes processing time
  isRunning: boolean;
  spawnDuration: number; // how long to spawn requests (seconds), 0 = manual stop
}

export interface Stats {
  completed: number;
  dropped: number;
  totalTimes: number[]; // array of total time from spawn to completion (for histogram)
}
