import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {Animated, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, themedStyles } from '../constants/theme';
import { t } from '../i18n';

const ToastContext = createContext({ showToast: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const showToast = useCallback(
    (message, kind = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, kind });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2400);
    },
    [opacity]
  );

  const isError = toast?.kind === 'error';
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, isError && styles.toastError]}>
            <MaterialCommunityIcons
              name={isError ? 'alert-circle-outline' : 'check-circle-outline'}
              size={20}
              color={isError ? '#FFD9D5' : colors.gold}
            />
            <Text style={styles.text}>{t(toast.message)}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = themedStyles(() => ({
  wrap: { position: 'absolute', left: 20, right: 20, bottom: 96, alignItems: 'center', zIndex: 999 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    maxWidth: 420,
    ...shadows.lifted,
  },
  toastError: { backgroundColor: '#7A2B27' },
  text: { color: colors.white, fontFamily: fonts.sansMedium, fontSize: 14, flexShrink: 1 },
}));
