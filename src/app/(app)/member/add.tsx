import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { success } from '@/components/haptics';
import { useToast } from '@/components/toast';
import { Button, ChipGroup, Field, HeroCard, Notice, Screen } from '@/components/ui';
import { RELATION_LABELS, RELATION_ORDER } from '@/lib/catalog';
import { formatIndianMobile, normalizeIndianMobile } from '@/lib/phone';
import type { Language, Relation } from '@/lib/types';
import { useHousehold } from '@/providers/household-provider';
import { addMember, updateMember } from '@/services/households';

const currentYear = new Date().getFullYear();

/** Add a family member, or edit one (?id=…). */
export default function MemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { household, members } = useHousehold();
  const existing = members.find((m) => m.id === id);
  const isSelf = existing?.relation === 'self';
  const [name, setName] = useState(existing?.name ?? '');
  const [relation, setRelation] = useState<Relation | null>(existing?.relation ?? null);
  const [language, setLanguage] = useState<Language>(existing?.language ?? 'hi');
  const [birthYear, setBirthYear] = useState(existing?.birthYear ? String(existing.birthYear) : '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [phone, setPhone] = useState(existing?.phone ? formatIndianMobile(existing.phone) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save() {
    if (!household) return;
    if (!name.trim()) return setError('Add their name.');
    if (!relation) return setError('Choose how they’re related to you.');
    let year: number | null = null;
    if (birthYear.trim()) {
      year = Number(birthYear);
      if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
        return setError(`Birth year should be between 1900 and ${currentYear}.`);
      }
    }
    const e164 = phone.trim() ? normalizeIndianMobile(phone) : null;
    if (phone.trim() && !e164) return setError('Enter a 10-digit Indian mobile number, like 98765 43210.');
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        await updateMember(household.id, existing.id, {
          name: name.trim(),
          relation,
          language,
          birthYear: year,
          city: city.trim() || null,
          phone: e164,
        });
      } else {
        await addMember(household.id, { name, relation, language, birthYear: year, city, phone: e164 });
      }
      success();
      toast({ message: existing ? 'Details saved' : `${name.trim().split(' ')[0]} added to your family` });
      router.back();
    } catch (e) {
      setError((e as Error).message || 'Couldn’t save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label={existing ? 'Save changes' : 'Add to family'} icon="check" onPress={save} loading={busy} />}>
      <HeroCard
        tint="forest"
        icon={existing ? 'user' : 'user-plus'}
        back
        title={existing ? (isSelf ? 'Your details' : `Edit ${existing.name.split(' ')[0]}`) : 'Add family member'}
        subtitle={existing ? undefined : 'Nothing connects until they approve.'}
      />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Sunita Sharma" autoFocus={!existing} />
      {!isSelf ? (
        <ChipGroup<Relation>
          label="Relation to you"
          value={relation}
          onChange={setRelation}
          options={RELATION_ORDER.filter((r) => r !== 'self').map((r) => ({ value: r, label: RELATION_LABELS[r] }))}
        />
      ) : null}
      <ChipGroup<Language>
        label={isSelf ? 'Your language' : 'Their language for reminders'}
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'hi', label: 'हिन्दी' },
          { value: 'en', label: 'English' },
        ]}
      />
      <Field
        label="WhatsApp number (optional)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="98765 43210"
        hint={isSelf ? 'For your reminders, and so parents can call you.' : 'For reminders and their invite. Only they can accept it.'}
      />
      <Field
        label="Birth year (optional)"
        value={birthYear}
        onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        placeholder="1966"
        hint="Helps check cover for their age."
      />
      <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="Lucknow" />
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Screen>
  );
}
