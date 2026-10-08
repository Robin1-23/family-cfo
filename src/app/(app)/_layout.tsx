import { Stack } from 'expo-router';

import { usePalette } from '@/theme/tokens';

export default function AppLayout() {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.bg },
        headerTintColor: p.primary,
        headerTitleStyle: { color: p.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: p.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member/[id]" options={{ title: '' }} />
      <Stack.Screen name="member/add" options={{ title: 'Add family member', presentation: 'modal' }} />
      <Stack.Screen name="upload" options={{ title: 'Add to vault', presentation: 'modal' }} />
    </Stack>
  );
}
