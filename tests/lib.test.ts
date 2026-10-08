/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { last4, normalizeExtraction, parseDate, parseRupees } from '../functions/src/extraction';
import { documentStoragePath, formatBytes, safeFileName, validateUpload } from '../src/lib/files';
import { checkTargets, completeCheck, familyCoverageScore, memberCoverageScore, questionsFor } from '../src/lib/health-check';
import { buildItem, draftFromDocument, formatCompactRupees, lowConfidenceFields, type ItemDraft } from '../src/lib/items';
import { canAdminister, canEdit, roleOf } from '../src/lib/permissions';
import { formatIndianMobile, maskPhone, normalizeIndianMobile } from '../src/lib/phone';
import { familyReadiness, memberReadiness, nextActions } from '../src/lib/readiness';
import type { DocType, HealthCheck, Member, VaultDocument } from '../src/lib/types';

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
    assert.equal(normalizeExtraction({ ...emptyRaw, itemType: 'savings_account' }).itemType, null);
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
      premium: '', dueDate: '15/08/2026', maturityDate: '', nominee: '',
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
      premium: null, dueDate: '2026-08-15', maturityDate: null, nominee: null, sourceDocId: 'd1', confirmedBy: 'u1',
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
