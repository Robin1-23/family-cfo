import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, HeroCard, Notice, Screen } from '@/components/ui';
import { formatIndianMobile, normalizeIndianMobile } from '@/lib/phone';
import { authErrorMessage, confirmOtp, sendOtp, type Confirmation } from '@/services/auth';
import { space } from '@/theme/tokens';

export default function SignInScreen() {
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    const e164 = normalizeIndianMobile(phoneInput);
    if (!e164) {
      setError('Enter a 10-digit Indian mobile number, like 98765 43210.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await sendOtp(e164);
      setPhone(e164);
      setConfirmation(c);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!confirmation) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the SMS.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmOtp(confirmation, code);
      // The auth listener moves the app on to onboarding or the dashboard.
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        confirmation ? (
          <Button label="Verify and continue" onPress={verify} loading={busy} />
        ) : (
          <Button label="Send code" onPress={requestCode} loading={busy} />
        )
      }>
      <HeroCard
        tint="forest"
        icon={confirmation ? 'message-square' : 'smartphone'}
        back={router.canGoBack()}
        title={confirmation ? 'Enter your code' : 'Sign in'}
        subtitle={
          confirmation && phone
            ? `Sent to ${formatIndianMobile(phone)}`
            : 'Just your mobile number. No passwords.'
        }
      />

      {confirmation && phone ? (
        <View style={{ gap: space.md }}>
          <Field
            label="6-digit code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            error={error}
          />
          <Button
            label="Use a different number"
            kind="quiet"
            onPress={() => {
              setConfirmation(null);
              setCode('');
              setError(null);
            }}
          />
        </View>
      ) : (
        <Field
          label="Your mobile number"
          hint="We’ll text you a one-time code."
          value={phoneInput}
          onChangeText={setPhoneInput}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="98765 43210"
          error={error}
        />
      )}

      <Notice tone="primary">Read-only. We never ask for bank passwords.</Notice>
    </Screen>
  );
}
