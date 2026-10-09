import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Children, isValidElement, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FONT, MAX_FONT_SCALE, radius, space, type, usePalette } from '@/theme/tokens';
import { tap } from './haptics';

type Variant = keyof Omit<typeof type, 'number'>;
type IconName = ComponentProps<typeof Feather>['name'];

/** Gentle press feedback for tappable cards. */
export const pressFeedback = (pressed: boolean): ViewStyle => ({
  opacity: pressed ? 0.92 : 1,
  transform: [{ scale: pressed ? 0.985 : 1 }],
});

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
    <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={numberOfLines} style={[type[variant], { color }, style]}>
      {children}
    </RNText>
  );
}

/** Staggered fade-up for a screen's sections. Built once, outside render; follows the system reduce-motion setting. */
const ENTER = Array.from({ length: 8 }, (_, i) =>
  FadeInDown.delay(i * 45).duration(380).reduceMotion(ReduceMotion.System),
);

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  footer,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  footer?: ReactNode;
  /** Adds pull-to-refresh with a lime spinner. */
  onRefresh?: () => Promise<void>;
}) {
  const p = usePalette();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        await onRefresh().finally(() => setRefreshing(false));
      }
    : undefined;
  let i = 0;
  const sections = Children.map(children, (child) =>
    isValidElement(child) ? (
      <Animated.View key={child.key ?? undefined} entering={ENTER[Math.min(i++, ENTER.length - 1)]}>
        {child}
      </Animated.View>
    ) : (
      child
    ),
  );
  const body = <View style={{ paddingHorizontal: 20, paddingTop: space.md, gap: space.lg }}>{sections}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: p.bg }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            refresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={p.lime} colors={[p.onTint]} progressBackgroundColor={p.lime} />
            ) : undefined
          }
          contentContainerStyle={{ paddingBottom: space.xxl }}>
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: 20, paddingBottom: space.md, paddingTop: space.sm }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  /** dark: for buttons sitting on a lime panel. */
  kind?: 'primary' | 'secondary' | 'quiet' | 'dark';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const inactive = disabled || loading;
  const bg = kind === 'primary' ? p.primary : kind === 'dark' ? p.bar : kind === 'secondary' ? p.surface : 'transparent';
  const fg = kind === 'primary' ? p.primaryInk : kind === 'dark' ? p.lime : p.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={inactive}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: p.line,
          flexDirection: 'row',
          gap: space.sm,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.lg,
          opacity: inactive ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={fg} /> : null}
          <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} style={[type.label, { color: fg, fontSize: 14 }]}>
            {label}
          </RNText>
        </>
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
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="soft">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={p.inkFaint}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
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
            minHeight: 48,
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
      {label ? (
        <Text variant="label" tone="soft">
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                tap();
                onChange(o.value);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected ? p.primary : pressed ? p.inkFaint : p.line,
                backgroundColor: selected ? p.primary : pressed ? p.surfaceSunk : p.surface,
              })}>
              <Text variant="label" tone={selected ? 'onPrimary' : 'ink'} style={{ fontWeight: '500' }}>
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
    <View style={[{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, boxShadow: p.shadow }, style]}>
      {children}
    </View>
  );
}

/** A section heading with an optional quiet action on the right. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
      <Text variant="heading">{title}</Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            paddingLeft: 12,
            paddingRight: 8,
            height: 30,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: p.line,
            ...pressFeedback(pressed),
          })}>
          <Text variant="caption" style={{ fontWeight: '600' }}>
            {action}
          </Text>
          <Feather name="chevron-right" size={13} color={p.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Notice({ tone = 'due', children }: { tone?: 'due' | 'danger' | 'primary'; children: ReactNode }) {
  const p = usePalette();
  const bg = tone === 'due' ? p.dueWash : tone === 'danger' ? p.dangerWash : p.limeWash;
  const fg = tone === 'due' ? p.amberDeep : tone === 'danger' ? p.danger : p.limeDeep;
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: bg, borderRadius: radius.md, padding: space.md }}>
      <Feather name={tone === 'danger' ? 'alert-circle' : tone === 'due' ? 'clock' : 'info'} size={14} color={fg} style={{ marginTop: 1 }} />
      <Text variant="caption" style={{ flex: 1 }}>
        {children}
      </Text>
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

const AVATAR_TINTS = ['lime', 'amber', 'line'] as const;

/** Initials in a soft tinted circle; the tint is stable per name. */
export function Avatar({
  name,
  size = 44,
  status,
}: {
  name: string;
  size?: number;
  /** A small dot: lime once they've joined, amber while the invite is pending. */
  status?: 'joined' | 'pending' | 'declined';
}) {
  const p = usePalette();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  const tint = AVATAR_TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  const bg = tint === 'lime' ? p.limeWash : tint === 'amber' ? p.amberWash : p.surfaceSunk;
  const fg = tint === 'lime' ? p.limeDeep : tint === 'amber' ? p.amberDeep : p.inkSoft;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText allowFontScaling={false} style={{ fontFamily: FONT, color: fg, fontSize: Math.round(size * 0.36), fontWeight: '700', letterSpacing: 0.3 }}>
        {initials}
      </RNText>
      {status ? (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            borderRadius: size,
            borderWidth: 2,
            borderColor: p.bg,
            backgroundColor: status === 'joined' ? p.lime : status === 'pending' ? p.amber : p.danger,
          }}
        />
      ) : null}
    </View>
  );
}

/** Avatar status from a member's consent, for the dot. */
export function memberStatus(m: { relation: string; consentStatus: string }): 'joined' | 'pending' | 'declined' | undefined {
  if (m.relation === 'self') return undefined;
  return m.consentStatus === 'granted' ? 'joined' : m.consentStatus === 'declined' ? 'declined' : 'pending';
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
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: light ? p.surface : p.bar,
        alignItems: 'center',
        justifyContent: 'center',
        ...pressFeedback(pressed),
      })}>
      <Feather name="arrow-right" size={18} color={light ? p.ink : p.onBar} />
    </Pressable>
  );
}

/** A small rounded square holding an icon, used in the corner of stat cards. */
export function IconTile({ name, bg, color, size = 36 }: { name: IconName; bg: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={name} size={Math.round(size * 0.44)} color={color} />
    </View>
  );
}

/** A round outlined back button, for screens without a hero card. */
export function BackButton() {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      onPress={() => router.back()}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: p.line,
        backgroundColor: p.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...pressFeedback(pressed),
      })}>
      <Feather name="chevron-left" size={20} color={p.ink} />
    </Pressable>
  );
}

type HeroTint = 'lime' | 'forest' | 'dark';

/**
 * The panel at the top of every screen: optional back button, a short overline,
 * a 24px title, one line of context, and a rounded icon tile in the corner.
 * Lime is the brand moment (dark tiles on lime); forest and dark are quieter.
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
  icon: IconName;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const p = usePalette();
  const bg = tint === 'lime' ? p.lime : tint === 'forest' ? p.forest : p.surface;
  const fg = tint === 'lime' ? p.onTint : p.onBar;
  const glow = tint === 'lime' ? p.limeSoft : tint === 'forest' ? p.forestDeep : p.surfaceSunk;
  const tileBg = tint === 'lime' ? p.bar : tint === 'forest' ? p.lime : p.limeWash;
  const tileFg = tint === 'lime' ? p.lime : tint === 'forest' ? p.onTint : p.lime;
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.xl,
        padding: 20,
        gap: space.sm,
        overflow: 'hidden',
        borderWidth: tint === 'dark' ? 1 : 0,
        borderColor: p.line,
      }}>
      {tint !== 'dark' ? <GradientFill tint={tint} /> : null}
      <View
        style={{
          position: 'absolute',
          right: -60,
          top: -80,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: glow,
          opacity: tint === 'lime' ? 0.7 : 0.6,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 18,
          top: 18,
          width: 46,
          height: 46,
          borderRadius: 15,
          backgroundColor: tileBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather name={icon} size={20} color={tileFg} />
      </View>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: fg,
            opacity: 0.85,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.xs,
            ...pressFeedback(pressed),
          })}>
          <Feather name="chevron-left" size={18} color={fg} />
        </Pressable>
      ) : null}
      {eyebrow ? (
        <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={[type.overline, { color: fg, opacity: 0.75, maxWidth: '75%' }]}>
          {eyebrow}
        </RNText>
      ) : null}
      <RNText
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        numberOfLines={2}
        style={[type.title, { color: fg, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, maxWidth: '75%' }]}>
        {title}
      </RNText>
      {subtitle ? (
        <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2} style={[type.caption, { color: fg, opacity: 0.85, maxWidth: '85%' }]}>
          {subtitle}
        </RNText>
      ) : null}
      {children}
    </View>
  );
}

/** Counts a number up from 0 when it first appears (or changes). Instant when reduce motion is on. */
export function useCountUp(target: number, ms = 700): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / ms, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, reduce]);
  return reduce ? target : value;
}

/** The diagonal gradient behind lime and forest panels (top-left highlight to bottom-right depth). */
export function GradientFill({ tint }: { tint: 'lime' | 'forest' }) {
  const p = usePalette();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={tint === 'lime' ? [p.limeHi, p.limeLo] : [p.forestHi, p.forest]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** A pulsing placeholder in the shape of real content, shown while data loads. */
export function Skeleton({ height = 16, width = '100%', round = radius.md }: { height?: number; width?: number | `${number}%`; round?: number }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    if (!reduce) pulse.value = withRepeat(withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View accessibilityElementsHidden style={[{ height, width, borderRadius: round, backgroundColor: p.surfaceSunk }, style]} />;
}

/** Three card-shaped skeleton rows: the default loading state for lists. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const p = usePalette();
  return (
    <View accessibilityLabel="Loading" style={{ gap: space.sm }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md }}>
          <Skeleton height={40} width={40} round={14} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={12} width="60%" />
            <Skeleton height={10} width="40%" />
          </View>
          <Skeleton height={14} width={56} />
        </View>
      ))}
    </View>
  );
}

/** An empty list with a small line illustration, one encouraging line and one action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.lg }}>
      <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm }}>
        <View style={{ position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderColor: p.line }} />
        <View style={{ position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: p.forestDeep, borderStyle: 'dashed' }} />
        <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: p.limeWash, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={24} color={p.lime} />
        </View>
        <View style={{ position: 'absolute', top: 10, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: p.lime }} />
        <View style={{ position: 'absolute', bottom: 16, left: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: p.amber }} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="caption" tone="soft" style={{ textAlign: 'center', maxWidth: 280 }}>
        {body}
      </Text>
      {action && onAction ? <Button label={action} icon="plus" onPress={onAction} style={{ marginTop: space.sm, paddingHorizontal: space.xl }} /> : null}
    </View>
  );
}

/**
 * A hero amount with the tail set smaller and lighter, like "₹18,400" with "/yr",
 * or "₹15" with "L". Splits a formatted rupee string after its digits.
 */
export function Amount({ value, size = 30, color, suffix }: { value: string; size?: number; color?: string; suffix?: string }) {
  const p = usePalette();
  const m = /^([−-]?\s?₹?[\d,]+)(.*)$/.exec(value);
  const main = m ? m[1] : value;
  const tail = (m ? m[2] : '') + (suffix ?? '');
  const c = color ?? p.ink;
  return (
    <Text variant="display" style={[type.number, { color: c, fontSize: size, lineHeight: size * 1.12, letterSpacing: -size * 0.04 }]}>
      {main}
      {tail ? <Text variant="title" style={{ color: c, opacity: 0.75, fontSize: size * 0.5, letterSpacing: 0 }}>{tail}</Text> : null}
    </Text>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The signature score ring: a thin arc that fills to the score, with the number in the middle. */
export function ScoreRing({
  value,
  size = 112,
  stroke = 10,
  color,
  track,
  children,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const progress = useSharedValue(reduce ? value : 0);
  useEffect(() => {
    progress.value = reduce ? value : withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, value, reduce]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - Math.min(Math.max(progress.value, 0), 100) / 100) }));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? p.surfaceSunk} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? p.lime}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={arc}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
