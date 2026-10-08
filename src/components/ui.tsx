import type { ReactNode } from 'react';
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
  const bg = kind === 'primary' ? p.primary : kind === 'secondary' ? p.primaryWash : 'transparent';
  const fg = kind === 'primary' ? p.primaryInk : p.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: radius.md,
          backgroundColor: bg,
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
            paddingHorizontal: space.md,
            minHeight: 50,
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
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected ? p.primary : p.line,
                backgroundColor: selected ? p.primaryWash : p.surface,
              }}>
              <Text variant="label" tone={selected ? 'primary' : 'soft'}>
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
        { backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: p.line },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Notice({ tone = 'due', children }: { tone?: 'due' | 'danger' | 'primary'; children: ReactNode }) {
  const p = usePalette();
  const bg = tone === 'due' ? p.dueWash : tone === 'danger' ? p.dangerWash : p.primaryWash;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md }}>
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
