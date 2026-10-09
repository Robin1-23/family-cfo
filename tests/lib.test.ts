/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, addYears, alertId, daysBetween, reminderMessage, remindersDueToday, todayInIndia } from '../functions/src/alerts';
import { buildAskContext, validSources } from '../functions/src/ask';
import { last4, normalizeExtraction, parseDate, parseHelpline, parseRupees } from '../functions/src/extraction';
import { inviteCodeFrom, inviteExpired, normalizeInviteCode } from '../functions/src/invite';
import { cashlessSearchUrl, emergencyPolicies, telUrl } from '../src/lib/emergency';
import { netWorth } from '../src/lib/networth';
import { coverageRadar, hasDependants, radarGaps } from '../src/lib/radar';
import { bucketOf, nextDueDate, relativeDay, timeline } from '../src/lib/timeline';
import { contributionShares, depositValue, financialYear, insights, policyReturn, taxTips } from '../src/lib/tools';
import { documentStoragePath, formatBytes, safeFileName, validateUpload } from '../src/lib/files';
import { checkTargets, completeCheck, familyCoverageScore, memberCoverageScore, questionsFor } from '../src/lib/health-check';
import { buildItem, draftFromDocument, formatCompactRupees, lowConfidenceFields, type ItemDraft } from '../src/lib/items';
import { canAdminister, canEdit, roleOf } from '../src/lib/permissions';
import { formatIndianMobile, maskPhone, normalizeIndianMobile } from '../src/lib/phone';
import { familyReadiness, memberReadiness, nextActions } from '../src/lib/readiness';
import type { DocType, HealthCheck, Item, Member, VaultDocument } from '../src/lib/types';

describe('normalizeIndianMobile', () => {
  it('accepts common Indian formats', () => {
    for (const input of ['9876543210', '98765 43210', '098765-43210', '919876543210', '+91 98765 43210']) {
      assert.equal(normalizeIndianMobile(input), '+919876543210', input);
    }
  });
  it('rejects numbers that are not Indian mobiles', () => {
    for (const input of ['', '12345', '5876543210', '98765432101', '+1 415 555 0100', '00919876543210']) {
      assert.equal(normalizeIndianMobile(input), null, input);
    }
  });
  it('formats and masks for display', () => {
    assert.equal(formatIndianMobile('+919876543210'), '+91 98765 43210');
    assert.equal(maskPhone('+919876543210'), '•••• 3210');
  });
});

describe('permissions', () => {
  const household = { roles: { a: 'owner', b: 'co_manager', c: 'viewer' } as const };
  it('reads the role from the roles map', () => {
    assert.equal(roleOf(household, 'a'), 'owner');
    assert.equal(roleOf(household, 'z'), null);
    assert.equal(roleOf(null, 'a'), null);
  });
  it('matches the rules: owners and co-managers edit, only owners administer', () => {
    assert.deepEqual(['owner', 'co_manager', 'viewer', null].map((r) => canEdit(r as never)), [true, true, false, false]);
    assert.deepEqual(['owner', 'co_manager', 'viewer'].map((r) => canAdminister(r as never)), [true, false, false]);
  });
});

describe('files', () => {
  it('accepts PDFs and photos up to 20 MB', () => {
    assert.equal(validateUpload({ fileName: 'a.pdf', contentType: 'application/pdf', sizeBytes: 1000 }), null);
    assert.equal(validateUpload({ fileName: 'a.jpg', contentType: 'IMAGE/JPEG', sizeBytes: 20 * 1024 * 1024 }), null);
  });
  it('rejects other types, empty files and oversize files', () => {
    assert.match(validateUpload({ fileName: 'a.docx', contentType: 'application/msword', sizeBytes: 10 })!, /Only PDFs/);
    assert.match(validateUpload({ fileName: 'a.pdf', contentType: 'application/pdf', sizeBytes: 0 })!, /empty/);
    assert.match(validateUpload({ fileName: 'a.pdf', contentType: 'application/pdf', sizeBytes: 21 * 1024 * 1024 })!, /20 MB/);
  });
  it('sanitises file names for storage paths', () => {
    assert.equal(safeFileName('Star Health Policy (2026).pdf'), 'Star-Health-Policy-2026.pdf');
    assert.equal(safeFileName('../../etc/passwd'), 'etcpasswd');
    assert.equal(safeFileName('पॉलिसी'), 'document');
    assert.equal(
      documentStoragePath('h1', 'm1', 'd1', 'My Policy.pdf'),
      'households/h1/members/m1/documents/d1/My-Policy.pdf',
    );
  });
  it('formats sizes', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(2048), '2 KB');
    assert.equal(formatBytes(3.5 * 1024 * 1024), '3.5 MB');
  });
});

describe('readiness', () => {
  const doc = (memberId: string, docType: DocType): VaultDocument => ({
    id: `${memberId}-${docType}`,
    memberId,
    docType,
    title: docType,
    fileName: 'f.pdf',
    storagePath: 'p',
    contentType: 'application/pdf',
    sizeBytes: 1,
    ocrStatus: 'pending',
    uploadedBy: 'u',
  });
  const member = (id: string, relation: Member['relation']) => ({ id, relation });
  const me = member('me', 'self');
  const mum = member('mum', 'mother');
  const docs = [doc('me', 'health_policy'), doc('me', 'term_policy'), doc('me', 'id_document'), doc('mum', 'health_policy'), doc('mum', 'other')];

  it('scores each member on essential documents only', () => {
    assert.equal(memberReadiness(me, docs).percent, 100);
    const m = memberReadiness(mum, docs);
    assert.equal(m.percent, 33);
    assert.equal(m.documentCount, 2);
    assert.deepEqual(m.missing, ['term_policy', 'id_document']);
  });
  it('averages across the family, and is 0 for an empty family', () => {
    assert.equal(familyReadiness([me, mum], docs), 67);
    assert.equal(familyReadiness([], docs), 0);
  });
  it('asks for parents’ gaps first, one per person', () => {
    const dad = member('dad', 'father');
    const actions = nextActions([me, mum, dad], docs);
    assert.deepEqual(actions, [
      { memberId: 'mum', docType: 'term_policy' },
      { memberId: 'dad', docType: 'health_policy' },
    ]);
  });
});

const emptyRaw = {
  itemType: null, provider: null, policyOrAccountNumber: null, amount: null, premium: null,
  dueDate: null, maturityDate: null, nominee: null, confidence: {},
};

describe('extraction parsing', () => {
  it('keeps only the last 4 characters of policy and account numbers', () => {
    assert.equal(last4('P/211123/01/2026/004567'), '4567');
    assert.equal(last4('ab-12'), 'AB12');
    assert.equal(last4(' / '), null);
    assert.equal(last4(null), null);
  });
  it('parses rupee amounts in Indian formats', () => {
    assert.equal(parseRupees('₹5,00,000'), 500000);
    assert.equal(parseRupees('Rs. 12,345.60/-'), 12346);
    assert.equal(parseRupees('5 lakh'), 500000);
    assert.equal(parseRupees('1.5 Cr'), 15000000);
    assert.equal(parseRupees('INR 0'), 0);
    for (const bad of ['', 'five lakh', '-500', '5,00,000 per year']) assert.equal(parseRupees(bad), null, bad);
  });
  it('reads Indian DD/MM/YYYY and ISO dates, rejecting impossible ones', () => {
    assert.equal(parseDate('31/03/2026'), '2026-03-31');
    assert.equal(parseDate('1.4.2026'), '2026-04-01');
    assert.equal(parseDate('2026-12-05'), '2026-12-05');
    for (const bad of ['31/02/2026', '03/31/2026', '2026/03/31', 'March 2026', '']) assert.equal(parseDate(bad), null, bad);
  });
  it('normalises model output and drops confidence for empty fields', () => {
    const out = normalizeExtraction({
      itemType: 'health_policy',
      provider: '  Star Health  and Allied ',
      policyOrAccountNumber: 'P/1234/5678',
      amount: '5,00,000',
      premium: 'not legible',
      dueDate: '15/08/2026',
      maturityDate: null,
      nominee: 'Ramesh Sharma',
      confidence: { itemType: 0.95, provider: 0.9, policyOrAccountNumber: 0.4, amount: 0.8, premium: 0.2, dueDate: 1.4, maturityDate: 0.1, nominee: 0.9 },
    });
    assert.equal(out.provider, 'Star Health and Allied');
    assert.equal(out.numberLast4, '5678');
    assert.equal(out.amount, 500000);
    assert.equal(out.premium, null);
    assert.equal(out.dueDate, '2026-08-15');
    assert.deepEqual(out.confidence, { itemType: 0.95, provider: 0.9, numberLast4: 0.4, amount: 0.8, dueDate: 0, nominee: 0.9 });
    assert.equal(normalizeExtraction({ ...emptyRaw, itemType: 'crypto_wallet' }).itemType, null);
  });
});

describe('items', () => {
  const extracted = {
    docType: 'health_policy' as const,
    extractedFields: normalizeExtraction({
      ...emptyRaw, provider: 'Star Health', policyOrAccountNumber: '99887766', amount: '500000', dueDate: '2026-08-15',
      confidence: { provider: 0.9, policyOrAccountNumber: 0.5, amount: 0.95, dueDate: 0.6 },
    }),
  };
  const ctx = { memberId: 'mum', uid: 'u1', sourceDocId: 'd1' };

  it('prefills the form from OCR, falling back to the document type', () => {
    assert.deepEqual(draftFromDocument(extracted), {
      type: 'health_policy', provider: 'Star Health', numberLast4: '7766', amount: '5,00,000',
      premium: '', dueDate: '15/08/2026', maturityDate: '', nominee: '', helpline: '', payerMemberId: null,
    });
    assert.equal(draftFromDocument({ docType: 'id_document' }).type, null);
    assert.equal(draftFromDocument(null).type, null);
  });
  it('flags fields the model was unsure about', () => {
    assert.deepEqual([...lowConfidenceFields(extracted)].sort(), ['dueDate', 'numberLast4']);
  });
  it('builds a record that matches the rules, round-tripping the prefilled form', () => {
    const result = buildItem(draftFromDocument(extracted), ctx);
    assert.deepEqual(result.item, {
      type: 'health_policy', memberId: 'mum', provider: 'Star Health', numberLast4: '7766', amount: 500000,
      premium: null, dueDate: '2026-08-15', maturityDate: null, nominee: null, helpline: null, payerMemberId: null,
      lastPaidOn: null, snoozedUntil: null, sourceDocId: 'd1', confirmedBy: 'u1',
    });
  });
  it('masks a full number typed by hand and reports bad input per field', () => {
    const draft: ItemDraft = { ...draftFromDocument(null), type: 'fixed_deposit', numberLast4: '1234567890' };
    assert.equal(buildItem(draft, ctx).item?.numberLast4, '7890');
    const bad = buildItem({ ...draft, type: null, amount: 'lots', dueDate: '31/02/2026' }, ctx);
    assert.equal(bad.item, null);
    assert.deepEqual(Object.keys(bad.errors ?? {}).sort(), ['amount', 'dueDate', 'type']);
  });
});

describe('health check', () => {
  const mum = { name: 'Sunita Sharma', relation: 'mother' as const, birthYear: 1964 };
  const best: HealthCheck = {
    healthCover: 'yes', healthCoverBand: '10l_plus', loans: 'no', termCover: null, fixedDeposits: 'yes', papersWith: 'family',
  };

  it('asks 4 to 6 questions depending on earlier answers', () => {
    assert.equal(questionsFor({}).length, 4);
    assert.equal(questionsFor({ healthCover: 'yes', loans: 'yes' }).length, 6);
    assert.deepEqual(questionsFor({ healthCover: 'no', loans: 'yes' }).map((q) => q.key), ['healthCover', 'loans', 'termCover', 'fixedDeposits', 'papersWith']);
  });
  it('checks parents, or just you when no parents were added', () => {
    const me = { relation: 'self' as const }, dad = { relation: 'father' as const }, sis = { relation: 'sibling' as const };
    assert.deepEqual(checkTargets([me, dad, sis]), [dad]);
    assert.deepEqual(checkTargets([me, sis]), [me]);
  });
  it('only completes when every applicable question is answered, dropping stale ones', () => {
    assert.equal(completeCheck({ healthCover: 'yes', loans: 'no', fixedDeposits: 'yes', papersWith: 'family' }), null);
    assert.deepEqual(
      completeCheck({ healthCover: 'no', healthCoverBand: '3l_5l', loans: 'no', termCover: 'yes', fixedDeposits: 'no', papersWith: 'nobody' }),
      { healthCover: 'no', healthCoverBand: null, loans: 'no', termCover: null, fixedDeposits: 'no', papersWith: 'nobody' },
    );
  });
  it('scores 100 with no gaps for a fully covered parent', () => {
    assert.deepEqual(memberCoverageScore(best, mum, 2026), { score: 100, gaps: [] });
  });
  it('scores 0 with a plain reason for every gap', () => {
    const worst: HealthCheck = { healthCover: 'no', healthCoverBand: null, loans: 'yes', termCover: 'no', fixedDeposits: 'no', papersWith: 'nobody' };
    const r = memberCoverageScore(worst, mum, 2026);
    assert.equal(r.score, 5);
    assert.equal(r.gaps.length, 4);
    assert.match(r.gaps[0], /^Sunita has no health cover/);
  });
  it('holds seniors to a higher health-cover guideline than younger members', () => {
    const mid: HealthCheck = { ...best, healthCoverBand: '5l_10l' };
    assert.equal(memberCoverageScore(mid, mum, 2026).score, 85);
    assert.match(memberCoverageScore(mid, mum, 2026).gaps[0], /₹10 lakh/);
    assert.deepEqual(memberCoverageScore(mid, { name: 'Priya', relation: 'self', birthYear: 2000 }, 2026), { score: 100, gaps: [] });
  });
  it('averages the family, and is null until someone takes the check', () => {
    const dad = { name: 'Ramesh', relation: 'father' as const, birthYear: 1960, healthCheck: { ...best, papersWith: 'one_person' as const } };
    assert.equal(familyCoverageScore([{ ...mum, healthCheck: best }, dad], 2026), 95);
    assert.equal(familyCoverageScore([mum], 2026), null);
  });
});

describe('formatCompactRupees', () => {
  it('shortens to K, lakh and crore', () => {
    assert.deepEqual([999, 45000, 500000, 1250000, 15000000].map(formatCompactRupees), ['₹999', '₹45K', '₹5L', '₹12.5L', '₹1.5Cr']);
  });
});

const item = (o: Partial<Item> & Pick<Item, 'id' | 'type' | 'memberId'>): Item => ({
  provider: null, numberLast4: null, amount: null, premium: null, dueDate: null, maturityDate: null, nominee: null,
  sourceDocId: null, confirmedBy: 'u', ...o,
});

describe('dates and reminders', () => {
  it('adds days and years across month ends and leap days', () => {
    assert.equal(addDays('2026-12-30', 3), '2027-01-02');
    assert.equal(addYears('2028-02-29', 1), '2029-02-28');
    assert.equal(daysBetween('2026-10-09', '2026-11-08'), 30);
    assert.equal(todayInIndia(new Date('2026-10-08T20:00:00Z')), '2026-10-09');
  });
  it('fires on 30, 7, 1 and 0 days out only, and not while snoozed', () => {
    const base = { id: 'i1', type: 'health_policy', dueDate: '2026-10-16', maturityDate: '2027-01-01' };
    assert.deepEqual(remindersDueToday(base, '2026-10-09').map((e) => [e.kind, e.daysLeft]), [['premium', 7]]);
    assert.deepEqual(remindersDueToday(base, '2026-10-10'), []);
    assert.deepEqual(remindersDueToday({ ...base, snoozedUntil: '2026-10-12' }, '2026-10-09'), []);
    assert.equal(alertId({ itemId: 'i1', kind: 'premium', date: '2026-10-16', daysLeft: 7 }), 'i1_premium_2026-10-16_7');
    assert.deepEqual(remindersDueToday({ ...base, type: 'loan', dueDate: '2026-10-09' }, '2026-10-09').map((e) => e.kind), ['emi']);
  });
  it('builds the WhatsApp template with Indian formats', () => {
    const msg = reminderMessage({ to: '+919876543210', language: 'hi', memberName: 'Sunita', provider: 'Star Health', kind: 'premium', date: '2026-10-16', amount: 18400 });
    assert.equal(msg.to, '919876543210');
    assert.equal(msg.template.language.code, 'hi');
    assert.deepEqual(msg.template.components[0].parameters.map((x) => x.text), ['Sunita', 'Star Health', 'प्रीमियम', '16/10/2026', '₹18,400']);
  });
});

describe('timeline', () => {
  const members = [{ id: 'me', relation: 'self' as const }, { id: 'mum', relation: 'mother' as const }];
  const items = [
    item({ id: 'a', type: 'health_policy', memberId: 'mum', premium: 18400, dueDate: '2026-10-20' }),
    item({ id: 'b', type: 'fixed_deposit', memberId: 'mum', amount: 200000, maturityDate: '2026-09-30', payerMemberId: 'mum' }),
    item({ id: 'c', type: 'loan', memberId: 'me', premium: 12000, dueDate: '2027-03-05', snoozedUntil: '2026-10-12' }),
  ];
  it('lists every date soonest first, owned by the payer or the household owner', () => {
    const t = timeline(items, members, '2026-10-09');
    assert.deepEqual(t.map((e) => [e.itemId, e.kind, e.daysLeft, e.ownerMemberId, e.amount]), [
      ['b', 'maturity', -9, 'mum', 200000],
      ['a', 'premium', 11, 'me', 18400],
      ['c', 'emi', 147, 'me', 12000],
    ]);
    assert.deepEqual(t.map(bucketOf), ['overdue', 'soon', 'later']);
    assert.equal(t[2].snoozed, true);
  });
  it('words days plainly and rolls dates forward on payment', () => {
    assert.deepEqual([0, 1, 5, -1, -3].map(relativeDay), ['Today', 'Tomorrow', 'In 5 days', '1 day late', '3 days late']);
    assert.equal(nextDueDate('premium', '2026-10-20'), '2027-10-20');
    assert.equal(nextDueDate('emi', '2026-01-31'), '2026-02-28');
    assert.equal(nextDueDate('emi', '2026-12-05'), '2027-01-05');
  });
});

describe('coverage radar', () => {
  const mum = { id: 'mum', relation: 'mother' as const, birthYear: 1964 };
  const me = { id: 'me', relation: 'self' as const, birthYear: 1999 };
  it('checks health against the age guideline and flags self-reported cover', () => {
    const low = coverageRadar(mum, [item({ id: 'a', type: 'health_policy', memberId: 'mum', amount: 500000 })], { hasDependants: false }, 2026);
    assert.deepEqual([low[0].status, low[0].suggested], ['low', 1000000]);
    const reported = coverageRadar({ ...mum, healthCheck: { healthCover: 'yes', healthCoverBand: '3l_5l', loans: 'no', termCover: null, fixedDeposits: 'no', papersWith: 'family' } }, [], { hasDependants: false }, 2026);
    assert.equal(reported[0].status, 'self_reported');
  });
  it('needs term cover for loans or dependants, and makes it optional otherwise', () => {
    assert.equal(coverageRadar(mum, [], { hasDependants: false }, 2026)[1].status, 'optional');
    assert.equal(coverageRadar(me, [], { hasDependants: true }, 2026)[1].status, 'missing');
    const loan = coverageRadar(mum, [item({ id: 'l', type: 'loan', memberId: 'mum', amount: 800000 }), item({ id: 't', type: 'term_policy', memberId: 'mum', amount: 500000 })], { hasDependants: false }, 2026);
    assert.deepEqual([loan[1].status, loan[1].suggested], ['low', 800000]);
  });
  it('orders gaps worst first and spots dependants', () => {
    const rows = coverageRadar(me, [item({ id: 'a', type: 'health_policy', memberId: 'me', amount: 300000 })], { hasDependants: true }, 2026);
    assert.deepEqual(radarGaps(rows).map((r) => r.kind), ['term', 'health']);
    assert.equal(hasDependants([{ relation: 'self' }, { relation: 'father' }]), true);
    assert.equal(hasDependants([{ relation: 'self' }, { relation: 'spouse' }]), false);
  });
});

describe('net worth', () => {
  it('adds assets, subtracts loans, ignores insurance cover', () => {
    const nw = netWorth([
      item({ id: '1', type: 'fixed_deposit', memberId: 'mum', amount: 200000 }),
      item({ id: '2', type: 'mutual_fund', memberId: 'me', amount: 350000 }),
      item({ id: '3', type: 'loan', memberId: 'me', amount: 100000 }),
      item({ id: '4', type: 'health_policy', memberId: 'mum', amount: 500000 }),
      item({ id: '5', type: 'gold', memberId: 'mum', amount: null }),
    ]);
    assert.deepEqual([nw.assets, nw.liabilities, nw.net], [550000, 100000, 450000]);
    assert.deepEqual(nw.byClass.map((l) => l.type), ['mutual_fund', 'fixed_deposit']);
    assert.deepEqual(nw.byMember, [
      { memberId: 'me', assets: 350000, liabilities: 100000, net: 250000 },
      { memberId: 'mum', assets: 200000, liabilities: 0, net: 200000 },
    ]);
  });
});

describe('emergency', () => {
  it('lists health cover first and flags possibly lapsed policies', () => {
    const list = emergencyPolicies(
      [
        item({ id: 'acc', type: 'accident_policy', memberId: 'mum', amount: 1000000 }),
        item({ id: 'h', type: 'health_policy', memberId: 'mum', amount: 500000, dueDate: '2026-09-01' }),
        item({ id: 'fd', type: 'fixed_deposit', memberId: 'mum', amount: 1 }),
      ],
      [{ id: 'mum', name: 'Sunita', relation: 'mother', city: 'Lucknow' }],
      '2026-10-09',
    );
    assert.deepEqual(list.map((x) => [x.item.id, x.mayHaveLapsed]), [['h', true], ['acc', false]]);
    assert.equal(telUrl('1800 425-2255'), 'tel:18004252255');
    assert.equal(cashlessSearchUrl('Star Health', 'Lucknow'), 'https://www.google.com/search?q=Star%20Health%20cashless%20hospital%20list%20Lucknow');
    assert.equal(parseHelpline('Call: 1800-425-2255 (toll free)'), '1800-425-2255');
    assert.equal(parseHelpline('12'), null);
  });
});

describe('invites and ask', () => {
  it('makes readable 8-character codes and expires them after 7 days', () => {
    const code = inviteCodeFrom(new Uint8Array([0, 1, 2, 3, 30, 31, 200, 255]));
    assert.match(code, /^[A-HJKMNP-Z2-9]{8}$/);
    assert.equal(normalizeInviteCode(' ab-cd 23 '), 'ABCD23');
    assert.equal(inviteExpired(0, 7 * 86_400_000), false);
    assert.equal(inviteExpired(0, 7 * 86_400_000 + 1), true);
  });
  it('sends only first names and masked facts, and drops made-up sources', () => {
    const ctx = JSON.parse(buildAskContext(
      [{ id: 'mum', name: 'Sunita Sharma', relation: 'mother' }],
      [{ id: 'i1', memberId: 'mum', type: 'health_policy', numberLast4: '5678', sourceDocId: 'd1' }],
      [{ id: 'd1', memberId: 'mum', docType: 'health_policy', title: 'Star Health' }],
      '2026-10-09',
    ));
    assert.equal(ctx.people[0].name, 'Sunita');
    assert.equal(ctx.items[0].document, 'doc:d1');
    assert.deepEqual(validSources(['item:i1', 'doc:zzz', 'item:i1'], [{ id: 'i1' }], [{ id: 'd1' }]), [{ kind: 'item', id: 'i1' }]);
  });
});

describe('tools', () => {
  const members = [
    { id: 'me', name: 'Priya', relation: 'self' as const, birthYear: 1999 },
    { id: 'bro', name: 'Arjun', relation: 'sibling' as const, birthYear: 2002 },
    { id: 'mum', name: 'Sunita Sharma', relation: 'mother' as const, birthYear: 1964 },
  ];

  it('puts a lapsed health policy first and suggests the check-up and first scan', () => {
    const lapsed = item({ id: 'h', type: 'health_policy', memberId: 'mum', premium: 18400, dueDate: '2026-09-01' });
    const ids = insights({ members, items: [lapsed], documents: [{ ocrStatus: 'extracted' }], radarGapCount: 2, today: '2026-10-09' }).map((c) => c.id);
    assert.deepEqual(ids, ['lapsed', 'confirm', 'nominee', 'gaps', 'tax', 'checkup']);
    assert.deepEqual(insights({ members, items: [], documents: [], radarGapCount: 0, today: '2026-10-09' }).map((c) => c.id), ['checkup', 'first']);
  });

  it('gives parents tax pointers from their own policies and deposits', () => {
    const [mum] = taxTips(members, [
      item({ id: 'h', type: 'health_policy', memberId: 'mum', premium: 18400 }),
      item({ id: 'f', type: 'fixed_deposit', memberId: 'mum', amount: 200000 }),
    ], 2026);
    assert.equal(mum.memberId, 'mum');
    assert.deepEqual(mum.tips.map((t) => t.title), ['Health insurance premium', 'Interest on deposits', 'Stop tax being cut from FD interest', 'File the return anyway']);
    assert.equal(mum.tips[0].amount, 18400);
    assert.match(mum.tips[0].body, /₹50,000/);
    assert.match(mum.tips[2].body, /Form 121/);
  });

  it('finds the real return of a policy and compares it with a deposit', () => {
    const plan = { premium: 10000, payYears: 10, totalYears: 10 };
    const at5 = depositValue(plan, 0.05);
    assert.equal(at5, 132068);
    assert.ok(Math.abs(policyReturn({ ...plan, maturity: at5 })! - 0.05) < 1e-4);
    assert.ok(policyReturn({ premium: 24000, payYears: 15, totalYears: 20, maturity: 600000 })! < 0.05);
    assert.equal(policyReturn({ premium: 0, payYears: 10, totalYears: 10, maturity: 1 }), null);
    assert.equal(policyReturn({ premium: 100, payYears: 10, totalYears: 5, maturity: 1000 }), null);
  });

  it('splits family bills evenly within the Indian financial year', () => {
    assert.equal(financialYear('2026-10-09'), '2026-27');
    assert.equal(financialYear('2027-03-31'), '2026-27');
    assert.equal(financialYear('2027-04-01'), '2027-28');
    const { total, shares } = contributionShares(
      [
        { payerMemberId: 'me', amount: 30000, date: '2026-05-01' },
        { payerMemberId: 'bro', amount: 10000, date: '2026-06-01' },
        { payerMemberId: 'me', amount: 99999, date: '2026-03-31' },
      ],
      members,
      '2026-27',
    );
    assert.equal(total, 40000);
    assert.deepEqual(shares, [
      { memberId: 'me', paid: 30000, balance: 10000 },
      { memberId: 'bro', paid: 10000, balance: -10000 },
    ]);
  });
});
