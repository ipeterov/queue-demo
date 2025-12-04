import type { Settings as SettingsType } from '../types';

interface Props {
  settings: SettingsType;
  onChange: (settings: SettingsType) => void;
  onToggle: () => void;
  onStartTimed: (duration: number) => void;
  onReset: () => void;
}

export const Settings = ({ settings, onChange, onToggle, onStartTimed, onReset }: Props) => {
  return (
    <div className="settings-panel">
      <div className="settings-row">
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
            Avg Processing Time: {(settings.avgProcessingTime / 1000).toFixed(1)}s
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

        <div className="setting-group">
          <label>
            Request Timeout: {(settings.queueTimeout / 1000).toFixed(1)}s
            <input
              type="range"
              min="1000"
              max="30000"
              step="500"
              value={settings.queueTimeout}
              onChange={e => onChange({ ...settings, queueTimeout: parseFloat(e.target.value) })}
            />
          </label>
        </div>

        <div className="setting-group">
          <label>
            Queue Mode:
            <select
              value={settings.queueMode}
              onChange={e => onChange({ ...settings, queueMode: e.target.value as 'FIFO' | 'LIFO' })}
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
            </select>
          </label>
        </div>

        <div className="setting-buttons">
          <button
            className="timed-btn"
            onClick={() => onStartTimed(60)}
            disabled={settings.isRunning}
          >
            Run 1 min
          </button>
          <button
            className={`toggle-btn ${settings.isRunning ? 'running' : ''}`}
            onClick={onToggle}
          >
            {settings.isRunning ? 'Stop' : 'Run'}
          </button>
          <button className="reset-btn" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
