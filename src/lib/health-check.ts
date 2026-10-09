import { healthGuideline, isSenior } from './radar';
import type { HealthCheck, Member } from './types';

/**
 * The onboarding "quick health check": 6 self-reported questions per parent
 * that give a first Coverage Score before any document is uploaded.
 * Facts and generic education only, never a product (spec: explain, don't sell).
 */

type Key = keyof HealthCheck;

export interface Question<K extends Key = Key> {
  key: K;
  text: (name: string) => string;
  options: { value: NonNullable<HealthCheck[K]>; label: string }[];
  /** Only asked when this returns true for the answers so far. */
  when?: (a: Partial<HealthCheck>) => boolean;
}

const YNU = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
] as const;

export const QUESTIONS: Question[] = [
  { key: 'healthCover', text: (n) => `Does ${n} have health insurance?`, options: [...YNU] },
  {
    key: 'healthCoverBand',
    text: (n) => `Roughly how much is ${n}’s health cover?`,
    when: (a) => a.healthCover === 'yes',
    options: [
      { value: 'under_3l', label: 'Under ₹3 lakh' },
      { value: '3l_5l', label: '₹3–5 lakh' },
      { value: '5l_10l', label: '₹5–10 lakh' },
      { value: '10l_plus', label: '₹10 lakh or more' },
      { value: 'unsure', label: 'Not sure' },
    ],
  },
  { key: 'loans', text: (n) => `Does ${n} have any loans or EMIs?`, options: [...YNU] },
  {
    key: 'termCover',
    text: (n) => `Does ${n} have term life insurance that would pay off that loan?`,
    when: (a) => a.loans === 'yes',
    options: [...YNU],
  },
  { key: 'fixedDeposits', text: (n) => `Does ${n} have FDs or savings to fall back on?`, options: [...YNU] },
  {
    key: 'papersWith',
    text: (n) => `If ${n} were in hospital tomorrow, who could find the policy papers?`,
    options: [
      { value: 'family', label: 'Most of the family' },
      { value: 'one_person', label: 'Only one person' },
      { value: 'nobody', label: 'Nobody, really' },
    ],
  },
];

/** The questions to ask next, given what has been answered. */
export function questionsFor(answers: Partial<HealthCheck>): Question[] {
  return QUESTIONS.filter((q) => !q.when || q.when(answers));
}

/** Who the check is about: parents first (that's the job); just you if no parents were added. */
export function checkTargets<M extends Pick<Member, 'relation'>>(members: M[]): M[] {
  const parents = members.filter((m) => m.relation === 'mother' || m.relation === 'father');
  return parents.length > 0 ? parents : members.filter((m) => m.relation === 'self');
}

/** Drops answers to questions that no longer apply (e.g. cover amount after changing "Yes" to "No"). */
export function completeCheck(answers: Partial<HealthCheck>): HealthCheck | null {
  const asked = questionsFor(answers);
  if (asked.some((q) => answers[q.key] == null)) return null;
  return {
    healthCover: answers.healthCover!,
    healthCoverBand: answers.healthCover === 'yes' ? answers.healthCoverBand! : null,
    loans: answers.loans!,
    termCover: answers.loans === 'yes' ? answers.termCover! : null,
    fixedDeposits: answers.fixedDeposits!,
    papersWith: answers.papersWith!,
  };
}

export interface MemberScore {
  score: number;
  /** One line each: what the gap is and why it matters. */
  gaps: string[];
}

/**
 * Weights: health cover 40, loans covered 35, savings 10, papers findable 15.
 * Uses the same health guideline as Coverage Radar.
 */
export function memberCoverageScore(
  check: HealthCheck,
  member: Pick<Member, 'name' | 'relation' | 'birthYear'>,
  currentYear = new Date().getFullYear(),
): MemberScore {
  const name = member.relation === 'self' ? 'You' : member.name.split(' ')[0];
  const isSelf = member.relation === 'self';
  const senior = isSenior(member, currentYear);
  const suggested = `₹${healthGuideline(member, currentYear) / 100_000} lakh`;
  const gaps: string[] = [];
  let score = 0;

  if (check.healthCover === 'yes') {
    const band = check.healthCoverBand;
    const points = { '10l_plus': 40, '5l_10l': senior ? 25 : 40, '3l_5l': 20, under_3l: 10, unsure: 20 } as const;
    score += band ? points[band] : 20;
    if (band === 'unsure') gaps.push(`Check the cover amount on ${isSelf ? 'your' : `${name}’s`} policy.`);
    else if (band && points[band] < 40)
      gaps.push(`${isSelf ? 'Your' : `${name}’s`} cover is under the ${suggested} often suggested${senior ? ' after 55' : ''}.`);
  } else if (check.healthCover === 'unsure') {
    score += 10;
    gaps.push(`Find out if ${isSelf ? 'you have' : `${name} has`} health cover, even a CGHS or employer card.`);
  } else {
    gaps.push(`${isSelf ? 'You have' : `${name} has`} no health cover. One hospital stay can cost lakhs.`);
  }

  if (check.loans === 'no' || check.termCover === 'yes') score += 35;
  else if (check.loans === 'unsure' || check.termCover === 'unsure') {
    score += 15;
    gaps.push(`Check ${isSelf ? 'your' : `${name}’s`} loans and whether life cover repays them.`);
  } else {
    score += 5;
    gaps.push(`${isSelf ? 'Your' : `${name}’s`} loan has no term cover to repay it.`);
  }

  if (check.fixedDeposits === 'yes') score += 10;
  else if (check.fixedDeposits === 'unsure') score += 5;
  else gaps.push(`${isSelf ? 'You have' : `${name} has`} no savings for an emergency.`);

  if (check.papersWith === 'family') score += 15;
  else if (check.papersWith === 'one_person') {
    score += 5;
    gaps.push(`Only one person can find ${isSelf ? 'your' : `${name}’s`} papers.`);
  } else {
    gaps.push(`Nobody can find ${isSelf ? 'your' : `${name}’s`} papers quickly.`);
  }

  return { score, gaps };
}

/** Average over members who have taken the check; null until someone has. */
export function familyCoverageScore(
  members: Pick<Member, 'name' | 'relation' | 'birthYear' | 'healthCheck'>[],
  currentYear?: number,
): number | null {
  const scored = members.filter((m) => m.healthCheck).map((m) => memberCoverageScore(m.healthCheck!, m, currentYear).score);
  return scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
}
