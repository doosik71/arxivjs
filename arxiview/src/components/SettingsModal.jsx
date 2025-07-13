import { useState, useEffect } from 'react';
import { getSavedConfig, saveConfig, testBackendConnection, discoverBackendPort, getBackendUrl } from '../utils/config';

// Get current frontend port
const getCurrentPort = () => {
  if (typeof window !== 'undefined') {
    return parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80);
  }
  return null;
};

const SettingsModal = ({ isOpen, onClose, onConfigUpdate }) => {
  const [config, setConfig] = useState(getSavedConfig());
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getSavedConfig());
      setTestResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
    setError(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const currentPort = getCurrentPort();
      
      // Check if trying to connect to self
      if (currentPort && config.backendPort === currentPort && 
          (config.backendHost === 'localhost' || config.backendHost === '127.0.0.1' || config.backendHost === window.location.hostname)) {
        setTestResult({ 
          success: false, 
          message: `Cannot connect to port ${config.backendPort} - this is the current frontend port. Please use a different port.` 
        });
        setTesting(false);
        return;
      }

      const url = `${config.backendProtocol}://${config.backendHost}:${config.backendPort}`;
      const isReachable = await testBackendConnection(url);
      
      if (isReachable) {
        setTestResult({ success: true, message: `Backend is reachable at ${url}` });
      } else {
        setTestResult({ success: false, message: `Backend is not reachable at ${url}` });
      }
    } catch (err) {
      setError(`Connection test failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleAutoDiscover = async () => {
    setDiscovering(true);
    setTestResult(null);
    setError(null);

    try {
      const discovered = await discoverBackendPort(config.backendHost, config.backendProtocol);
      
      if (discovered) {
        setConfig(prev => ({
          ...prev,
          backendPort: discovered.port,
          backendHost: discovered.host,
          backendProtocol: discovered.protocol
        }));
        setTestResult({ 
          success: true, 
          message: `Backend auto-discovered at ${discovered.url}` 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: 'Auto-discovery failed. No backend found on common ports.' 
        });
      }
    } catch (err) {
      setError(`Auto-discovery failed: ${err.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = () => {
    try {
      const savedConfig = saveConfig(config);
      const newUrl = `${config.backendProtocol}://${config.backendHost}:${config.backendPort}`;
      
      // Update global backend URL
      window.ARXIVIEW_BACKEND_URL = newUrl;
      
      if (onConfigUpdate) {
        onConfigUpdate(savedConfig);
      }
      
      onClose();
    } catch (err) {
      setError(`Failed to save configuration: ${err.message}`);
    }
  };

  const handleReset = () => {
    setConfig({
      backendProtocol: 'http',
      backendHost: 'localhost', 
      backendPort: 9900
    });
    setTestResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Backend Server Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="settings-form">
            <div className="form-group">
              <label htmlFor="protocol">Protocol:</label>
              <select
                id="protocol"
                value={config.backendProtocol}
                onChange={e => handleInputChange('backendProtocol', e.target.value)}
                className="form-control"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="host">Host:</label>
              <input
                id="host"
                type="text"
                value={config.backendHost}
                onChange={e => handleInputChange('backendHost', e.target.value)}
                placeholder="localhost"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="port">Port:</label>
              <input
                id="port"
                type="number"
                value={config.backendPort}
                onChange={e => handleInputChange('backendPort', parseInt(e.target.value) || '')}
                placeholder="9900"
                min="1"
                max="65535"
                className="form-control"
              />
            </div>

            <div className="current-url">
              <strong>Backend URL:</strong> {config.backendProtocol}://{config.backendHost}:{config.backendPort}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <div className="button-group">
            <button
              onClick={handleTest}
              disabled={testing}
              className="btn btn-secondary"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={handleAutoDiscover}
              disabled={discovering}
              className="btn btn-secondary"
            >
              {discovering ? 'Discovering...' : 'Auto Discover'}
            </button>
            
            <button
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Reset to Default
            </button>
          </div>
          
          <div className="button-group">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;