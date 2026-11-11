import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/context/ToastContext';
import { SettingsContext, loadSettings, saveSetting } from './src/context/SettingsContext';
import { initDatabase } from './src/database/database';
import { setLanguage as applyLanguage, t } from './src/i18n';
import { applyTheme, colors, fonts, themedStyles } from './src/constants/theme';
import { Text } from 'react-native';
import Button from './src/components/Button';
import LoadingView from './src/components/LoadingView';

const resolveTheme = (mode, scheme) => (mode === 'system' ? (scheme === 'dark' ? 'midnight' : 'sage') : mode);

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState(null); // { language, themeMode }
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const navState = useRef(undefined);
  const appliedTheme = useRef(null);

  // Load saved language / theme before the first real screen is drawn.
  useEffect(() => {
    let active = true;
    loadSettings().then((s) => {
      if (!active) return;
      applyLanguage(s.language);
      setSettings(s);
    });
    return () => { active = false; };
  }, []);

  const setup = useCallback(async () => {
    setDbError(null);
    try {
      await initDatabase();
      setDbReady(true);
    } catch (e) {
      console.error('Database initialisation failed', e);
      setDbError(e?.message || 'The local database could not be opened.');
    }
  }, []);

  useEffect(() => {
    setup();
  }, [setup]);

  const language = settings?.language || 'en';
  const themeMode = settings?.themeMode || 'system';
  const resolved = resolveTheme(themeMode, systemScheme);

  // Apply the palette during render so every child below (keyed on `resolved`) draws with it.
  if (appliedTheme.current !== resolved) {
    applyTheme(resolved);
    appliedTheme.current = resolved;
  }

  const changeLanguage = useCallback((code) => {
    applyLanguage(code);
    saveSetting('language', code);
    setSettings((s) => ({ ...(s || { themeMode: 'system' }), language: code }));
  }, []);

  const changeTheme = useCallback((mode) => {
    saveSetting('theme', mode);
    setSettings((s) => ({ ...(s || { language: 'en' }), themeMode: mode }));
  }, []);

  let content;
  if (dbError) {
    content = (
      <View style={styles.center}>
        <Text style={styles.errTitle}>{t('PAGEORIA could not open your library')}</Text>
        <Text style={styles.errText}>{dbError}</Text>
        <Button title="Try again" onPress={setup} style={{ marginTop: 16 }} />
      </View>
    );
  } else if (!fontsLoaded || !dbReady || !settings) {
    content = <LoadingView label="Opening your library…" />;
  } else {
    content = (
      // Changing language or theme re-mounts the tree (so every style is re-read);
      // the navigation state is kept so you stay on the same screen.
      <View key={`${language}-${resolved}`} style={{ flex: 1, backgroundColor: colors.background }}>
        <ToastProvider>
          <AppNavigator initialState={navState.current} onStateChange={(s) => { navState.current = s; }} />
        </ToastProvider>
      </View>
    );
  }

  return (
    <SettingsContext.Provider value={{ language, themeMode, setLanguage: changeLanguage, setThemeMode: changeTheme }}>
      <SafeAreaProvider>
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        {content}
      </SafeAreaProvider>
    </SettingsContext.Provider>
  );
}

const styles = themedStyles(() => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  errTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, textAlign: 'center' },
  errText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSoft, textAlign: 'center', marginTop: 8 },
}));
