export const themes = {
  light: {
    name: 'Light',
    icon: '☀️',
    colors: {
      primary: '#2c3e50',
      secondary: '#3498db',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#2c3e50',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      hover: '#e9ecef',
      accent: '#17a2b8'
    }
  },
  dark: {
    name: 'Dark',
    icon: '🌙',
    colors: {
      primary: '#ffffff',
      secondary: '#64b5f6',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#333333',
      hover: '#2a2a2a',
      accent: '#90caf9'
    }
  },
  forest: {
    name: 'Forest',
    icon: '🌲',
    colors: {
      primary: '#2d5016',
      secondary: '#4caf50',
      background: '#f1f8e9',
      surface: '#ffffff',
      text: '#1b5e20',
      textSecondary: '#388e3c',
      border: '#c8e6c9',
      hover: '#e8f5e8',
      accent: '#66bb6a'
    }
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    colors: {
      primary: '#0d47a1',
      secondary: '#2196f3',
      background: '#e3f2fd',
      surface: '#ffffff',
      text: '#0d47a1',
      textSecondary: '#1565c0',
      border: '#bbdefb',
      hover: '#e1f5fe',
      accent: '#03a9f4'
    }
  },
  sunset: {
    name: 'Sunset',
    icon: '🌅',
    colors: {
      primary: '#bf360c',
      secondary: '#ff5722',
      background: '#fff3e0',
      surface: '#ffffff',
      text: '#d84315',
      textSecondary: '#f57c00',
      border: '#ffccbc',
      hover: '#fbe9d0',
      accent: '#ff9800'
    }
  },
  lavender: {
    name: 'Lavender',
    icon: '💜',
    colors: {
      primary: '#4a148c',
      secondary: '#9c27b0',
      background: '#f3e5f5',
      surface: '#ffffff',
      text: '#4a148c',
      textSecondary: '#7b1fa2',
      border: '#e1bee7',
      hover: '#f8e8ff',
      accent: '#ab47bc'
    }
  },
  coffee: {
    name: 'Coffee',
    icon: '☕',
    colors: {
      primary: '#3e2723',
      secondary: '#8d6e63',
      background: '#efebe9',
      surface: '#ffffff',
      text: '#3e2723',
      textSecondary: '#5d4037',
      border: '#d7ccc8',
      hover: '#f5f5f5',
      accent: '#a1887f'
    }
  },
  mint: {
    name: 'Mint',
    icon: '🌿',
    colors: {
      primary: '#004d40',
      secondary: '#26a69a',
      background: '#e0f2f1',
      surface: '#ffffff',
      text: '#004d40',
      textSecondary: '#00695c',
      border: '#b2dfdb',
      hover: '#f0f9f8',
      accent: '#4db6ac'
    }
  }
};

export const getDefaultTheme = () => 'light';

export const applyTheme = (themeName) => {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  const { colors } = theme;

  // Apply CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Add theme class to body
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${themeName}`);
};

export const getStoredTheme = () => {
  return localStorage.getItem('arxiview-theme') || getDefaultTheme();
};

export const saveTheme = (themeName) => {
  localStorage.setItem('arxiview-theme', themeName);
};