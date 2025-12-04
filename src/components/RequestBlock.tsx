import { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import type { QueueRequest } from '../types';

interface Props {
  request: QueueRequest;
  targetPosition: { x: number; y: number };
  queueTimeout: number;
  width: number;
}

const BLOCK_HEIGHT = 50;

export const RequestBlock = ({ request, targetPosition, queueTimeout, width }: Props) => {
  const blockRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(request.status);
  const prevPositionRef = useRef(targetPosition);
  const [now, setNow] = useState(() => Date.now());

  // Update time for progress bars
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  // Movement animation
  useEffect(() => {
    if (!blockRef.current) return;

    const statusChanged = prevStatusRef.current !== request.status;
    const positionChanged =
      prevPositionRef.current.x !== targetPosition.x ||
      prevPositionRef.current.y !== targetPosition.y;

    if (statusChanged || positionChanged) {
      animate(blockRef.current, {
        translateX: targetPosition.x,
        translateY: targetPosition.y,
        duration: 800,
        easing: 'easeInOutQuad',
      });
    }

    prevStatusRef.current = request.status;
    prevPositionRef.current = targetPosition;
  }, [request.status, targetPosition]);

  // Spawn animation - set position immediately, then animate scale
  useEffect(() => {
    if (!blockRef.current) return;

    if (request.status === 'spawning') {
      // Set position immediately (no animation)
      animate(blockRef.current, {
        translateX: targetPosition.x,
        translateY: targetPosition.y,
        duration: 0,
      });
      // Then animate the scale/opacity
      animate(blockRef.current, {
        scale: [0, 1],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutBack',
      });
    }
  }, [request.status, targetPosition.x, targetPosition.y]);

  // Drop animation
  useEffect(() => {
    if (!blockRef.current) return;

    if (request.status === 'dropped') {
      animate(blockRef.current, {
        scale: [1, 0],
        opacity: [1, 0],
        rotate: '15deg',
        duration: 800,
        easing: 'easeInBack',
      });
    }
  }, [request.status]);

  // Completion animation
  useEffect(() => {
    if (!blockRef.current) return;

    if (request.status === 'completed') {
      animate(blockRef.current, {
        scale: [1, 1.1, 0],
        opacity: [1, 1, 0],
        duration: 1000,
        easing: 'easeInQuad',
      });
    }
  }, [request.status]);

  // Calculate progress percentages - timeout is based on createdAt (total time since spawn)
  const getTimeoutProgress = () => {
    if (request.status !== 'queued' && request.status !== 'processing') return 0;
    const elapsed = now - request.createdAt;
    return Math.min(1, elapsed / queueTimeout);
  };

  const getProcessingProgress = () => {
    if (!request.processingStartedAt) return 0;
    // Show progress for both processing and timed_out_processing states
    if (request.status !== 'processing' && request.status !== 'timed_out_processing') return 0;
    const elapsed = now - request.processingStartedAt;
    return Math.min(1, elapsed / request.processingTime);
  };

  const timeoutProgress = getTimeoutProgress();
  const processingProgress = getProcessingProgress();

  const getBorderColor = () => {
    switch (request.status) {
      case 'spawning':
        return '#4ade80';
      case 'queued':
        return timeoutProgress > 0.7 ? '#f87171' : '#facc15';
      case 'processing':
        return timeoutProgress > 0.7 ? '#f87171' : '#60a5fa';
      case 'dropped':
        return '#f87171';
      case 'completed':
        return '#4ade80';
      default:
        return '#64748b';
    }
  };

  const timeRemaining = Math.max(0, queueTimeout - (now - request.createdAt));

  // Higher z-index for transitioning states so they appear above queued items
  const getZIndex = () => {
    switch (request.status) {
      case 'spawning':
        return 20;
      case 'processing':
        return 30;
      case 'completed':
        return 25;
      case 'dropped':
        return 25;
      case 'queued':
      default:
        return 10;
    }
  };

  return (
    <div
      ref={blockRef}
      className="request-block"
      style={{
        position: 'absolute',
        width: width,
        height: BLOCK_HEIGHT,
        backgroundColor: '#1e293b',
        borderRadius: 6,
        border: `2px solid ${getBorderColor()}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        opacity: 0,
        left: 0,
        top: 0,
        zIndex: getZIndex(),
      }}
      title={`Processing time: ${request.processingTime}ms`}
    >
      {/* Processing progress (top half) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#0f172a',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${processingProgress * 100}%`,
            backgroundColor: '#60a5fa',
            transition: 'width 0.05s linear',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 11,
            fontWeight: 600,
            color: '#e2e8f0',
          }}
        >
          {request.status === 'processing'
            ? `${Math.round(processingProgress * 100)}%`
            : `${(request.processingTime / 1000).toFixed(1)}s`}
        </div>
      </div>

      {/* Timeout progress (bottom half) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #334155',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${timeoutProgress * 100}%`,
            backgroundColor: timeoutProgress > 0.7 ? '#f87171' : '#facc15',
            transition: 'width 0.05s linear',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 10,
            color: '#94a3b8',
          }}
        >
          {(request.status === 'queued' || request.status === 'processing')
            ? `${(timeRemaining / 1000).toFixed(1)}s`
            : 'timeout'}
        </div>
      </div>
    </div>
  );
};
