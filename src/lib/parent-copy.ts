import type { Language } from './types';

/** Copy for the simplified parent view. Hindi by default for parents. */
const en = {
  greeting: (name: string) => `Namaste, ${name}`,
  readOnly: 'You can only view. No money ever moves from here.',
  yourCover: 'Your health cover',
  noCover: 'No health policy added yet',
  coverUpTo: (amount: string) => `Treatment covered up to ${amount}`,
  renews: (date: string) => `Renews on ${date}`,
  helpline: 'Call insurer',
  nextPayments: 'Upcoming payments',
  noPayments: 'Nothing due in the next 60 days',
  dueOn: (date: string) => `Due ${date}`,
  papers: 'Important papers',
  papersSafe: (n: number) => `${n} ${n === 1 ? 'paper is' : 'papers are'} kept safe`,
  present: 'Kept safe',
  missing: 'Not added yet',
  call: (name: string) => `Call ${name}`,
  emergency: 'In hospital? Tap here',
  listen: 'Listen',
  docHealth: 'Health insurance',
  docTerm: 'Term insurance',
  docId: 'ID proof',
  switchLang: 'हिन्दी में देखें',
};

export type ParentCopy = typeof en;

const hi: ParentCopy = {
  greeting: (name: string) => `नमस्ते, ${name}`,
  readOnly: 'आप सिर्फ़ देख सकते हैं। यहाँ से पैसे कभी नहीं निकलते।',
  yourCover: 'आपका हेल्थ कवर',
  noCover: 'अभी कोई हेल्थ पॉलिसी नहीं जुड़ी है',
  coverUpTo: (amount: string) => `${amount} तक का इलाज कवर है`,
  renews: (date: string) => `${date} को रिन्यू होगी`,
  helpline: 'बीमा कंपनी को कॉल करें',
  nextPayments: 'अगले पेमेंट',
  noPayments: 'अगले 60 दिनों में कोई पेमेंट नहीं',
  dueOn: (date: string) => `${date} तक भरना है`,
  papers: 'ज़रूरी कागज़',
  papersSafe: (n: number) => `${n} कागज़ सुरक्षित रखे हैं`,
  present: 'सुरक्षित है',
  missing: 'अभी नहीं जुड़ा',
  call: (name: string) => `${name} को कॉल करें`,
  emergency: 'अस्पताल में हैं? यहाँ दबाएँ',
  listen: 'सुनें',
  docHealth: 'हेल्थ बीमा',
  docTerm: 'टर्म बीमा',
  docId: 'पहचान पत्र',
  switchLang: 'See in English',
};

export function parentCopy(language: Language): ParentCopy {
  return language === 'hi' ? hi : en;
}
