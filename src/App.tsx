import { useSimulation } from './useSimulation';
import { Settings } from './components/Settings';
import { SimulationView } from './components/SimulationView';
import './App.css';

function App() {
  const { settings, setSettings, requests, stats, reset, toggleRunning, startTimed } = useSimulation();

  return (
    <div className="app">
      <header>
        <h1>HTTP Request Queue Simulator</h1>
      </header>

      <div className="top-controls">
        <Settings
          settings={settings}
          onChange={setSettings}
          onToggle={toggleRunning}
          onStartTimed={startTimed}
          onReset={reset}
        />
      </div>

      <main className="simulation-container">
        <SimulationView
          requests={requests}
          stats={stats}
          queueMode={settings.queueMode}
          queueTimeout={settings.queueTimeout}
        />
      </main>
    </div>
  );
}

export default App;
