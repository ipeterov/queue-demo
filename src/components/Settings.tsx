import { useMemo } from 'react';
import type { Settings as SettingsType } from '../types';

interface Props {
  settings: SettingsType;
  onChange: (settings: SettingsType) => void;
  onToggle: () => void;
  onStartTimed: (duration: number) => void;
  onReset: () => void;
}

export const Settings = ({ settings, onChange, onToggle, onStartTimed, onReset }: Props) => {
  // Generate distribution preview with fixed scale (0 to 20s)
  const distributionBars = useMemo(() => {
    const { avgProcessingTime, variation } = settings;
    const minMultiplier = 1 - variation * 0.9;
    const maxMultiplier = 1 + variation * 9;

    // Fixed scale: 0 to max processing time * 2 (20s)
    const scaleMin = 0;
    const scaleMax = 20000; // 20 seconds

    // Create buckets for histogram
    const numBuckets = 20;
    const buckets = new Array(numBuckets).fill(0);
    const samples = 1000;

    for (let i = 0; i < samples; i++) {
      const random = Math.random();
      const skewed = Math.pow(random, 1.5);
      const multiplier = minMultiplier + skewed * (maxMultiplier - minMultiplier);
      const time = avgProcessingTime * multiplier;
      const bucketIndex = Math.min(
        numBuckets - 1,
        Math.max(0, Math.floor((time / scaleMax) * numBuckets))
      );
      buckets[bucketIndex]++;
    }

    const maxBucket = Math.max(...buckets);
    return { buckets, maxBucket, scaleMin, scaleMax };
  }, [settings.avgProcessingTime, settings.variation]);

  return (
    <div className="settings-panel">
      <div className="settings-row">
        {/* Request generation settings */}
        <div className="settings-group-container">
          <div className="settings-group-label">Requests</div>
          <div className="settings-group-content">
            <div className="setting-group">
              <label>
                Spawn Rate: {settings.spawnRate.toFixed(1)} req/s
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.spawnRate}
                  onChange={e => onChange({ ...settings, spawnRate: parseFloat(e.target.value) })}
                />
              </label>
            </div>

            <div className="setting-group">
              <label>
                Processing Time: {(settings.avgProcessingTime / 1000).toFixed(1)}s
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={settings.avgProcessingTime}
                  onChange={e => onChange({ ...settings, avgProcessingTime: parseFloat(e.target.value) })}
                />
              </label>
            </div>

            <div className="setting-group">
              <label>
                Variation: {Math.round(settings.variation * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.variation}
                  onChange={e => onChange({ ...settings, variation: parseFloat(e.target.value) })}
                />
              </label>
            </div>

            <div className="distribution-preview">
              <div className="distribution-chart">
                {distributionBars.buckets.map((count, i) => (
                  <div
                    key={i}
                    className="distribution-bar"
                    style={{ height: `${(count / distributionBars.maxBucket) * 100}%` }}
                  />
                ))}
              </div>
              <div className="distribution-labels">
                <span>{(distributionBars.scaleMin / 1000).toFixed(0)}s</span>
                <span>{(distributionBars.scaleMax / 1000).toFixed(0)}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Queue settings */}
        <div className="settings-group-container">
          <div className="settings-group-label">Queue</div>
          <div className="settings-group-content">
            <div className="setting-group">
              <label>
                Timeout: {(settings.queueTimeout / 1000).toFixed(1)}s
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="500"
                  value={settings.queueTimeout}
                  onChange={e => onChange({ ...settings, queueTimeout: parseFloat(e.target.value) })}
                />
              </label>
              <div className="setting-help">Load balancer timeout. After this, client gets 504.</div>
            </div>

            <div className="setting-group">
              <label>
                Max Size: {settings.maxQueueSize === 0 ? '∞' : settings.maxQueueSize}
                <input
                  type="range"
                  min="1"
                  max="51"
                  step="1"
                  value={settings.maxQueueSize === 0 ? 51 : settings.maxQueueSize}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    onChange({ ...settings, maxQueueSize: val >= 51 ? 0 : val });
                  }}
                />
              </label>
              <div className="setting-help">New requests are rejected when queue is full.</div>
            </div>

            <div className="setting-group">
              <label>
                Mode:
                <select
                  value={settings.queueMode}
                  onChange={e => onChange({ ...settings, queueMode: e.target.value as 'FIFO' | 'LIFO' | 'Adaptive LIFO' })}
                >
                  <option value="FIFO">FIFO</option>
                  <option value="LIFO">LIFO</option>
                  <option value="Adaptive LIFO">Adaptive LIFO</option>
                </select>
              </label>
              <div className="setting-help">
                {settings.queueMode === 'FIFO' && 'First in, first out. Fair but can have high tail latency.'}
                {settings.queueMode === 'LIFO' && 'Last in, first out. Newer requests processed first, older ones may timeout.'}
                {settings.queueMode === 'Adaptive LIFO' && 'FIFO when queue is small, switches to LIFO above threshold.'}
              </div>
            </div>

            {settings.queueMode === 'Adaptive LIFO' && (
              <div className="setting-group">
                <label>
                  LIFO Threshold: {settings.adaptiveThreshold}
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={settings.adaptiveThreshold}
                    onChange={e => onChange({ ...settings, adaptiveThreshold: parseInt(e.target.value) })}
                  />
                </label>
                <div className="setting-help">Switch to LIFO when queue size reaches this.</div>
              </div>
            )}
          </div>
        </div>

        {/* Control buttons */}
        <div className="settings-group-container">
          <div className="settings-group-label">Controls</div>
          <div className="setting-buttons">
            <div className="timed-run-control">
              <button
                className="timed-btn"
                onClick={() => onStartTimed(settings.spawnDuration)}
                disabled={settings.isRunning || settings.spawnDuration === 0}
              >
                Run
              </button>
              <input
                type="number"
                className="duration-input"
                min="1"
                max="9999"
                value={settings.spawnDuration || ''}
                placeholder="∞"
                onChange={e => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                  onChange({ ...settings, spawnDuration: Math.max(0, Math.min(9999, val)) });
                }}
              />
              <span className="duration-unit">sec</span>
            </div>
            <button
              className={`toggle-btn ${settings.isRunning ? 'running' : ''}`}
              onClick={onToggle}
            >
              {settings.isRunning ? 'Stop' : 'Run ∞'}
            </button>
            <button className="reset-btn" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
