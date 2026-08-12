import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertRecipientAllowed,
  buildCompletionEmail,
  isCandidateObjectPath,
  processClosureRequest,
  type ClosureRequest,
  validateEmailConfiguration,
} from './core.ts';

const request: ClosureRequest = {
  id: 'request-1',
  candidate_user_id: '11111111-1111-4111-8111-111111111111',
  status: 'pending_deletion',
  requested_at: '2026-08-12T10:00:00Z',
  verified_storage_removed_at: null,
  completion_email_sent_at: null,
  auth_identity_anonymised_at: null,
};

test('accepts only object paths inside the candidate folder', () => {
  assert.equal(isCandidateObjectPath(`${request.candidate_user_id}/cv.pdf`, request.candidate_user_id), true);
  assert.equal(isCandidateObjectPath('another-user/cv.pdf', request.candidate_user_id), false);
  assert.equal(isCandidateObjectPath(`${request.candidate_user_id}/../other/cv.pdf`, request.candidate_user_id), false);
});

test('builds a non-promotional closure confirmation', () => {
  const message = buildCompletionEmail(
    'candidate@example.test',
    'Rolexa <privacy@rolexa.example>',
    'privacy@rolexa.example',
    new Date('2026-08-12T12:00:00Z'),
  );
  assert.match(message.subject, /account has been closed/i);
  assert.match(message.text, /12 August 2026/);
  assert.doesNotMatch(message.text, /job|offer|marketing|newsletter/i);
});

test('allows the Gmail inbox as test recipient but never as the sender', () => {
  const mode = validateEmailConfiguration(
    'test',
    'Rolexa Test <onboarding@resend.dev>',
    'rolexa2026@gmail.com',
  );
  assert.doesNotThrow(() => {
    assertRecipientAllowed(mode, 'rolexa2026@gmail.com', 'rolexa2026@gmail.com');
  });
  assert.throws(() => {
    validateEmailConfiguration('production', 'Rolexa <rolexa2026@gmail.com>', 'rolexa2026@gmail.com');
  }, /PUBLIC_EMAIL_DOMAIN_NOT_ALLOWED_AS_SENDER/);
});

test('test mode refuses every recipient except the configured fictional-test inbox', () => {
  assert.throws(() => {
    assertRecipientAllowed('test', 'another-candidate@example.test', 'rolexa2026@gmail.com');
  }, /TEST_RECIPIENT_NOT_ALLOWED/);
  assert.throws(() => {
    validateEmailConfiguration('production', 'Rolexa <onboarding@resend.dev>', 'rolexa2026@gmail.com');
  }, /RESEND_TEST_SENDER_NOT_ALLOWED_IN_PRODUCTION/);
});

test('removes every CV and photo before email, Auth and database completion', async () => {
  const events: string[] = [];
  const storage = new Map<string, string[]>([
    ['candidate-cvs', [
      `${request.candidate_user_id}/cv-old.pdf`,
      `${request.candidate_user_id}/cv-current.pdf`,
    ]],
    ['candidate-photos', [`${request.candidate_user_id}/profile.jpg`]],
  ]);

  const result = await processClosureRequest(request, {
    listCandidateObjects: async (bucket) => [...(storage.get(bucket) ?? [])],
    removeObjects: async (bucket, paths) => {
      events.push(`remove:${bucket}:${paths.length}`);
      storage.set(bucket, (storage.get(bucket) ?? []).filter((path) => !paths.includes(path)));
    },
    assertStillPending: async () => { events.push('pending'); },
    getCandidateEmail: async () => 'candidate@example.test',
    sendCompletionEmail: async () => { events.push('email'); return 'email-1'; },
    softDeleteAuthIdentity: async () => { events.push('auth'); },
    markStorageRemoved: async () => { events.push('storage-verified'); },
    markEmailSent: async () => { events.push('email-verified'); },
    markAuthAnonymised: async () => { events.push('auth-verified'); },
    completeRequest: async () => { events.push('complete'); return { status: 'completed' }; },
  }, 'Rolexa <privacy@rolexa.example>', 'privacy@rolexa.example');

  assert.equal(result.status, 'completed');
  assert.deepEqual(events, [
    'pending',
    'remove:candidate-cvs:2',
    'remove:candidate-photos:1',
    'storage-verified',
    'pending',
    'email',
    'email-verified',
    'pending',
    'auth',
    'auth-verified',
    'complete',
  ]);
});

test('does not continue when storage verification fails', async () => {
  const events: string[] = [];
  await assert.rejects(() => processClosureRequest(request, {
    listCandidateObjects: async () => [`${request.candidate_user_id}/left-behind.pdf`],
    removeObjects: async () => { events.push('remove'); },
    assertStillPending: async () => undefined,
    getCandidateEmail: async () => 'candidate@example.test',
    sendCompletionEmail: async () => { events.push('email'); return null; },
    softDeleteAuthIdentity: async () => { events.push('auth'); },
    markStorageRemoved: async () => { events.push('storage-verified'); },
    markEmailSent: async () => undefined,
    markAuthAnonymised: async () => undefined,
    completeRequest: async () => ({ status: 'completed' }),
  }, 'Rolexa <privacy@rolexa.example>', 'privacy@rolexa.example'), /STORAGE_REMOVAL_NOT_VERIFIED/);
  assert.deepEqual(events, ['remove']);
});
