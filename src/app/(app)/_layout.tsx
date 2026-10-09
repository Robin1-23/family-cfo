import { Stack } from 'expo-router';

import { usePalette } from '@/theme/tokens';

export default function AppLayout() {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: p.bg },
        headerTintColor: p.primary,
        headerTitleStyle: { color: p.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: p.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member/[id]" options={{ title: '' }} />
      <Stack.Screen name="member/add" options={{ presentation: 'formSheet', sheetAllowedDetents: [1.0], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
      <Stack.Screen name="upload" options={{ presentation: 'formSheet', sheetAllowedDetents: [1.0], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
      <Stack.Screen name="item/new" options={{ presentation: 'formSheet', sheetAllowedDetents: [1.0], sheetGrabberVisible: true, sheetCornerRadius: 32 }} />
      <Stack.Screen name="health-check" options={{ title: 'Quick health check', presentation: 'modal' }} />
      <Stack.Screen name="emergency" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="parent/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="net-worth" />
      <Stack.Screen name="ask" />
    </Stack>
  );
}
