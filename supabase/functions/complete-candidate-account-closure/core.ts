export const CANDIDATE_STORAGE_BUCKETS = ['candidate-cvs', 'candidate-photos'] as const;

export type ClosureRequest = {
  id: string;
  candidate_user_id: string;
  status: string;
  requested_at: string;
  verified_storage_removed_at: string | null;
  completion_email_sent_at: string | null;
  auth_identity_anonymised_at: string | null;
};

export type ClosureEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailMode = 'test' | 'production';

const PUBLIC_SENDER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'icloud.com',
  'outlook.com',
  'yahoo.com',
]);

export type ClosureDependencies = {
  listCandidateObjects: (bucket: string, candidateUserId: string) => Promise<string[]>;
  removeObjects: (bucket: string, paths: string[]) => Promise<void>;
  assertStillPending: (requestId: string) => Promise<void>;
  getCandidateEmail: (candidateUserId: string) => Promise<string>;
  sendCompletionEmail: (request: ClosureRequest, message: ClosureEmail) => Promise<string | null>;
  softDeleteAuthIdentity: (candidateUserId: string) => Promise<void>;
  markStorageRemoved: (requestId: string) => Promise<void>;
  markEmailSent: (requestId: string, providerMessageId: string | null) => Promise<void>;
  markAuthAnonymised: (requestId: string) => Promise<void>;
  completeRequest: (requestId: string) => Promise<{ status: string }>;
};

export type ProcessResult = {
  requestId: string;
  status: 'completed' | 'legal_hold' | 'skipped';
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function emailAddress(value: string): string {
  const trimmed = value.trim();
  const bracketed = trimmed.match(/<([^<>\s]+@[^<>\s]+)>$/)?.[1];
  const address = (bracketed ?? trimmed).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    throw new Error('INVALID_EMAIL_CONFIGURATION');
  }
  return address;
}

export function validateEmailConfiguration(
  mode: string,
  emailFrom: string,
  privacyEmail: string,
): EmailMode {
  if (mode !== 'test' && mode !== 'production') {
    throw new Error('INVALID_EMAIL_MODE');
  }

  const sender = emailAddress(emailFrom);
  emailAddress(privacyEmail);
  const senderDomain = sender.split('@')[1];
  if (PUBLIC_SENDER_DOMAINS.has(senderDomain)) {
    throw new Error('PUBLIC_EMAIL_DOMAIN_NOT_ALLOWED_AS_SENDER');
  }
  if (mode === 'test' && senderDomain !== 'resend.dev') {
    throw new Error('TEST_MODE_REQUIRES_RESEND_TEST_SENDER');
  }
  if (mode === 'production' && senderDomain === 'resend.dev') {
    throw new Error('RESEND_TEST_SENDER_NOT_ALLOWED_IN_PRODUCTION');
  }
  return mode;
}

export function assertRecipientAllowed(
  mode: EmailMode,
  recipient: string,
  testRecipient: string | null,
): void {
  const candidate = emailAddress(recipient);
  if (mode !== 'test') return;
  if (!testRecipient || candidate !== emailAddress(testRecipient)) {
    throw new Error('TEST_RECIPIENT_NOT_ALLOWED');
  }
}

export function buildCompletionEmail(
  recipient: string,
  from: string,
  privacyEmail: string,
  completedAt = new Date(),
): ClosureEmail {
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(completedAt);
  const safePrivacyEmail = escapeHtml(privacyEmail);

  return {
    from,
    to: recipient,
    subject: 'Your Rolexa candidate account has been closed',
    text: [
      'Your Rolexa candidate account has been closed.',
      '',
      `Rolexa completed the account-closure process on ${date}.`,
      'Your candidate profile and Rolexa-controlled CV and profile-photo files are no longer available to employers.',
      'Rolexa may retain only limited, access-restricted evidence where this remains necessary for a legal obligation, complaint, dispute or security matter.',
      '',
      `If you did not request this or have a question, contact ${privacyEmail}.`,
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;color:#17213a;line-height:1.6;max-width:620px;margin:0 auto;padding:24px">
        <h1 style="font-size:24px;color:#071025">Your Rolexa candidate account has been closed</h1>
        <p>Rolexa completed the account-closure process on <strong>${escapeHtml(date)}</strong>.</p>
        <p>Your candidate profile and Rolexa-controlled CV and profile-photo files are no longer available to employers.</p>
        <p>Rolexa may retain only limited, access-restricted evidence where this remains necessary for a legal obligation, complaint, dispute or security matter.</p>
        <p>If you did not request this or have a question, contact <a href="mailto:${safePrivacyEmail}">${safePrivacyEmail}</a>.</p>
      </div>
    `.trim(),
  };
}

export function isCandidateObjectPath(path: string, candidateUserId: string): boolean {
  if (!path || path.includes('..') || path.includes('\\')) return false;
  return path.startsWith(`${candidateUserId}/`) && path.length > candidateUserId.length + 1;
}

export async function processClosureRequest(
  request: ClosureRequest,
  dependencies: ClosureDependencies,
  emailFrom: string,
  privacyEmail: string,
): Promise<ProcessResult> {
  if (request.status !== 'pending_deletion') {
    return { requestId: request.id, status: 'skipped' };
  }

  let candidateEmail = '';
  if (!request.completion_email_sent_at) {
    candidateEmail = await dependencies.getCandidateEmail(request.candidate_user_id);
  }

  if (!request.verified_storage_removed_at) {
    await dependencies.assertStillPending(request.id);
    for (const bucket of CANDIDATE_STORAGE_BUCKETS) {
      const paths = await dependencies.listCandidateObjects(bucket, request.candidate_user_id);
      if (paths.some((path) => !isCandidateObjectPath(path, request.candidate_user_id))) {
        throw new Error(`UNSAFE_STORAGE_PATH:${bucket}`);
      }
      for (let offset = 0; offset < paths.length; offset += 100) {
        await dependencies.removeObjects(bucket, paths.slice(offset, offset + 100));
      }
      const remaining = await dependencies.listCandidateObjects(bucket, request.candidate_user_id);
      if (remaining.length > 0) throw new Error(`STORAGE_REMOVAL_NOT_VERIFIED:${bucket}`);
    }
    await dependencies.markStorageRemoved(request.id);
  }

  if (!request.completion_email_sent_at) {
    await dependencies.assertStillPending(request.id);
    const message = buildCompletionEmail(candidateEmail, emailFrom, privacyEmail);
    const providerMessageId = await dependencies.sendCompletionEmail(request, message);
    await dependencies.markEmailSent(request.id, providerMessageId);
  }

  if (!request.auth_identity_anonymised_at) {
    await dependencies.assertStillPending(request.id);
    await dependencies.softDeleteAuthIdentity(request.candidate_user_id);
    await dependencies.markAuthAnonymised(request.id);
  }

  const completion = await dependencies.completeRequest(request.id);
  return {
    requestId: request.id,
    status: completion.status === 'legal_hold' ? 'legal_hold' : 'completed',
  };
}
