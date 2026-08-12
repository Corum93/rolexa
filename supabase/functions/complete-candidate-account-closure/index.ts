import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  assertRecipientAllowed,
  buildCompletionEmail,
  type ClosureEmail,
  type ClosureRequest,
  processClosureRequest,
  validateEmailConfiguration,
} from './core.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`MISSING_ENVIRONMENT:${name}`);
  return value;
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const supabaseUrl = requiredEnvironment('SUPABASE_URL');
    const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = requiredEnvironment('RESEND_API_KEY');
    const emailFrom = requiredEnvironment('ROLEXA_EMAIL_FROM');
    const privacyEmail = requiredEnvironment('ROLEXA_PRIVACY_EMAIL');
    const emailMode = validateEmailConfiguration(
      requiredEnvironment('ROLEXA_EMAIL_MODE'),
      emailFrom,
      privacyEmail,
    );
    const testRecipient = emailMode === 'test'
      ? requiredEnvironment('ROLEXA_TEST_RECIPIENT')
      : null;
    const token = bearerToken(request);
    if (!token) return json(401, { error: 'AUTHENTICATION_REQUIRED' });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const body = await requestBody(request);
    const requestedId = typeof body.request_id === 'string' ? body.request_id : null;
    let isTrustedService = token === serviceRoleKey;
    if (!isTrustedService) {
      const serviceKeyVerifier = createClient(supabaseUrl, token, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: serviceKeyError } = await serviceKeyVerifier.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      isTrustedService = !serviceKeyError;
    }
    let candidateUserId: string | null = null;

    if (!isTrustedService) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return json(401, { error: 'INVALID_USER_TOKEN' });
      candidateUserId = data.user.id;
      if (!requestedId) return json(400, { error: 'REQUEST_ID_REQUIRED' });
    }

    const { data: claimed, error: claimError } = await admin.rpc(
      'claim_candidate_account_closure_completion',
      {
        p_request_id: requestedId,
        p_candidate_user_id: candidateUserId,
        p_batch_size: isTrustedService ? 10 : 1,
      },
    );
    if (claimError) throw claimError;
    const requests = (claimed ?? []) as ClosureRequest[];
    if (!requests.length) return json(202, { processed: 0, status: 'nothing_due' });

    const listCandidateObjects = async (bucket: string, userId: string): Promise<string[]> => {
      const paths: string[] = [];
      const folders = [userId];
      let scannedFolders = 0;
      while (folders.length) {
        const folder = folders.shift()!;
        scannedFolders += 1;
        if (scannedFolders > 100) throw new Error(`STORAGE_FOLDER_LIMIT:${bucket}`);
        for (let offset = 0; ; offset += 100) {
          const { data, error } = await admin.storage.from(bucket).list(folder, {
            limit: 100,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          });
          if (error) throw error;
          const entries = data ?? [];
          for (const entry of entries) {
            const path = `${folder}/${entry.name}`;
            if (entry.id) paths.push(path);
            else folders.push(path);
          }
          if (entries.length < 100) break;
        }
      }
      return paths;
    };

    const results = [];
    for (const closureRequest of requests) {
      try {
        const assertStillPending = async (requestId: string) => {
          const { data, error } = await admin.from('candidate_account_closure_requests')
            .select('id,status')
            .eq('id', requestId)
            .eq('status', 'pending_deletion')
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('ACCOUNT_CLOSURE_NO_LONGER_PENDING');
        };

        const markPendingStep = async (requestId: string, values: Record<string, unknown>) => {
          const { data, error } = await admin.from('candidate_account_closure_requests')
            .update({ ...values, updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('status', 'pending_deletion')
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('ACCOUNT_CLOSURE_NO_LONGER_PENDING');
        };

        const outcome = await processClosureRequest(
          closureRequest,
          {
            listCandidateObjects,
            removeObjects: async (bucket, paths) => {
              if (!paths.length) return;
              const { error } = await admin.storage.from(bucket).remove(paths);
              if (error) throw error;
            },
            assertStillPending,
            getCandidateEmail: async (userId) => {
              const { data, error } = await admin.auth.admin.getUserById(userId);
              const email = data.user?.email?.trim();
              if (error || !email) throw error ?? new Error('CANDIDATE_EMAIL_NOT_AVAILABLE');
              const recipient = emailMode === 'test' ? testRecipient : email;
              if (!recipient) throw new Error('TEST_RECIPIENT_NOT_CONFIGURED');
              assertRecipientAllowed(emailMode, recipient, testRecipient);
              return recipient;
            },
            sendCompletionEmail: async (row, message: ClosureEmail) => {
              const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                  'User-Agent': 'Rolexa-Account-Closure/1.0',
                  'Idempotency-Key': `rolexa-account-closure-${row.id}`,
                },
                body: JSON.stringify(message),
              });
              const responseBody = await response.json().catch(() => ({}));
              if (!response.ok) {
                const providerError = typeof responseBody?.message === 'string'
                  ? responseBody.message.replace(/[^a-zA-Z0-9 ._:@()\/-]/g, '').slice(0, 300)
                  : 'UNKNOWN_PROVIDER_ERROR';
                throw new Error(`COMPLETION_EMAIL_FAILED:${response.status}:${providerError}`);
              }
              return typeof responseBody.id === 'string' ? responseBody.id : null;
            },
            softDeleteAuthIdentity: async (userId) => {
              const { error } = await admin.auth.admin.deleteUser(userId, true);
              if (error) throw error;
            },
            markStorageRemoved: async (requestId) => {
              await markPendingStep(requestId, {
                verified_storage_removed_at: new Date().toISOString(),
              });
            },
            markEmailSent: async (requestId, providerMessageId) => {
              await markPendingStep(requestId, {
                completion_email_sent_at: new Date().toISOString(),
                completion_email_provider_id: providerMessageId,
              });
            },
            markAuthAnonymised: async (requestId) => {
              await markPendingStep(requestId, {
                auth_identity_anonymised_at: new Date().toISOString(),
              });
            },
            completeRequest: async (requestId) => {
              const { data, error } = await admin.rpc('complete_candidate_account_closure', {
                p_request_id: requestId,
                p_storage_objects_verified_removed: true,
                p_completion_email_verified_sent: true,
                p_auth_identity_verified_anonymised: true,
              });
              if (error) throw error;
              return data as { status: string };
            },
          },
          emailFrom,
          privacyEmail,
        );
        results.push(outcome);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'UNKNOWN_COMPLETION_ERROR';
        await admin.from('candidate_account_closure_requests').update({
          completion_processing_started_at: null,
          last_completion_error: message.slice(0, 500),
          last_completion_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', closureRequest.id);
        results.push({ requestId: closureRequest.id, status: 'retry_pending' });
      }
    }

    return json(200, { processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    console.error('[Rolexa] Candidate account closure completion failed', message);
    return json(500, { error: 'ACCOUNT_CLOSURE_COMPLETION_FAILED' });
  }
});

export { buildCompletionEmail };
