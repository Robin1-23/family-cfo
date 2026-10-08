import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, usePalette } from '@/theme/tokens';

type IconName = ComponentProps<typeof Feather>['name'];

/** Floating dark pill tab bar; the active tab sits in a black circle with a lavender icon. */
export default function TabsLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();

  const icon = (name: IconName) =>
    function TabIcon({ focused }: { focused: boolean }) {
      return (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: focused ? p.barActive : 'transparent',
          }}>
          <Feather name={name} size={21} color={focused ? p.lavender : p.inkFaint} />
        </View>
      );
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: p.bar,
          borderTopWidth: 0,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          marginHorizontal: space.lg,
          marginBottom: insets.bottom + space.sm,
          borderRadius: 34,
          elevation: 0,
        },
        tabBarItemStyle: { height: 52 },
        sceneStyle: { backgroundColor: p.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Family', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault', tabBarIcon: icon('folder') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
