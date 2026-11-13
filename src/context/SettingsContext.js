import React, { createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = { language: 'pageoria.language', theme: 'pageoria.theme' };

export const SettingsContext = createContext({
  language: 'en',
  themeMode: 'system',
  setLanguage: () => {},
  setThemeMode: () => {},
});

export const useSettings = () => useContext(SettingsContext);

// Small preferences live in AsyncStorage (everything else is in SQLite).
export async function loadSettings() {
  try {
    const [language, themeMode] = await Promise.all([AsyncStorage.getItem(KEYS.language), AsyncStorage.getItem(KEYS.theme)]);
    return { language: language || 'en', themeMode: themeMode || 'system' };
  } catch (e) {
    return { language: 'en', themeMode: 'system' };
  }
}

export async function saveSetting(name, value) {
  try {
    await AsyncStorage.setItem(KEYS[name], value);
  } catch (e) {
    // preference could not be saved – the app still works for this session
  }
}
