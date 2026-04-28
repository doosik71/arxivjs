// Configuration management for ArxiView
export const DEFAULT_CONFIG = {
  summaryEngine: 'gemini'
};

const CONFIG_STORAGE_KEY = 'arxiview-config';

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

export const getSelectedSummaryEngine = (availableEngines = []) => {
  const { summaryEngine } = getSavedConfig();
  if (!availableEngines.length || availableEngines.includes(summaryEngine)) {
    return summaryEngine;
  }
  return availableEngines[0] || DEFAULT_CONFIG.summaryEngine;
};
