import React, { createContext, useState, useEffect } from 'react';
import { DarkTheme as PaperDark, DefaultTheme as PaperLight } from 'react-native-paper';
import { StorageService } from '../services/storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      const storedValue = await StorageService.getItem('darkMode');
      if (storedValue !== null) {
        setIsDark(JSON.parse(storedValue));
      }
    })();
  }, []);

  const toggleTheme = async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    await StorageService.setItem('darkMode', JSON.stringify(newValue));
  };

  const theme = isDark ? PaperDark : PaperLight;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
