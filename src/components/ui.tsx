import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, space, type, usePalette } from '@/theme/tokens';

type Variant = keyof Omit<typeof type, 'number'>;

export function Text({
  variant = 'body',
  tone = 'ink',
  style,
  children,
  numberOfLines,
}: {
  variant?: Variant;
  tone?: 'ink' | 'soft' | 'faint' | 'primary' | 'danger' | 'onPrimary';
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const p = usePalette();
  const color = {
    ink: p.ink,
    soft: p.inkSoft,
    faint: p.inkFaint,
    primary: p.primary,
    danger: p.danger,
    onPrimary: p.primaryInk,
  }[tone];
  return (
    <RNText numberOfLines={numberOfLines} style={[type[variant], { color }, style]}>
      {children}
    </RNText>
  );
}

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  footer?: ReactNode;
}) {
  const p = usePalette();
  const body = (
    <View style={{ paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.lg }}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: p.bg }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxl }}>
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm }}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const inactive = disabled || loading;
  const bg = kind === 'primary' ? p.primary : kind === 'secondary' ? p.surface : 'transparent';
  const fg = kind === 'primary' ? p.primaryInk : p.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        {
          minHeight: 54,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: p.line,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.lg,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <RNText style={[type.label, { color: fg, fontSize: 16 }]}>{label}</RNText>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={p.inkFaint}
        {...input}
        style={[
          type.body,
          {
            color: p.ink,
            backgroundColor: p.surface,
            borderWidth: 1,
            borderColor: error ? p.danger : p.line,
            borderRadius: radius.md,
            paddingHorizontal: space.lg,
            minHeight: 54,
          },
          input.style,
        ]}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Single-select chips, used for relation, document type and member pickers. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: space.sm }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: 10,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected ? p.primary : p.line,
                backgroundColor: selected ? p.primary : p.surface,
              }}>
              <Text variant="label" tone={selected ? 'onPrimary' : 'ink'}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View
      style={[
        { backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg + 2, gap: space.md },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Notice({ tone = 'due', children }: { tone?: 'due' | 'danger' | 'primary'; children: ReactNode }) {
  const p = usePalette();
  const bg = tone === 'due' ? p.dueWash : tone === 'danger' ? p.dangerWash : p.lavenderWash;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md + 2 }}>
      <Text variant="caption">{children}</Text>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, gap: space.md, padding: space.xl }}>
      {children}
    </View>
  );
}

const AVATAR_TINTS = ['lavender', 'peach', 'line'] as const;

/** Initials in a soft tinted circle; the tint is stable per name. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const p = usePalette();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  const tint = AVATAR_TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  const bg = tint === 'lavender' ? p.lavenderWash : tint === 'peach' ? p.peachWash : p.surfaceSunk;
  const fg = tint === 'lavender' ? p.lavenderDeep : tint === 'peach' ? p.peachDeep : p.inkSoft;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={[type.label, { color: fg, fontSize: size * 0.36 }]}>{initials}</RNText>
    </View>
  );
}

/** The round dark "go" button that sits in the corner of hero cards. */
export function ArrowButton({ onPress, label, light = false }: { onPress: () => void; label: string; light?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: light ? p.surface : p.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}>
      <Feather name="arrow-right" size={22} color={light ? p.ink : p.primaryInk} />
    </Pressable>
  );
}

/** A small rounded square holding an icon, used in the corner of stat cards. */
export function IconTile({ name, bg, color }: { name: ComponentProps<typeof Feather>['name']; bg: string; color: string }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: radius.sm + 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={name} size={18} color={color} />
    </View>
  );
}

type HeroTint = 'lavender' | 'peach' | 'dark';

/**
 * The big coloured card at the top of every screen: optional back button,
 * a large title, a line of context, and a soft icon blob in the corner.
 */
export function HeroCard({
  tint,
  icon,
  title,
  eyebrow,
  subtitle,
  back = false,
  children,
}: {
  tint: HeroTint;
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const p = usePalette();
  const bg = tint === 'lavender' ? p.lavender : tint === 'peach' ? p.peach : p.bar;
  const fg = tint === 'dark' ? p.onBar : p.onTint;
  const blob = tint === 'lavender' ? p.lavenderWash : tint === 'peach' ? p.peachWash : p.barActive;
  const blobIcon = tint === 'lavender' ? p.lavenderDeep : tint === 'peach' ? p.peachDeep : p.peach;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 34, padding: space.xl, gap: space.md, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          right: -30,
          top: -24,
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: blob,
          opacity: tint === 'dark' ? 0.8 : 0.4,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather name={icon} size={66} color={blobIcon} />
      </View>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.back()}
          style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: fg, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="chevron-left" size={22} color={fg} />
        </Pressable>
      ) : null}
      {eyebrow ? <RNText style={[type.label, { color: fg }]}>{eyebrow}</RNText> : null}
      <RNText style={[type.display, { color: fg, fontSize: 36, lineHeight: 40, maxWidth: '78%' }]}>{title}</RNText>
      {subtitle ? <RNText style={[type.body, { color: fg }]}>{subtitle}</RNText> : null}
      {children}
    </View>
  );
}
