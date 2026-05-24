/**
 * R2 GET presigned URL 発行エンドポイント (POST /api/storage/signed-url)
 *
 * single (`{objectKey}`) / batch (`{objectKeys}`) の両対応。Clerk JWT 検証 → Neon users.id 解決 →
 * `createSignedUrl` / `createSignedUrls` (core) で所有確認 (objectKey 先頭 = user_id) + GET presign
 * (60 分 TTL)。batch は失敗 key を除外した subset を返す。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.1/§4.1, 002_storage_PLAN.md Phase 2
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from './_lib/user';
import { createSignedUrl, createSignedUrls } from '../../src/shared/storage/presign';
import { ValidationError } from '../../src/shared/helpers/url';

export type SignedUrlBody =
  | { objectKey: string; expiresIn?: number }
  | { objectKeys: string[] };

/** request body を single / batch に正規化する (純関数)。 */
export function parseSignedUrlBody(raw: unknown): SignedUrlBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (typeof b.objectKey === 'string') {
    return typeof b.expiresIn === 'number'
      ? { objectKey: b.objectKey, expiresIn: b.expiresIn }
      : { objectKey: b.objectKey };
  }
  if (Array.isArray(b.objectKeys) && b.objectKeys.every((k) => typeof k === 'string')) {
    return { objectKeys: b.objectKeys as string[] };
  }
  throw new ValidationError('objectKey or objectKeys required');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }

  let body: SignedUrlBody;
  try {
    body = parseSignedUrlBody(await req.json().catch(() => ({})));
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  try {
    const userId = await resolveUserId(clerkUserId);
    const { createR2PresignClient } = await import('./_lib/r2');
    const client = createR2PresignClient();
    if ('objectKey' in body) {
      const url = await createSignedUrl(client, {
        objectKey: body.objectKey,
        userId,
        expiresIn: body.expiresIn,
      });
      return jsonResponse({ url }, 200);
    }
    const urls = await createSignedUrls(client, { objectKeys: body.objectKeys, userId });
    return jsonResponse({ urls }, 200);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse({ error: 'forbidden' }, 403); // 所有者違反 / objectKey 形式不正
    }
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}
