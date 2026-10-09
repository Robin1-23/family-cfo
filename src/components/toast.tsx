import { Feather } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, usePalette } from '@/theme/tokens';
import { tap } from './haptics';
import { Text } from './ui';

interface ToastInput {
  message: string;
  /** Shows an action button, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => undefined);

const SHOW_MS = 5000;
const ENTER = FadeInDown.duration(220).reduceMotion(ReduceMotion.System);
const EXIT = FadeOutDown.duration(180).reduceMotion(ReduceMotion.System);

/** One toast at a time, above the tab bar. Newer toasts replace older ones. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), SHOW_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={ENTER}
          exiting={EXIT}
          accessibilityLiveRegion="polite"
          style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 84 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              minHeight: 50,
              paddingLeft: space.lg,
              paddingRight: space.sm,
              borderRadius: radius.pill,
              backgroundColor: p.ink,
              boxShadow: p.shadow,
            }}>
            <Feather name="check-circle" size={16} color={p.bg} />
            <Text variant="label" style={{ flex: 1, color: p.bg }} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  tap();
                  toast.onAction!();
                  setToast(null);
                }}
                style={{ paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: p.bg }}>
                <Text variant="label" style={{ color: p.lime }}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
