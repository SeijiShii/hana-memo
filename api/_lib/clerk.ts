/**
 * Clerk session 検証ヘルパ (Vercel Function 共通)
 *
 * Authorization: Bearer <Clerk session JWT> を `@clerk/backend` の verifyToken で検証し、
 * subject (Clerk user id) を返す。Neon users.id への解決は呼び出し側 (spam-check 等) が行う。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.3 / §4.1, 002_auth_PLAN.md §1.2
 */
import { verifyToken } from '@clerk/backend';

/** 認証失敗 (401 にマップする)。 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Authorization ヘッダから Bearer トークンを取り出す (純関数)。 */
export function extractBearerToken(authorization: string | null | undefined): string {
  const value = authorization ?? '';
  if (!value.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = value.slice('Bearer '.length).trim();
  if (!token) {
    throw new UnauthorizedError('Empty bearer token');
  }
  return token;
}

export type VerifyTokenFn = (
  token: string,
  options: { secretKey: string },
) => Promise<{ sub: string }>;

/**
 * Clerk session を検証し Clerk user id を返す。
 * @param req Web Fetch Request (Vercel Web handler)
 * @param deps.verify テスト注入用 (既定は @clerk/backend verifyToken)
 */
export async function verifyClerkSession(
  req: Request,
  deps: { verify?: VerifyTokenFn; secretKey?: string } = {},
): Promise<{ clerkUserId: string }> {
  const secretKey = deps.secretKey ?? process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not set');
  }
  const token = extractBearerToken(req.headers.get('authorization'));
  const verify = (deps.verify ?? (verifyToken as unknown as VerifyTokenFn)) satisfies VerifyTokenFn;
  try {
    const payload = await verify(token, { secretKey });
    if (!payload?.sub) {
      throw new UnauthorizedError('Token missing subject');
    }
    return { clerkUserId: payload.sub };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Token verification failed');
  }
}
