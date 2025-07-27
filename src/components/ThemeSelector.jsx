import { useState, useEffect } from 'react';
import { themes, applyTheme, getStoredTheme, saveTheme } from '../utils/themes';

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    saveTheme(themeName);
    applyTheme(themeName);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.theme-selector')) {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentThemeData = themes[currentTheme];

  return (
    <div className="theme-selector">
      <button
        className="theme-selector-button"
        onClick={toggleDropdown}
        title="Change theme"
      >
        <span className="theme-icon">{currentThemeData.icon}</span>
        <span className="theme-name">{currentThemeData.name}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-header">Choose Theme</div>
          <div className="theme-options">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                onClick={() => handleThemeChange(key)}
              >
                <span className="theme-option-icon">{theme.icon}</span>
                <span className="theme-option-name">{theme.name}</span>
                {currentTheme === key && <span className="check-mark">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;