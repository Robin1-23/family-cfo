import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/haptics';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { space, usePalette } from '@/theme/tokens';

type IconName = ComponentProps<typeof Feather>['name'];

const PARENT_RELATIONS = new Set(['mother', 'father', 'grandparent']);

/** iOS 26 Liquid Glass when available (checked once); the dark pill everywhere else. */
const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** Floating dark pill tab bar; the active tab sits in a lime circle with a dark icon. */
export default function TabsLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { members, role } = useHousehold();

  // A parent who joined by invite gets the simplified, read-only view instead of the full app.
  const linked = members.find((m) => m.uid && m.uid === user?.uid);
  if (role === 'viewer' && linked && PARENT_RELATIONS.has(linked.relation)) {
    return <Redirect href={{ pathname: '/parent/[id]', params: { id: linked.id } }} />;
  }

  const icon = (name: IconName) =>
    function TabIcon({ focused }: { focused: boolean }) {
      return (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: focused ? p.lime : 'transparent',
          }}>
          <Feather name={name} size={18} color={focused ? p.onTint : p.inkFaint} />
        </View>
      );
    };

  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: GLASS ? 'transparent' : p.bar,
          overflow: GLASS ? 'hidden' : 'visible',
          borderTopWidth: 0,
          height: 62,
          paddingTop: 9,
          paddingBottom: 9,
          paddingHorizontal: space.xs,
          marginHorizontal: 20,
          marginBottom: insets.bottom + space.sm,
          borderRadius: 31,
          borderWidth: 1,
          borderColor: p.line,
          boxShadow: p.shadow,
          elevation: 0,
        },
        tabBarItemStyle: { height: 44 },
        tabBarBackground: GLASS
          ? () => <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" tintColor={p.bar} colorScheme="dark" />
          : undefined,
        sceneStyle: { backgroundColor: p.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="radar" options={{ title: 'Coverage', tabBarAccessibilityLabel: 'Coverage radar', tabBarIcon: icon('target') }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline', tabBarAccessibilityLabel: 'Timeline and alerts', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault', tabBarAccessibilityLabel: 'Vault', tabBarIcon: icon('folder') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarAccessibilityLabel: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
