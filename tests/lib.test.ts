/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { documentStoragePath, formatBytes, safeFileName, validateUpload } from '../src/lib/files';
import { canAdminister, canEdit, roleOf } from '../src/lib/permissions';
import { formatIndianMobile, maskPhone, normalizeIndianMobile } from '../src/lib/phone';
import { familyReadiness, memberReadiness, nextActions } from '../src/lib/readiness';
import type { DocType, Member, VaultDocument } from '../src/lib/types';

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
