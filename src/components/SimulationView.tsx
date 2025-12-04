import { useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react';
import type { QueueRequest, Stats } from '../types';
import { RequestBlock } from './RequestBlock';
import { Percentiles } from './Percentiles';

interface Props {
  requests: QueueRequest[];
  stats: Stats;
  queueMode: 'FIFO' | 'LIFO';
  queueTimeout: number;
}

const BLOCK_HEIGHT = 50;
const BLOCK_GAP = 8;
const BLOCK_MARGIN = 12;

interface ZonePositions {
  spawn: { x: number; y: number; width: number };
  queue: { x: number; y: number; width: number };
  processing: { x: number; y: number; width: number };
  failed: { x: number; y: number; width: number };
  processed: { x: number; y: number; width: number };
}

export const SimulationView = ({ requests, stats, queueTimeout }: Props) => {
  const simulationRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<ZonePositions | null>(null);

  const queuedCount = requests.filter(r => r.status === 'queued').length;

  const updateZones = useCallback(() => {
    if (!simulationRef.current) return;

    const spawnZone = simulationRef.current.querySelector('.spawn-zone') as HTMLElement;
    const queueZone = simulationRef.current.querySelector('.queue-zone') as HTMLElement;
    const processingZone = simulationRef.current.querySelector('.processing-zone') as HTMLElement;
    const failedZone = simulationRef.current.querySelector('.failed-zone') as HTMLElement;
    const processedZone = simulationRef.current.querySelector('.processed-zone') as HTMLElement;

    if (spawnZone && queueZone && processingZone && failedZone && processedZone) {
      const containerRect = simulationRef.current.getBoundingClientRect();

      // Get the zone-content elements for accurate positioning
      const spawnContent = spawnZone.querySelector('.zone-content') as HTMLElement;
      const queueContent = queueZone.querySelector('.zone-content') as HTMLElement;
      const processingContent = processingZone.querySelector('.zone-content') as HTMLElement;
      const failedContent = failedZone.querySelector('.zone-content') as HTMLElement;
      const processedContent = processedZone.querySelector('.zone-content') as HTMLElement;

      if (!spawnContent || !queueContent || !processingContent || !failedContent || !processedContent) return;

      const spawnContentRect = spawnContent.getBoundingClientRect();
      const queueContentRect = queueContent.getBoundingClientRect();
      const processingContentRect = processingContent.getBoundingClientRect();
      const failedContentRect = failedContent.getBoundingClientRect();
      const processedContentRect = processedContent.getBoundingClientRect();

      const spawnWidth = spawnContentRect.width - BLOCK_MARGIN;
      const queueWidth = queueContentRect.width - BLOCK_MARGIN;
      const processingWidth = processingContentRect.width - BLOCK_MARGIN;
      const failedWidth = failedContentRect.width - BLOCK_MARGIN;
      const processedWidth = processedContentRect.width - BLOCK_MARGIN;

      setZones({
        spawn: {
          x: spawnContentRect.left - containerRect.left + BLOCK_MARGIN / 2,
          y: spawnContentRect.top - containerRect.top,
          width: spawnWidth,
        },
        queue: {
          x: queueContentRect.left - containerRect.left + BLOCK_MARGIN / 2,
          y: queueContentRect.top - containerRect.top,
          width: queueWidth,
        },
        processing: {
          x: processingContentRect.left - containerRect.left + BLOCK_MARGIN / 2,
          y: processingContentRect.top - containerRect.top,
          width: processingWidth,
        },
        failed: {
          x: failedContentRect.left - containerRect.left + BLOCK_MARGIN / 2,
          y: failedContentRect.top - containerRect.top,
          width: failedWidth,
        },
        processed: {
          x: processedContentRect.left - containerRect.left + BLOCK_MARGIN / 2,
          y: processedContentRect.top - containerRect.top,
          width: processedWidth,
        },
      });
    }
  }, []);

  useLayoutEffect(() => {
    updateZones();
    window.addEventListener('resize', updateZones);
    return () => window.removeEventListener('resize', updateZones);
  }, [updateZones]);

  // Also update zones when queue count changes (zone might resize)
  useEffect(() => {
    updateZones();
  }, [queuedCount, updateZones]);

  const getRequestPosition = (request: QueueRequest): { x: number; y: number } => {
    if (!zones) return { x: 0, y: 0 };

    switch (request.status) {
      case 'spawning':
        return { x: zones.spawn.x, y: zones.spawn.y };

      case 'queued': {
        const queuedRequests = requests.filter(r => r.status === 'queued');
        const queueIndex = queuedRequests.findIndex(r => r.id === request.id);

        return {
          x: zones.queue.x,
          y: zones.queue.y + queueIndex * (BLOCK_HEIGHT + BLOCK_GAP),
        };
      }

      case 'processing':
        return { x: zones.processing.x, y: zones.processing.y };

      case 'completed':
        return {
          x: zones.processed.x,
          y: zones.processed.y,
        };

      case 'dropped':
        return {
          x: zones.failed.x,
          y: zones.failed.y,
        };

      default:
        return { x: 0, y: 0 };
    }
  };

  // Calculate minimum queue height based on number of queued items
  const minQueueHeight = Math.max(120, queuedCount * (BLOCK_HEIGHT + BLOCK_GAP) + 60);

  return (
    <div className="simulation-view">
      {/* Simulation areas */}
      <div className="simulation-areas" ref={simulationRef}>
        <div className="zone spawn-zone">
          <h4>Spawn</h4>
          <div className="zone-content"></div>
        </div>

        <div className="zone-arrow">→</div>

        <div className="zone queue-zone" style={{ minHeight: minQueueHeight }}>
          <h4>Queue ({queuedCount})</h4>
          <div className="zone-content"></div>
        </div>

        <div className="zone-arrow">→</div>

        <div className="zone processing-zone">
          <h4>Processing</h4>
          <div className="zone-content"></div>
        </div>

        <div className="zone-arrow">→</div>

        {/* Results column with Failed and Processed zones */}
        <div className="results-column">
          <div className="zone failed-zone">
            <h4>Failed</h4>
            <div className="zone-content">
              <div className="failed-counter">{stats.dropped}</div>
            </div>
          </div>

          <div className="zone processed-zone">
            <h4>Processed ({stats.completed})</h4>
            <div className="zone-content">
              <Percentiles totalTimes={stats.totalTimes} />
            </div>
          </div>
        </div>

        {/* Render all request blocks inside simulation-areas for proper positioning */}
        {requests.map((request) => (
          <RequestBlock
            key={request.id}
            request={request}
            targetPosition={getRequestPosition(request)}
            queueTimeout={queueTimeout}
            width={zones ? (
              request.status === 'spawning' ? zones.spawn.width :
              request.status === 'queued' ? zones.queue.width :
              request.status === 'processing' ? zones.processing.width :
              request.status === 'dropped' ? zones.failed.width :
              request.status === 'completed' ? zones.processed.width :
              zones.processing.width
            ) : 100}
          />
        ))}
      </div>
    </div>
  );
};
