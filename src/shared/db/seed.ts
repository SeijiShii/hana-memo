/**
 * Seed script — dev environment 用ダミーデータ投入
 *
 * 利用方法:
 *   1. Neon dev branch を作成: `neonctl branches create --name dev`
 *   2. `.env.local` の DATABASE_URL を dev branch のものに切り替え
 *   3. `npm run db:migrate` (schema 適用)
 *   4. `npm run db:seed` (本スクリプト実行)
 *
 * 関連: docs/_shared/db/002_db_PLAN.md Phase 4
 */
import { db } from './client';
import { users, userSettings, discoveries } from './schema';

async function seed() {
  console.log('[seed] Starting dev seed...');

  // 1. ダミー users (匿名 + OAuth リンク済)
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        clerkUserId: 'user_seed_anonymous_001',
        email: null,
        isAnonymous: true,
        trialUsedCount: 1,
        aiCreditsRemaining: 0,
      },
      {
        clerkUserId: 'user_seed_oauth_001',
        email: 'seed-oauth-001@example.invalid',
        isAnonymous: false,
        linkedAt: new Date(),
        trialUsedCount: 3,
        aiCreditsRemaining: 10,
      },
    ])
    .returning({ id: users.id, clerkUserId: users.clerkUserId });

  console.log(`[seed] Inserted ${insertedUsers.length} users`);

  // 2. user_settings (各 user 1 行、default 値で OK)
  for (const user of insertedUsers) {
    await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
  }
  console.log(`[seed] Inserted user_settings for ${insertedUsers.length} users`);

  // 3. ダミー discoveries (OAuth user に 3 件)
  const oauthUser = insertedUsers.find((u) => u.clerkUserId === 'user_seed_oauth_001');
  if (oauthUser) {
    await db.insert(discoveries).values([
      {
        userId: oauthUser.id,
        capturedAt: new Date('2026-04-15T10:00:00+09:00'),
        commonName: 'タンポポ',
        scientificName: 'Taraxacum officinale',
        family: 'キク科',
        genus: 'Taraxacum',
        confidence: 0.92,
        status: 'identified',
      },
      {
        userId: oauthUser.id,
        capturedAt: new Date('2026-05-01T14:00:00+09:00'),
        commonName: 'シロツメクサ',
        scientificName: 'Trifolium repens',
        family: 'マメ科',
        genus: 'Trifolium',
        confidence: 0.88,
        status: 'identified',
      },
      {
        userId: oauthUser.id,
        capturedAt: new Date('2026-05-20T08:00:00+09:00'),
        commonName: null,
        scientificName: null,
        confidence: null,
        status: 'pending',
      },
    ]);
    console.log('[seed] Inserted 3 discoveries for OAuth user');
  }

  console.log('[seed] Done.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
