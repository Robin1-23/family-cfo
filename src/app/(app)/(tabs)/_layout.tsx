import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { usePalette } from '@/theme/tokens';

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.inkFaint,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line },
        sceneStyle: { backgroundColor: p.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Family', tabBarIcon: ({ color, size }) => <Feather name="users" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="vault"
        options={{ title: 'Vault', tabBarIcon: ({ color, size }) => <Feather name="folder" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
