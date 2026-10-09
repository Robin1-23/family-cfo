import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Three feelings, used sparingly. Android uses performAndroidHapticsAsync, which
 * Expo recommends over its vibrator-based fallback. Failures are ignored: haptics
 * are never worth an error.
 */
const ignore = () => undefined;

/** Tab switches, chips, ordinary buttons. */
export function tap(): void {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(ignore);
  else Haptics.selectionAsync().catch(ignore);
}

/** Something saved or completed: mark paid, confirm details, accept invite. */
export function success(): void {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(ignore);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
}

/** Opening Emergency Mode. */
export function heavy(): void {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press).catch(ignore);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(ignore);
}
