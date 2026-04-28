import { useEffect, useState } from 'react';
import { getRuntimeConfig } from '../api';
import { getSavedConfig, getSelectedSummaryEngine, saveConfig } from '../utils/config';

const DEFAULT_RUNTIME_CONFIG = {
  port: null,
  availableEngines: [],
  defaultEngine: null
};

const formatEngineLabel = (engine) => {
  if (engine === 'gemini') {
    return 'Gemini';
  }
  if (engine === 'ollama') {
    return 'Ollama';
  }
  return engine;
};

const SettingsModal = ({ isOpen, onClose, onConfigUpdate }) => {
  const [config, setConfig] = useState(getSavedConfig());
  const [runtimeConfig, setRuntimeConfig] = useState(DEFAULT_RUNTIME_CONFIG);
  const [loadingRuntimeConfig, setLoadingRuntimeConfig] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadRuntimeConfig = async () => {
      setLoadingRuntimeConfig(true);
      setError(null);

      try {
        const runtime = await getRuntimeConfig();
        const availableEngines = Array.isArray(runtime.availableEngines) ? runtime.availableEngines : [];
        const selectedEngine = getSelectedSummaryEngine(availableEngines);

        setRuntimeConfig({
          port: runtime.port ?? null,
          availableEngines,
          defaultEngine: runtime.defaultEngine || availableEngines[0] || null
        });
        setConfig((prev) => ({
          ...prev,
          summaryEngine: selectedEngine
        }));
      } catch (err) {
        setRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
        setError(`Failed to load runtime settings: ${err.message}`);
      } finally {
        setLoadingRuntimeConfig(false);
      }
    };

    setConfig(getSavedConfig());
    loadRuntimeConfig();
  }, [isOpen]);

  const handleSave = () => {
    try {
      const availableEngines = runtimeConfig.availableEngines || [];
      const fallbackEngine = getSelectedSummaryEngine(availableEngines);
      const summaryEngine = availableEngines.includes(config.summaryEngine)
        ? config.summaryEngine
        : fallbackEngine;
      const savedConfig = saveConfig({
        ...config,
        summaryEngine
      });

      onConfigUpdate?.(savedConfig);
      onClose();
    } catch (err) {
      setError(`Failed to save configuration: ${err.message}`);
    }
  };

  const engineOptions = runtimeConfig.availableEngines;
  const selectedEngine = engineOptions.includes(config.summaryEngine)
    ? config.summaryEngine
    : runtimeConfig.defaultEngine || '';

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Settings</h2>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="modal-body">
          <div className="settings-form">
            <div className="form-group">
              <label htmlFor="port">Backend Port:</label>
              <input
                id="port"
                type="text"
                value={loadingRuntimeConfig ? 'Loading...' : (runtimeConfig.port ?? 'Unavailable')}
                readOnly
                className="form-control"
              />
            </div>

            <div className="form-group">
              <span>Summary Engine:</span>
              <div className="engine-option-list">
                {engineOptions.length === 0 ? (
                  <div className="form-control" aria-disabled="true">
                    No engine available
                  </div>
                ) : (
                  engineOptions.map((engine) => (
                    <label key={engine} className="engine-option">
                      <input
                        type="radio"
                        name="summaryEngine"
                        value={engine}
                        checked={selectedEngine === engine}
                        onChange={(e) => setConfig((prev) => ({ ...prev, summaryEngine: e.target.value }))}
                        disabled={loadingRuntimeConfig}
                      />
                      <span>{formatEngineLabel(engine)}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        </div>

        <div className="modal-footer">
          <div className="button-group">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={loadingRuntimeConfig || engineOptions.length === 0}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
