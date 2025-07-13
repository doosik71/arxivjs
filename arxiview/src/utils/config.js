// Configuration management for ArxiView
export const DEFAULT_CONFIG = {
  backendPort: 9900,
  backendHost: 'localhost',
  backendProtocol: 'http'
};

const CONFIG_STORAGE_KEY = 'arxiview-config';

// Get backend URL from various sources
export const getBackendUrl = () => {
  // 1. Check environment variables first
  const envPort = import.meta.env.VITE_BACKEND_PORT;
  const envHost = import.meta.env.VITE_BACKEND_HOST;
  const envProtocol = import.meta.env.VITE_BACKEND_PROTOCOL;
  
  if (envPort) {
    const protocol = envProtocol || DEFAULT_CONFIG.backendProtocol;
    const host = envHost || DEFAULT_CONFIG.backendHost;
    return `${protocol}://${host}:${envPort}`;
  }

  // 2. Check localStorage for user settings
  const savedConfig = getSavedConfig();
  if (savedConfig.backendPort) {
    return `${savedConfig.backendProtocol}://${savedConfig.backendHost}:${savedConfig.backendPort}`;
  }

  // 3. Fall back to default
  return `${DEFAULT_CONFIG.backendProtocol}://${DEFAULT_CONFIG.backendHost}:${DEFAULT_CONFIG.backendPort}`;
};

// Get saved configuration from localStorage
export const getSavedConfig = () => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load saved config:', error);
  }
  return { ...DEFAULT_CONFIG };
};

// Save configuration to localStorage
export const saveConfig = (config) => {
  try {
    const mergedConfig = { ...getSavedConfig(), ...config };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(mergedConfig));
    return mergedConfig;
  } catch (error) {
    console.error('Failed to save config:', error);
    return getSavedConfig();
  }
};

// Test if backend is reachable at given URL
export const testBackendConnection = async (url) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/topics`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`Backend test failed for ${url}:`, error.message);
    return false;
  }
};

// Get current frontend port
const getCurrentPort = () => {
  if (typeof window !== 'undefined') {
    return parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80);
  }
  return null;
};

// Auto-discover backend port by testing common ports
export const discoverBackendPort = async (host = 'localhost', protocol = 'http') => {
  const commonPorts = [9900, 8000, 8080, 5000, 9000, 3001, 8001, 4000, 4001, 5001];
  const currentPort = getCurrentPort();
  
  // Filter out the current frontend port to avoid self-connection
  const portsToTest = commonPorts.filter(port => {
    if (currentPort && port === currentPort) {
      console.log(`Skipping port ${port} (current frontend port)`);
      return false;
    }
    return true;
  });
  
  console.log(`Testing ports: ${portsToTest.join(', ')} (excluding current port: ${currentPort})`);
  
  for (const port of portsToTest) {
    const url = `${protocol}://${host}:${port}`;
    console.log(`Testing backend at ${url}...`);
    
    const isReachable = await testBackendConnection(url);
    if (isReachable) {
      console.log(`Backend found at ${url}`);
      return { port, host, protocol, url };
    }
  }
  
  return null;
};

// Update API base URL for axios
export const updateApiBaseUrl = (url) => {
  // This will be called when backend URL changes
  window.ARXIVIEW_BACKEND_URL = url;
};

// Initialize configuration
export const initializeConfig = async () => {
  const savedConfig = getSavedConfig();
  const currentUrl = getBackendUrl();
  
  // Test current configuration
  const isCurrentWorking = await testBackendConnection(currentUrl);
  
  if (!isCurrentWorking) {
    console.log('Current backend URL not reachable, attempting auto-discovery...');
    
    const discovered = await discoverBackendPort(savedConfig.backendHost, savedConfig.backendProtocol);
    
    if (discovered) {
      const newConfig = {
        backendPort: discovered.port,
        backendHost: discovered.host,
        backendProtocol: discovered.protocol
      };
      saveConfig(newConfig);
      updateApiBaseUrl(discovered.url);
      return discovered.url;
    } else {
      console.warn('Auto-discovery failed. Please check backend server or configure manually.');
    }
  } else {
    updateApiBaseUrl(currentUrl);
  }
  
  return currentUrl;
};